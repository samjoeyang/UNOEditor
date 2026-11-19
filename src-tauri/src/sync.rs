//! UNOEditor workspace persistence and optional cloud sync.
//! Local directory is always the first-class copy; WebDAV / Nextcloud / S3 are
//! transport targets for the same file layout. No account, no server-side logic.

use hmac::{Hmac, Mac};
use reqwest::{header, Client, Method, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

type HmacSha256 = Hmac<Sha256>;

const INDEX_FILE: &str = "unoeditor.json";
const DOCS_DIR: &str = "documents";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConfig {
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub local_dir: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub password: String,
    #[serde(default)]
    pub endpoint: String,
    #[serde(default)]
    pub region: String,
    #[serde(default)]
    pub bucket: String,
    #[serde(default)]
    pub prefix: String,
    #[serde(default)]
    pub access_key: String,
    #[serde(default)]
    pub secret_key: String,
    #[serde(default)]
    pub session_token: String,
    #[serde(default)]
    pub path_style: bool,
    #[serde(default)]
    pub auto_sync: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocMeta {
    pub id: String,
    pub title: String,
    pub file: String,
    pub updated: u64,
    pub rev: String,
    #[serde(default)]
    pub base: String,
    #[serde(default)]
    pub deleted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub updated: u64,
    #[serde(default)]
    pub active_id: String,
    #[serde(default = "default_lang")]
    pub lang: String,
    #[serde(default = "default_theme")]
    pub theme_id: String,
    #[serde(default = "default_view")]
    pub view: String,
    #[serde(default = "default_true")]
    pub sidebar: bool,
    #[serde(default = "default_true")]
    pub preview: bool,
    #[serde(default)]
    pub tweak: Value,
    #[serde(default)]
    pub imported: Vec<Value>,
    #[serde(default)]
    pub docs: Vec<DocMeta>,
}

fn default_version() -> u32 { 1 }
fn default_lang() -> String { "zh".into() }
fn default_theme() -> String { "wechat".into() }
fn default_view() -> String { "mobile".into() }
fn default_true() -> bool { true }

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64
}

fn new_rev() -> String {
    let d = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    format!("{:x}-{:x}", d.as_millis(), d.subsec_nanos() & 0xffff)
}

fn uid() -> String {
    let d = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    format!("d{:x}{:x}", d.as_millis(), d.subsec_nanos() & 0xfffff)
}

fn slug(title: &str) -> String {
    let s: String = title.chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();
    let s = s.trim_matches('-').to_string();
    let s: String = s.chars().take(36).collect();
    if s.is_empty() { "untitled".into() } else { s }
}

/* ---------------- front matter: human-readable Markdown, metadata survives ---------------- */

fn encode_meta(s: &str) -> String {
    s.replace('\\', "\\\\").replace('\n', "\\n").replace('\r', "")
}

fn serialize_doc(meta: &DocMeta, content: &str) -> Vec<u8> {
    format!(
        "---\nuno-id: {}\nuno-title: {}\nuno-rev: {}\nuno-updated: {}\n---\n{}",
        meta.id, encode_meta(&meta.title), meta.rev, meta.updated, content
    ).into_bytes()
}

fn parse_doc(raw: &[u8], fallback: &DocMeta) -> String {
    let text = String::from_utf8_lossy(raw);
    if !text.starts_with("---\n") { return text.into_owned(); }
    if let Some(end) = text[4..].find("\n---\n") {
        let body_start = 4 + end + 5;
        return text[body_start..].to_string();
    }
    let _ = fallback;
    text.into_owned()
}


/* ---------------- transport ---------------- */

fn encode_path(s: &str) -> String {
    let mut out = String::new();
    for b in s.as_bytes() {
        match *b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(*b as char),
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

fn join_prefix(prefix: &str) -> String {
    let p = prefix.trim_matches('/');
    if p.is_empty() { String::new() } else { format!("{}/", p) }
}

fn object_key(cfg: &SyncConfig, path: &str) -> String {
    format!("{}{}", join_prefix(&cfg.prefix), path)
}

enum Target {
    Local(PathBuf),
    Dav { base: String, user: String, pass: String, client: Client },
    S3 { cfg: SyncConfig, client: Client },
}

impl Target {
    fn from_config(cfg: &SyncConfig) -> Result<Self, String> {
        match cfg.kind.as_str() {
            "local" => {
                if cfg.local_dir.trim().is_empty() { return Err("未选择本地目录".into()); }
                Ok(Target::Local(PathBuf::from(&cfg.local_dir)))
            }
            "webdav" | "nextcloud" => {
                if cfg.url.trim().is_empty() { return Err("未填写 WebDAV 地址".into()); }
                Ok(Target::Dav {
                    base: cfg.url.trim_end_matches('/').to_string(),
                    user: cfg.username.clone(),
                    pass: cfg.password.clone(),
                    client: Client::builder().timeout(Duration::from_secs(30)).build().map_err(e)?,
                })
            }
            "s3" => {
                if cfg.endpoint.trim().is_empty() || cfg.bucket.trim().is_empty() {
                    return Err("未填写 S3 Endpoint 或 Bucket".into());
                }
                if cfg.access_key.trim().is_empty() || cfg.secret_key.trim().is_empty() {
                    return Err("未填写 S3 Access Key / Secret Key".into());
                }
                Ok(Target::S3 { cfg: cfg.clone(), client: Client::builder().timeout(Duration::from_secs(30)).build().map_err(e)? })
            }
            other => Err(format!("未知同步类型: {}", other)),
        }
    }

    fn local_path(root: &Path, path: &str) -> PathBuf { root.join(path) }

    async fn get(&self, path: &str) -> Result<Option<Vec<u8>>, String> {
        match self {
            Target::Local(root) => {
                let p = Self::local_path(root, path);
                if !p.exists() { return Ok(None); }
                fs::read(&p).map(Some).map_err(e)
            }
            Target::Dav { base, user, pass, client } => {
                let url = format!("{}/{}", base, encode_path(path));
                let res = client.get(&url).basic_auth(user, Some(pass)).send().await.map_err(e)?;
                let st = res.status();
                if st == StatusCode::NOT_FOUND { return Ok(None); }
                if !st.is_success() { return Err(format!("WebDAV 读取失败 ({}): {}", st, path)); }
                Ok(Some(res.bytes().await.map_err(e)?.to_vec()))
            }
            Target::S3 { cfg, client } => {
                let (status, body) = s3_request(client, cfg, Method::GET, path, "", &[]).await?;
                if status == StatusCode::NOT_FOUND { return Ok(None); }
                if !status.is_success() { return Err(format!("S3 读取失败 ({}): {}", status, path)); }
                Ok(Some(body))
            }
        }
    }

    async fn put(&self, path: &str, body: &[u8]) -> Result<(), String> {
        match self {
            Target::Local(root) => {
                let p = Self::local_path(root, path);
                if let Some(dir) = p.parent() { fs::create_dir_all(dir).map_err(e)?; }
                // atomic-ish: write temp then rename, so an interrupted save never truncates a doc
                let tmp = p.with_extension(format!("{}.tmp", now_ms()));
                fs::write(&tmp, body).map_err(e)?;
                fs::rename(&tmp, &p).map_err(e)?;
                Ok(())
            }
            Target::Dav { base, user, pass, client } => {
                let url = format!("{}/{}", base, encode_path(path));
                if let Some(pos) = path.rfind('/') {
                    let dir_url = format!("{}/{}", base, encode_path(&path[..pos]));
                    let _ = client.request(Method::from_bytes(b"MKCOL").unwrap(), &dir_url)
                        .basic_auth(user, Some(pass)).send().await;
                }
                let res = client.put(&url)
                    .basic_auth(user, Some(pass))
                    .header(header::CONTENT_TYPE, "application/octet-stream")
                    .body(body.to_vec()).send().await.map_err(e)?;
                if !res.status().is_success() {
                    return Err(format!("WebDAV 写入失败 ({}): {}", res.status(), path));
                }
                Ok(())
            }
            Target::S3 { cfg, client } => {
                let (status, _) = s3_request(client, cfg, Method::PUT, path, "", body).await?;
                if !status.is_success() { return Err(format!("S3 写入失败 ({}): {}", status, path)); }
                Ok(())
            }
        }
    }

    async fn delete(&self, path: &str) -> Result<(), String> {
        match self {
            Target::Local(root) => {
                let p = Self::local_path(root, path);
                if p.exists() { fs::remove_file(&p).map_err(e)?; }
                Ok(())
            }
            Target::Dav { base, user, pass, client } => {
                let url = format!("{}/{}", base, encode_path(path));
                let res = client.delete(&url).basic_auth(user, Some(pass)).send().await.map_err(e)?;
                if res.status() != StatusCode::NOT_FOUND && !res.status().is_success() {
                    return Err(format!("WebDAV 删除失败 ({}): {}", res.status(), path));
                }
                Ok(())
            }
            Target::S3 { cfg, client } => {
                let (status, _) = s3_request(client, cfg, Method::DELETE, path, "", &[]).await?;
                if status != StatusCode::NOT_FOUND && !status.is_success() {
                    return Err(format!("S3 删除失败 ({}): {}", status, path));
                }
                Ok(())
            }
        }
    }
}

fn e<E: std::fmt::Display>(err: E) -> String { err.to_string() }

/* ---------------- AWS Signature V4 (no AWS SDK: keeps the binary small) ---------------- */

fn amz_date() -> (String, String) {
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64;
    let days = secs.div_euclid(86400);
    let rem = secs.rem_euclid(86400);
    // days since 1970-01-01 -> civil date (Hinnant's algorithm)
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + if mp < 10 { 3 } else { -9 };
    let year = if m <= 2 { y + 1 } else { y };
    let hh = rem / 3600;
    let mm = (rem % 3600) / 60;
    let ss = rem % 60;
    (format!("{:04}{:02}{:02}T{:02}{:02}{:02}Z", year, m, d, hh, mm, ss),
     format!("{:04}{:02}{:02}", year, m, d))
}

fn hmac(key: &[u8], data: &str) -> Vec<u8> {
    let mut m = HmacSha256::new_from_slice(key).expect("hmac key");
    m.update(data.as_bytes());
    m.finalize().into_bytes().to_vec()
}

fn sha256_hex(data: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(data);
    hex::encode(h.finalize())
}

async fn s3_request(client: &Client, cfg: &SyncConfig, method: Method, path: &str,
                    query: &str, body: &[u8]) -> Result<(StatusCode, Vec<u8>), String> {
    let (amz, date) = amz_date();
    let region = if cfg.region.trim().is_empty() { "us-east-1" } else { &cfg.region };
    let endpoint = cfg.endpoint.trim_end_matches('/');
    let ep = reqwest::Url::parse(endpoint).map_err(e)?;
    let scheme = ep.scheme();
    let host_base = ep.host_str().ok_or_else(|| "S3 Endpoint 缺少主机名".to_string())?;
    let port = ep.port().map(|p| format!(":{}", p)).unwrap_or_default();
    let (host, base_path) = if cfg.path_style {
        (format!("{}{}", host_base, port), format!("/{}", cfg.bucket.trim_matches('/')))
    } else {
        (format!("{}.{}{}", cfg.bucket.trim_matches('/'), host_base, port), String::new())
    };
    let key = object_key(cfg, path);
    let canonical_uri = format!("{}/{}", base_path, encode_path(&key));
    let url = format!("{}://{}{}{}{}", scheme, host, canonical_uri,
        if query.is_empty() { "" } else { "?" }, query);
    let payload_hash = sha256_hex(body);
    let method_s = method.as_str();
    let canonical = format!("{}\n{}\n{}\nhost:{}\nx-amz-content-sha256:{}\nx-amz-date:{}\n\nhost;x-amz-content-sha256;x-amz-date\n{}",
        method_s, canonical_uri, query, host, payload_hash, amz, payload_hash);
    let scope = format!("{}/{}/s3/aws4_request", date, region);
    let sts = format!("AWS4-HMAC-SHA256\n{}\n{}\n{}", amz, scope, sha256_hex(canonical.as_bytes()));
    let k_date = hmac(format!("AWS4{}", cfg.secret_key).as_bytes(), &date);
    let k_region = hmac(&k_date, region);
    let k_service = hmac(&k_region, "s3");
    let signing = hmac(&k_service, "aws4_request");
    let signature = hex::encode(hmac(&signing, &sts));
    let auth = format!("AWS4-HMAC-SHA256 Credential={}/{}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature={}",
        cfg.access_key, scope, signature);
    let res = client.request(method, &url)
        .header(header::HOST, &host)
        .header("x-amz-content-sha256", &payload_hash)
        .header("x-amz-date", &amz)
        .header(header::AUTHORIZATION, auth)
        .body(body.to_vec()).send().await.map_err(e)?;
    let status = res.status();
    let bytes = res.bytes().await.map_err(e)?.to_vec();
    Ok((status, bytes))
}

/* ---------------- config ---------------- */

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(e)?;
    fs::create_dir_all(&dir).map_err(e)?;
    Ok(dir.join("sync-config.json"))
}

#[tauri::command]
pub fn uno_config_get(app: tauri::AppHandle) -> Result<SyncConfig, String> {
    let p = config_path(&app)?;
    if !p.exists() { return Ok(SyncConfig::default()); }
    let raw = fs::read_to_string(p).map_err(e)?;
    serde_json::from_str(&raw).map_err(e)
}

#[tauri::command]
pub fn uno_config_set(app: tauri::AppHandle, cfg: SyncConfig) -> Result<(), String> {
    let p = config_path(&app)?;
    fs::write(p, serde_json::to_string_pretty(&cfg).map_err(e)?).map_err(e)
}

#[tauri::command]
pub fn uno_pick_dir(app: tauri::AppHandle) -> Option<String> {
    app.dialog().file().blocking_pick_folder().map(|p| p.to_string())
}

/* ---------------- workspace I/O ---------------- */

fn valid_dir(cfg: &SyncConfig) -> Result<PathBuf, String> {
    if cfg.local_dir.trim().is_empty() { return Err("未选择本地目录".into()); }
    let p = PathBuf::from(&cfg.local_dir);
    fs::create_dir_all(p.join(DOCS_DIR)).map_err(e)?;
    Ok(p)
}

#[tauri::command]
pub fn uno_workspace_read(app: tauri::AppHandle) -> Result<Option<Value>, String> {
    let cfg = uno_config_get(app)?;
    let root = match valid_dir(&cfg) { Ok(p) => p, Err(_) => return Ok(None) };
    let ip = root.join(INDEX_FILE);
    if !ip.exists() { return Ok(None); }
    let ws: Workspace = serde_json::from_slice(&fs::read(&ip).map_err(e)?).map_err(e)?;
    let mut docs = serde_json::Map::new();
    for m in &ws.docs {
        if m.deleted { continue; }
        let p = root.join(DOCS_DIR).join(&m.file);
        if let Ok(raw) = fs::read(&p) {
            docs.insert(m.id.clone(), json!(parse_doc(&raw, m)));
        }
    }
    Ok(Some(json!({ "workspace": ws, "documents": docs })))
}

#[tauri::command]
pub fn uno_workspace_write(app: tauri::AppHandle, payload: Value) -> Result<(), String> {
    let cfg = uno_config_get(app)?;
    let root = valid_dir(&cfg)?;
    let ws: Workspace = serde_json::from_value(payload.get("workspace").cloned().unwrap_or(Value::Null)).map_err(e)?;
    let documents = payload.get("documents").cloned().unwrap_or(json!({}));
    let remove = payload.get("remove").cloned().unwrap_or(json!([]));
    fs::write(root.join(INDEX_FILE), serde_json::to_string_pretty(&ws).map_err(e)?).map_err(e)?;
    for (id, content) in documents.as_object().unwrap_or(&serde_json::Map::new()) {
        if let Some(m) = ws.docs.iter().find(|x| &x.id == id) {
            let text = content.as_str().unwrap_or("");
            fs::write(root.join(DOCS_DIR).join(&m.file), serialize_doc(m, text)).map_err(e)?;
        }
    }
    if let Some(list) = remove.as_array() {
        for name in list.iter().filter_map(|x| x.as_str()) {
            let p = root.join(DOCS_DIR).join(name);
            if p.exists() { let _ = fs::remove_file(p); }
        }
    }
    Ok(())
}

/* ---------------- sync ---------------- */

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncReport {
    pub ok: bool,
    pub at: u64,
    pub uploaded: usize,
    pub downloaded: usize,
    pub conflicts: Vec<String>,
    pub errors: Vec<String>,
    pub workspace: Option<Workspace>,
    pub documents: BTreeMap<String, String>,
}

fn merge_prefs(local: &Workspace, remote: &Workspace) -> Workspace {
    let winner = if remote.updated > local.updated { remote } else { local };
    let mut ws = winner.clone();
    ws.version = 1;
    ws.updated = now_ms();
    ws.docs = local.docs.clone();
    ws
}

#[tauri::command]
pub async fn run_sync(payload: Value) -> Result<SyncReport, String> {
    let cfg: SyncConfig = serde_json::from_value(payload.get("config").cloned().unwrap_or(Value::Null))
        .map_err(|_| "同步配置无效".to_string())?;
    let mut local: Workspace = serde_json::from_value(payload.get("workspace").cloned().unwrap_or(Value::Null))
        .map_err(|_| "工作区数据无效".to_string())?;
    let documents: HashMap<String, String> = serde_json::from_value(
        payload.get("documents").cloned().unwrap_or(json!({}))).map_err(e)?;
    let target = Target::from_config(&cfg)?;
    let mut report = SyncReport {
        ok: true, at: now_ms(), uploaded: 0, downloaded: 0,
        conflicts: Vec::new(), errors: Vec::new(), workspace: None, documents: BTreeMap::new(),
    };

    let remote_raw = target.get(INDEX_FILE).await?;
    let remote: Option<Workspace> = match remote_raw {
        Some(raw) => match serde_json::from_slice::<Workspace>(&raw) {
            Ok(w) => Some(w),
            Err(err) => return Err(format!("远端索引无法解析: {}", err)),
        },
        None => None,
    };
    let mut merged = match &remote {
        Some(r) => merge_prefs(&local, r),
        None => { local.updated = now_ms(); local.clone() }
    };
    let remote_docs: HashMap<String, DocMeta> = remote.as_ref()
        .map(|w| w.docs.iter().map(|d| (d.id.clone(), d.clone())).collect()).unwrap_or_default();
    let local_docs: HashMap<String, DocMeta> = local.docs.iter().map(|d| (d.id.clone(), d.clone())).collect();
    let mut ids: Vec<String> = local_docs.keys().chain(remote_docs.keys()).cloned().collect::<Vec<_>>();
    ids.sort(); ids.dedup();

    for id in ids {
        let l = local_docs.get(&id);
        let r = remote_docs.get(&id);
        match (l, r) {
            (None, Some(rd)) => {
                if rd.deleted { continue; }
                match target.get(&format!("{}/{}", DOCS_DIR, rd.file)).await? {
                    Some(raw) => {
                        let mut meta = rd.clone(); meta.base = meta.rev.clone();
                        report.documents.insert(id.clone(), parse_doc(&raw, &meta));
                        merged.docs.push(meta); report.downloaded += 1;
                    }
                    None => report.errors.push(format!("远端文档缺失: {}", rd.file)),
                }
            }
            (Some(ld), None) => {
                if ld.deleted { continue; }
                let text = documents.get(&id).cloned().unwrap_or_default();
                target.put(&format!("{}/{}", DOCS_DIR, ld.file), &serialize_doc(ld, &text)).await?;
                report.uploaded += 1;
            }
            (Some(ld), Some(rd)) => {
                let lrev = &ld.rev; let rrev = &rd.rev; let base = &ld.base;
                if lrev == rrev {
                    if let Some(x) = merged.docs.iter_mut().find(|x| x.id == id) { x.base = rrev.clone(); }
                    continue;
                }
                if ld.deleted {
                    if rrev == base || rd.deleted {
                        target.delete(&format!("{}/{}", DOCS_DIR, rd.file)).await?;
                        merged.docs.retain(|x| x.id != id);
                        continue;
                    }
                    // remote edited after our deletion -> keep the remote copy
                    if let Some(raw) = target.get(&format!("{}/{}", DOCS_DIR, rd.file)).await? {
                        let mut meta = rd.clone(); meta.base = meta.rev.clone(); meta.deleted = false;
                        report.documents.insert(id.clone(), parse_doc(&raw, &meta));
                        if let Some(x) = merged.docs.iter_mut().find(|x| x.id == id) { *x = meta; }
                        report.conflicts.push(format!("本地删除与远端修改冲突，已保留远端: {}", rd.title));
                        report.downloaded += 1;
                    }
                    continue;
                }
                if rd.deleted {
                    if lrev == base {
                        let _ = fs::remove_file(PathBuf::from(&cfg.local_dir).join(DOCS_DIR).join(&ld.file));
                        merged.docs.retain(|x| x.id != id);
                        continue;
                    }
                    // local edited after remote deletion -> resurrect
                    let text = documents.get(&id).cloned().unwrap_or_default();
                    let mut meta = ld.clone(); meta.base = meta.rev.clone();
                    target.put(&format!("{}/{}", DOCS_DIR, meta.file), &serialize_doc(&meta, &text)).await?;
                    if let Some(x) = merged.docs.iter_mut().find(|x| x.id == id) { *x = meta; }
                    report.conflicts.push(format!("远端删除与本地修改冲突，已恢复: {}", ld.title));
                    report.uploaded += 1;
                    continue;
                }
                let local_changed = lrev != base;
                let remote_changed = rrev != base;
                if local_changed && remote_changed {
                    let raw = target.get(&format!("{}/{}", DOCS_DIR, rd.file)).await?;
                    let stem = rd.file.trim_end_matches(".md");
                    let cf = format!("{}.conflict-{}.md", stem, uid());
                    if let Some(raw) = raw {
                        let cid = uid();
                        let mut cm = DocMeta {
                            id: cid.clone(), title: format!("{} (conflict)", rd.title),
                            file: cf.clone(), updated: now_ms(), rev: new_rev(),
                            base: String::new(), deleted: false,
                        };
                        report.documents.insert(cid.clone(), parse_doc(&raw, &cm));
                        cm.base = cm.rev.clone();
                        merged.docs.push(cm);
                        report.conflicts.push(format!("{}: 已保留本地版本，远端另存为 {}", ld.title, cf));
                        report.downloaded += 1;
                    }
                    if let Some(x) = merged.docs.iter_mut().find(|x| x.id == id) { x.base = lrev.clone(); }
                } else if local_changed {
                    let text = documents.get(&id).cloned().unwrap_or_default();
                    let mut meta = ld.clone(); meta.base = lrev.clone();
                    target.put(&format!("{}/{}", DOCS_DIR, meta.file), &serialize_doc(&meta, &text)).await?;
                    if let Some(x) = merged.docs.iter_mut().find(|x| x.id == id) { *x = meta; }
                    report.uploaded += 1;
                } else if remote_changed {
                    if let Some(raw) = target.get(&format!("{}/{}", DOCS_DIR, rd.file)).await? {
                        let mut meta = rd.clone(); meta.base = rrev.clone();
                        report.documents.insert(id.clone(), parse_doc(&raw, &meta));
                        if let Some(x) = merged.docs.iter_mut().find(|x| x.id == id) { *x = meta; }
                        report.downloaded += 1;
                    }
                } else {
                    if let Some(x) = merged.docs.iter_mut().find(|x| x.id == id) { x.base = rrev.clone(); }
                }
            }
            (None, None) => {}
        }
    }

    if !report.errors.is_empty() {
        report.ok = false;
        return Ok(report);
    }
    let payload_bytes = serde_json::to_vec_pretty(&merged).map_err(e)?;
    target.put(INDEX_FILE, &payload_bytes).await?;
    merged.docs.retain(|d| !d.deleted);
    // Persist the merged snapshot to the local directory as well.
    let root = valid_dir(&cfg)?;
    fs::write(root.join(INDEX_FILE), serde_json::to_vec_pretty(&merged).map_err(e)?).map_err(e)?;
    for (id, text) in &report.documents {
        let m = merged.docs.iter().find(|d| &d.id == id).ok_or_else(|| "文档索引不一致".to_string())?;
        fs::write(root.join(DOCS_DIR).join(&m.file), serialize_doc(m, text)).map_err(e)?;
    }
    local = merged.clone();
    let _ = &local;
    report.workspace = Some(merged);
    Ok(report)
}

/* ---------------- connection test ---------------- */

#[tauri::command]
pub async fn uno_test_connection(cfg: SyncConfig) -> Result<String, String> {
    let target = Target::from_config(&cfg)?;
    match target {
        Target::Local(root) => {
            fs::create_dir_all(root.join(DOCS_DIR)).map_err(e)?;
            let probe = root.join(".uno-write-test");
            fs::write(&probe, b"ok").map_err(e)?;
            fs::remove_file(&probe).map_err(e)?;
            Ok(root.to_string_lossy().into_owned())
        }
        Target::Dav { base, user, pass, client } => {
            let res = client.request(Method::from_bytes(b"PROPFIND").unwrap(), &base)
                .basic_auth(&user, Some(&pass))
                .header("Depth", "0")
                .header(header::CONTENT_TYPE, "application/xml; charset=utf-8")
                .body("<?xml version=\"1.0\"?><propfind xmlns=\"DAV:\"><prop><resourcetype/></prop></propfind>")
                .send().await.map_err(e)?;
            let st = res.status();
            if st == StatusCode::UNAUTHORIZED { return Err("用户名或密码错误 (401)".into()); }
            if st == StatusCode::NOT_FOUND { return Err("WebDAV 地址不存在 (404)".into()); }
            if !st.is_success() && st != StatusCode::from_u16(207).unwrap() {
                return Err(format!("连接失败 ({})", st));
            }
            Ok(base)
        }
        Target::S3 { cfg, client } => {
            let (status, _) = s3_request(&client, &cfg, Method::GET, "", "list-type=2&max-keys=1", &[]).await?;
            if status == StatusCode::FORBIDDEN || status == StatusCode::UNAUTHORIZED {
                return Err("S3 凭证无权访问该 Bucket (403)".into());
            }
            if status == StatusCode::NOT_FOUND { return Err("Bucket 不存在 (404)".into()); }
            if !status.is_success() { return Err(format!("S3 连接失败 ({})", status)); }
            Ok(format!("{}/{}", cfg.endpoint, cfg.bucket))
        }
    }
}

#[tauri::command]
pub async fn uno_sync(_app: tauri::AppHandle, payload: Value) -> Result<SyncReport, String> {
    run_sync(payload).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(tag: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("uno-sync-test-{}-{}", tag, now_ms()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    fn local_cfg(dir: &Path) -> SyncConfig {
        SyncConfig {
            kind: "local".into(),
            local_dir: dir.to_string_lossy().into_owned(),
            ..Default::default()
        }
    }

    fn doc(id: &str, title: &str, rev: &str, base: &str) -> DocMeta {
        DocMeta {
            id: id.into(), title: title.into(),
            file: format!("{}-{}.md", slug(title), &id[id.len().saturating_sub(8)..]),
            updated: now_ms(), rev: rev.into(), base: base.into(), deleted: false,
        }
    }

    fn ws(docs: Vec<DocMeta>) -> Workspace {
        Workspace {
            version: 1, updated: now_ms(), active_id: docs.first().map(|d| d.id.clone()).unwrap_or_default(),
            lang: "zh".into(), theme_id: "wechat".into(), view: "mobile".into(),
            sidebar: true, preview: true, tweak: json!({}), imported: vec![], docs,
        }
    }

    #[test]
    fn front_matter_roundtrip() {
        let m = doc("d12345678", "标题: with colon\n", "r1", "");
        let raw = serialize_doc(&m, "# Hello\n\nbody");
        let text = String::from_utf8(raw).unwrap();
        assert!(text.starts_with("---\nuno-id: d12345678\n"));
        assert_eq!(parse_doc(text.as_bytes(), &m), "# Hello\n\nbody");
    }

    #[tokio::test]
    async fn local_target_roundtrip() {
        let dir = temp_dir("local");
        let t = Target::from_config(&local_cfg(&dir)).unwrap();
        t.put(INDEX_FILE, b"{\"version\":1}").await.unwrap();
        t.put(&format!("{}/a.md", DOCS_DIR), b"# A").await.unwrap();
        assert_eq!(t.get(INDEX_FILE).await.unwrap().unwrap(), b"{\"version\":1}");
        assert_eq!(t.get(&format!("{}/a.md", DOCS_DIR)).await.unwrap().unwrap(), b"# A");
        t.delete(&format!("{}/a.md", DOCS_DIR)).await.unwrap();
        assert!(t.get(&format!("{}/a.md", DOCS_DIR)).await.unwrap().is_none());
    }

    fn dav_cfg() -> Option<SyncConfig> {
        let url = std::env::var("UNO_TEST_DAV_URL").ok()?;
        Some(SyncConfig {
            kind: "webdav".into(), url, ..Default::default()
        })
    }

    #[tokio::test]
    async fn webdav_sync_roundtrip() {
        let cfg = match dav_cfg() { Some(c) => c, None => return };
        let local_dir = temp_dir("dav-local");
        let draft = doc("d11111111", "First", "r-local-1", "");
        let mut workspace = ws(vec![draft.clone()]);
        let content = "# First\n\nhello";
        let payload = json!({
            "config": cfg, "workspace": workspace,
            "documents": { &draft.id: content }
        });
        let first = run_sync(payload).await.unwrap();
        assert!(first.ok, "first sync failed: {:?}", first.errors);
        assert_eq!(first.uploaded, 1);
        assert!(local_dir.join(INDEX_FILE).exists() || cfg.local_dir.is_empty());

        // second device: empty local copy pulls the remote document down
        let fresh = ws(vec![]);
        let pull = run_sync(json!({
            "config": cfg, "workspace": fresh, "documents": {}
        })).await.unwrap();
        assert!(pull.ok, "pull failed: {:?}", pull.errors);
        assert_eq!(pull.downloaded, 1);
        assert_eq!(pull.documents.get("d11111111").unwrap(), content);

        // edit on both sides without a common base -> conflict copy
        let mut remote_ws: Workspace = serde_json::from_slice(
            &Target::from_config(&cfg).unwrap().get(INDEX_FILE).await.unwrap().unwrap()).unwrap();
        for d in remote_ws.docs.iter_mut() { d.rev = "r-remote-2".into(); d.base = "r-local-1".into(); }
        Target::from_config(&cfg).unwrap().put(INDEX_FILE, &serde_json::to_vec(&remote_ws).unwrap()).await.unwrap();
        Target::from_config(&cfg).unwrap().put(
            &format!("{}/{}", DOCS_DIR, draft.file), b"# First\n\nremote edit").await.unwrap();
        let mut local_ws = ws(vec![DocMeta { rev: "r-local-2".into(), base: "r-local-1".into(), ..draft.clone() }]);
        local_ws.updated = remote_ws.updated + 1000;
        let conflict = run_sync(json!({
            "config": cfg, "workspace": local_ws,
            "documents": { &draft.id: "# First\n\nlocal edit" }
        })).await.unwrap();
        assert!(conflict.ok, "conflict sync failed: {:?}", conflict.errors);
        assert_eq!(conflict.conflicts.len(), 1);
        assert_eq!(conflict.downloaded, 1);
        workspace.docs.clear();
    }

    fn s3_cfg() -> Option<SyncConfig> {
        let endpoint = std::env::var("UNO_TEST_S3_ENDPOINT").ok()?;
        let bucket = std::env::var("UNO_TEST_S3_BUCKET").ok()?;
        Some(SyncConfig {
            kind: "s3".into(), endpoint, bucket,
            region: std::env::var("UNO_TEST_S3_REGION").unwrap_or_else(|_| "us-east-1".into()),
            access_key: std::env::var("UNO_TEST_S3_AK").unwrap_or_default(),
            secret_key: std::env::var("UNO_TEST_S3_SK").unwrap_or_default(),
            path_style: true,
            prefix: format!("uno-test-{}", now_ms()),
            ..Default::default()
        })
    }

    #[tokio::test]
    async fn s3_sync_roundtrip() {
        let cfg = match s3_cfg() { Some(c) => c, None => return };
        let d = doc("d22222222", "S3 note", "r1", "");
        let w = ws(vec![d.clone()]);
        let up = run_sync(json!({
            "config": cfg, "workspace": w, "documents": { &d.id: "# S3 note" }
        })).await.unwrap();
        assert!(up.ok, "s3 upload failed: {:?}", up.errors);
        assert_eq!(up.uploaded, 1);
        let down = run_sync(json!({
            "config": cfg, "workspace": ws(vec![]), "documents": {}
        })).await.unwrap();
        assert!(down.ok, "s3 download failed: {:?}", down.errors);
        assert_eq!(down.documents.get("d22222222").unwrap(), "# S3 note");
    }

    #[test]
    fn sigv4_smoke() {
        let k = hmac(b"key", "The quick brown fox jumps over the lazy dog");
        assert_eq!(hex::encode(k), "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8");
        let (amz, date) = amz_date();
        assert_eq!(amz.len(), 16);
        assert_eq!(date.len(), 8);
        assert_eq!(encode_path("中文 目录/a.md"), "%E4%B8%AD%E6%96%87%20%E7%9B%AE%E5%BD%95/a.md");
    }
}

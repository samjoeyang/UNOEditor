//! UNOEditor optional AI assist: user-provided API keys (BYOK), OpenAI-compatible protocol.
//! The app never hosts models or keys. Network calls happen only when the user
//! explicitly enables AI and triggers an action. No key is ever logged.

use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use tauri::{Emitter, Manager};

const AI_CONFIG_FILE: &str = "ai-config.json";
const MAX_PROFILES: usize = 8;
const DEFAULT_TIMEOUT_MS: u64 = 30_000;
const DEFAULT_MAX_TOKENS: u32 = 2048;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProfile {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub provider: String,
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
}

fn default_temperature() -> f32 { 0.7 }
fn default_max_tokens() -> u32 { DEFAULT_MAX_TOKENS }

/// User-defined prompt skill, stored locally in ai-config.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSkill {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub prompt: String,
    /// Space-separated scopes, e.g. "rewrite draft doc". Empty = all.
    #[serde(default)]
    pub scopes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub default_profile: String,
    #[serde(default)]
    pub profiles: Vec<AiProfile>,
    #[serde(default)]
    pub system_prompt: String,
    #[serde(default = "default_timeout")]
    pub request_timeout_ms: u64,
    /// User-defined prompt skills. Missing in old configs (backward compatible).
    #[serde(default)]
    pub skills: Vec<AiSkill>,
    #[serde(default)]
    pub updated_at: u64,
}

fn default_version() -> u32 { 1 }
fn default_timeout() -> u64 { DEFAULT_TIMEOUT_MS }

impl Default for AiConfig {
    fn default() -> Self {
        AiConfig {
            enabled: false,
            version: 1,
            default_profile: String::new(),
            profiles: Vec::new(),
            system_prompt: String::new(),
            request_timeout_ms: DEFAULT_TIMEOUT_MS,
            skills: Vec::new(),
            updated_at: 0,
        }
    }
}

fn err(e: impl std::fmt::Display) -> String { e.to_string() }

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|d| d.join(AI_CONFIG_FILE))
        .map_err(err)
}

#[tauri::command]
pub fn uno_ai_config_get(app: tauri::AppHandle) -> Result<AiConfig, String> {
    let p = config_path(&app)?;
    if !p.exists() {
        return Ok(AiConfig::default());
    }
    let raw = fs::read_to_string(&p).map_err(err)?;
    let cfg: AiConfig = serde_json::from_str(&raw).map_err(err)?;
    Ok(cfg)
}

#[tauri::command]
pub fn uno_ai_config_set(app: tauri::AppHandle, cfg: AiConfig) -> Result<(), String> {
    if cfg.profiles.len() > MAX_PROFILES {
        return Err(format!("At most {} profiles are allowed", MAX_PROFILES));
    }
    for p in &cfg.profiles {
        if p.id.is_empty() || p.base_url.is_empty() || p.model.is_empty() {
            return Err("Each profile needs id, baseUrl and model".into());
        }
    }
    if !cfg.default_profile.is_empty()
        && !cfg.profiles.iter().any(|p| p.id == cfg.default_profile)
    {
        return Err("defaultProfile does not match any profile".into());
    }
    let p = config_path(&app)?;
    if let Some(dir) = p.parent() {
        fs::create_dir_all(dir).map_err(err)?;
    }
    fs::write(&p, serde_json::to_string_pretty(&cfg).map_err(err)?).map_err(err)
}

fn resolve_profile<'a>(cfg: &'a AiConfig, id: &str) -> Result<&'a AiProfile, String> {
    if id.is_empty() {
        if let Some(p) = cfg.profiles.iter().find(|p| p.id == cfg.default_profile) {
            return Ok(p);
        }
        return Err("No default AI profile configured".into());
    }
    cfg.profiles
        .iter()
        .find(|p| p.id == id)
        .ok_or_else(|| "AI profile not found".into())
}

fn endpoint(base: &str) -> String {
    let b = base.trim().trim_end_matches('/');
    if b.ends_with("/chat/completions") {
        return b.to_string();
    }
    format!("{}/chat/completions", b)
}

/// Strip accidental Markdown code fences from model output.
pub fn clean_output(text: &str) -> String {
    let s = text.trim();
    if let Some(rest) = s.strip_prefix("```") {
        let rest = rest.trim_start_matches(|c: char| c.is_alphanumeric() || c == '+' || c == '-');
        let rest = rest.trim_start_matches(|c: char| c.is_whitespace());
        if let Some(body) = rest.strip_suffix("```") {
            return body.trim().to_string();
        }
    }
    s.to_string()
}

fn build_messages(
    cfg: &AiConfig,
    p: &AiProfile,
    messages: &Value,
) -> Result<Vec<Value>, String> {
    let mut out: Vec<Value> = Vec::new();
    let system = {
        let base = if cfg.system_prompt.trim().is_empty() {
            "You are a writing assistant. Output Markdown only. Do not wrap the answer in code fences; do not add explanations."
        } else {
            cfg.system_prompt.trim()
        };
        base.to_string()
    };
    out.push(json!({ "role": "system", "content": system }));

    let arr = messages
        .as_array()
        .ok_or_else(|| "messages must be an array".to_string())?;
    if arr.is_empty() {
        return Err("messages must not be empty".into());
    }
    for m in arr {
        let role = m.get("role").and_then(Value::as_str).unwrap_or("user");
        let content = m.get("content").and_then(Value::as_str).unwrap_or("");
        if content.trim().is_empty() {
            continue;
        }
        out.push(json!({ "role": role, "content": content }));
    }
    if out.len() == 1 {
        return Err("messages must contain user content".into());
    }
    let _ = p;
    Ok(out)
}

fn client_with_timeout(timeout_ms: u64) -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_millis(timeout_ms.max(1_000)))
        .build()
        .map_err(err)
}

async fn post_chat(cfg: &AiConfig, p: &AiProfile, messages: &Value) -> Result<String, String> {
    let url = endpoint(&p.base_url);
    let client = client_with_timeout(cfg.request_timeout_ms)?;
    let body = json!({
        "model": p.model,
        "messages": build_messages(cfg, p, messages)?,
        "temperature": p.temperature,
        "max_tokens": p.max_tokens,
        "stream": false
    });
    let resp = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", p.api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = resp.status();
    let raw = resp.text().await.map_err(err)?;
    if !status.is_success() {
        return Err(format!("Provider returned {}: {}", status.as_u16(), truncate(&raw)));
    }
    let parsed: Value = serde_json::from_str(&raw).map_err(|_| format!("Invalid response: {}", truncate(&raw)))?;
    parsed
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|a| a.first())
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(Value::as_str)
        .map(clean_output)
        .ok_or_else(|| "Response has no content".into())
}

fn truncate(s: &str) -> String {
    let mut out: String = s.chars().take(300).collect();
    if s.chars().count() > 300 {
        out.push_str("…");
    }
    out
}

#[tauri::command]
pub async fn uno_ai_test(app: tauri::AppHandle, profile_id: String) -> Result<String, String> {
    let cfg = uno_ai_config_get(app)?;
    let p = resolve_profile(&cfg, &profile_id)?;
    if p.api_key.trim().is_empty() {
        return Err("API key is empty".into());
    }
    let messages = json!([{ "role": "user", "content": "Reply with OK" }]);
    let text = post_chat(&cfg, p, &messages).await?;
    Ok(truncate(&text))
}

#[tauri::command]
pub async fn uno_ai_chat(
    app: tauri::AppHandle,
    profile_id: String,
    messages: Value,
) -> Result<String, String> {
    let cfg = uno_ai_config_get(app)?;
    if !cfg.enabled {
        return Err("AI is disabled".into());
    }
    let p = resolve_profile(&cfg, &profile_id)?;
    if p.api_key.trim().is_empty() {
        return Err("API key is empty".into());
    }
    post_chat(&cfg, p, &messages).await
}

/* ---------------- streaming (SSE) ---------------- */

/// Feed one raw chunk into an SSE buffer and extract text deltas.
/// `buf` carries an incomplete line across chunk boundaries.
/// A line `data: [DONE]` ends the stream (signalled via `done = true`).
pub fn sse_delta(buf: &mut String, chunk: &str) -> (Vec<String>, bool) {
    buf.push_str(chunk);
    let mut deltas = Vec::new();
    let mut done = false;
    let mut cursor = 0usize;
    loop {
        let nl = match buf[cursor..].find('\n') {
            Some(p) => p,
            None => break,
        };
        let line_end = cursor + nl;
        let l = buf[cursor..line_end].trim_end_matches('\r');
        cursor = line_end + 1;
        if !l.starts_with("data:") {
            continue;
        }
        let data = l[5..].trim();
        if data == "[DONE]" {
            done = true;
            continue;
        }
        if let Ok(v) = serde_json::from_str::<Value>(data) {
            if let Some(content) = v
                .get("choices")
                .and_then(Value::as_array)
                .and_then(|a| a.first())
                .and_then(|c| c.get("delta"))
                .and_then(|d| d.get("content"))
                .and_then(Value::as_str)
            {
                if !content.is_empty() {
                    deltas.push(content.to_string());
                }
            }
        }
    }
    if cursor > 0 {
        *buf = buf[cursor..].to_string();
    }
    (deltas, done)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStreamEvent {
    pub request_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delta: Option<String>,
    pub done: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

const STREAM_EVENT: &str = "uno-ai-stream";

#[tauri::command]
pub async fn uno_ai_chat_stream(
    app: tauri::AppHandle,
    profile_id: String,
    messages: Value,
    request_id: String,
) -> Result<(), String> {
    let cfg = uno_ai_config_get(app.clone())?;
    let p = match resolve_profile(&cfg, &profile_id) {
        Ok(p) => p.clone(),
        Err(e) => {
            let _ = app.emit(STREAM_EVENT, AiStreamEvent {
                request_id, delta: None, done: true, error: Some(e.clone()),
            });
            return Err(e);
        }
    };
    if p.api_key.trim().is_empty() {
        let _ = app.emit(STREAM_EVENT, AiStreamEvent {
            request_id, delta: None, done: true, error: Some("API key is empty".into()),
        });
        return Err("API key is empty".into());
    }
    let url = endpoint(&p.base_url);
    let client = match client_with_timeout(cfg.request_timeout_ms) {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit(STREAM_EVENT, AiStreamEvent {
                request_id, delta: None, done: true, error: Some(e.clone()),
            });
            return Err(e);
        }
    };
    let body = json!({
        "model": p.model,
        "messages": build_messages(&cfg, &p, &messages)?,
        "temperature": p.temperature,
        "max_tokens": p.max_tokens,
        "stream": true
    });
    let resp = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", p.api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        let raw = resp.text().await.unwrap_or_default();
        let msg = format!("Provider returned {}: {}", status.as_u16(), truncate(&raw));
        let _ = app.emit(STREAM_EVENT, AiStreamEvent {
            request_id, delta: None, done: true, error: Some(msg.clone()),
        });
        return Err(msg);
    }

    let mut stream = resp.bytes_stream();
    let idle = Duration::from_millis(cfg.request_timeout_ms.max(1_000));
    let mut buf = String::new();
    loop {
        // Per-read idle timeout: a stalled provider stream must not hang forever.
        match tokio::time::timeout(idle, stream.next()).await {
            Ok(Some(item)) => match item {
                Ok(bytes) => {
                    let chunk = String::from_utf8_lossy(&bytes);
                    let (deltas, done) = sse_delta(&mut buf, &chunk);
                    for d in deltas {
                        let _ = app.emit(STREAM_EVENT, AiStreamEvent {
                            request_id: request_id.clone(), delta: Some(d), done: false, error: None,
                        });
                    }
                    if done { break; }
                }
                Err(e) => {
                    let msg = format!("Stream failed: {}", e);
                    let _ = app.emit(STREAM_EVENT, AiStreamEvent {
                        request_id: request_id.clone(), delta: None, done: true, error: Some(msg.clone()),
                    });
                    return Err(msg);
                }
            },
            Ok(None) => break,
            Err(_) => {
                let msg = format!("Stream idle timeout ({}s without data)", idle.as_secs());
                let _ = app.emit(STREAM_EVENT, AiStreamEvent {
                    request_id: request_id.clone(), delta: None, done: true, error: Some(msg.clone()),
                });
                return Err(msg);
            }
        }
    }
    // Terminal event: ALWAYS emitted when the loop exits normally (both the
    // explicit `data: [DONE]` marker and a provider-side close). The frontend
    // settles its promise on this event; without it a normal completion would
    // leave the UI "busy" until the watchdog fires.
    let _ = app.emit(STREAM_EVENT, AiStreamEvent {
        request_id, delta: None, done: true, error: None,
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn profile() -> AiProfile {
        AiProfile {
            id: "a".into(),
            name: "A".into(),
            provider: "openai-compatible".into(),
            base_url: "https://api.example.com/v1/".into(),
            model: "m".into(),
            api_key: "sk-test".into(),
            temperature: 0.7,
            max_tokens: 2048,
        }
    }

    #[test]
    fn endpoint_normalizes_base_url() {
        assert_eq!(endpoint("https://x/v1"), "https://x/v1/chat/completions");
        assert_eq!(endpoint("https://x/v1/"), "https://x/v1/chat/completions");
        assert_eq!(
            endpoint("https://x/v1/chat/completions"),
            "https://x/v1/chat/completions"
        );
    }

    #[test]
    fn clean_output_removes_fences() {
        assert_eq!(clean_output("```markdown\n# Hi\n```"), "# Hi");
        assert_eq!(clean_output("  plain text  "), "plain text");
        assert_eq!(clean_output("```js\nconst a=1;\n```"), "const a=1;");
    }

    #[test]
    fn build_messages_injects_system_and_skips_empty() {
        let cfg = AiConfig::default();
        let p = profile();
        let messages = json!([
            { "role": "user", "content": "hello" },
            { "role": "assistant", "content": "" }
        ]);
        let out = build_messages(&cfg, &p, &messages).unwrap();
        assert_eq!(out.len(), 2);
        assert_eq!(out[0]["role"], "system");
        assert_eq!(out[1]["content"], "hello");
    }

    #[test]
    fn resolve_profile_handles_default_and_missing() {
        let mut cfg = AiConfig::default();
        cfg.profiles.push(profile());
        cfg.default_profile = "a".into();
        assert_eq!(resolve_profile(&cfg, "").unwrap().id, "a");
        assert_eq!(resolve_profile(&cfg, "a").unwrap().model, "m");
        assert!(resolve_profile(&cfg, "missing").is_err());
        cfg.default_profile = "none".into();
        assert!(resolve_profile(&cfg, "").is_err());
    }

    #[test]
    fn config_defaults_are_safe() {
        let cfg = AiConfig::default();
        assert!(!cfg.enabled);
        assert!(cfg.profiles.is_empty());
        assert_eq!(cfg.version, 1);
    }

    #[test]
    fn sse_delta_splits_across_chunks() {
        let mut buf = String::new();
        let a = "data: {\"choices\":[{\"delta\":{\"content\":\"你\"}}]}\n\ndata: {\"ch";
        let (d1, done1) = sse_delta(&mut buf, a);
        assert_eq!(d1, vec!["你"]);
        assert!(!done1);
        assert_eq!(buf, "data: {\"ch");
        let b = "oices\":[{\"delta\":{\"content\":\"好\"}}]}\n\ndata: [DONE]\n\n";
        let (d2, done2) = sse_delta(&mut buf, b);
        assert_eq!(d2, vec!["好"]);
        assert!(done2);
        assert!(buf.is_empty());
    }

    #[test]
    fn sse_delta_ignores_comments_and_heartbeats() {
        let mut buf = String::new();
        let (d, done) = sse_delta(&mut buf, ": heartbeat\n\nevent: ping\ndata: \n\ndata: {\"choices\":[]}\n\n");
        assert!(d.is_empty());
        assert!(!done);
    }

    #[test]
    fn skills_default_when_missing_and_roundtrip() {
        let raw = r#"{"enabled":false,"profiles":[]}"#;
        let cfg: AiConfig = serde_json::from_str(raw).unwrap();
        assert!(cfg.skills.is_empty());
        let mut cfg = cfg;
        cfg.skills.push(AiSkill {
            id: "s1".into(), name: "概述".into(),
            prompt: "Summarize in bullets".into(), scopes: "doc".into(),
        });
        let out = serde_json::to_string(&cfg).unwrap();
        assert!(out.contains("skills"));
        assert!(out.contains("scopes"));
    }

    #[test]
    fn serde_roundtrip_camel_case() {
        let mut cfg = AiConfig::default();
        cfg.profiles.push(profile());
        cfg.default_profile = "a".into();
        let raw = serde_json::to_string(&cfg).unwrap();
        assert!(raw.contains("defaultProfile"));
        assert!(raw.contains("baseUrl"));
        let back: AiConfig = serde_json::from_str(&raw).unwrap();
        assert_eq!(back.profiles[0].api_key, "sk-test");
    }
}

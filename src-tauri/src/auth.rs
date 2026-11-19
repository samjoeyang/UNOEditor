//! UNOEditor — 账号登录辅助命令。
//! 授权服务器 auth.zhenzhidaole.com（Logto）；桌面端在 WebView 外用 reqwest 与
//! token/userinfo 端点通信，避免 WebView 的 CORS 限制。应用为 public client，
//! 仅凭 PKCE（无 client secret）交换令牌。

use reqwest::{header, Client};
use serde_json::Value;
use std::time::Duration;

const AUTH_ISSUER: &str = "https://auth.zhenzhidaole.com/api/auth";
const CLIENT_ID: &str = "qisPREDdYbAkucRAWemTIrXooiSTdTof";

fn e<E: std::fmt::Display>(err: E) -> String { err.to_string() }

fn http() -> Result<Client, String> {
    Client::builder().timeout(Duration::from_secs(30)).build().map_err(e)
}

#[tauri::command]
pub async fn uno_auth_exchange(code: String, verifier: String, redirect_uri: String) -> Result<Value, String> {
    let client = http()?;
    let params = [
        ("grant_type", "authorization_code"),
        ("client_id", CLIENT_ID),
        ("code", code.as_str()),
        ("code_verifier", verifier.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
    ];
    let res = client.post(format!("{AUTH_ISSUER}/oauth2/token"))
        .form(&params)
        .send().await.map_err(e)?;
    let status = res.status();
    let body: Value = res.json().await.map_err(e)?;
    if !status.is_success() {
        return Err(format!("token exchange failed ({}): {}",
            status,
            body.get("error_description").and_then(|v| v.as_str()).unwrap_or("")));
    }
    Ok(body)
}

#[tauri::command]
pub async fn uno_auth_refresh(refresh_token: String) -> Result<Value, String> {
    let client = http()?;
    let params = [
        ("grant_type", "refresh_token"),
        ("client_id", CLIENT_ID),
        ("refresh_token", refresh_token.as_str()),
    ];
    let res = client.post(format!("{AUTH_ISSUER}/oauth2/token"))
        .form(&params)
        .send().await.map_err(e)?;
    let status = res.status();
    let body: Value = res.json().await.map_err(e)?;
    if !status.is_success() {
        return Err(format!("refresh failed ({}): {}",
            status,
            body.get("error_description").and_then(|v| v.as_str()).unwrap_or("")));
    }
    Ok(body)
}

#[tauri::command]
pub async fn uno_auth_userinfo(access_token: String) -> Result<Value, String> {
    let client = http()?;
    let res = client.get(format!("{AUTH_ISSUER}/oauth2/userinfo"))
        .header(header::AUTHORIZATION, format!("Bearer {access_token}"))
        .send().await.map_err(e)?;
    let status = res.status();
    let body: Value = res.json().await.map_err(e)?;
    if !status.is_success() {
        return Err(format!("userinfo failed ({})", status));
    }
    Ok(body)
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod sync;

use tauri::Emitter;

fn main() {
    tauri::Builder::default()
        // single-instance must be registered first: it forwards a second
        // launch (e.g. a unoeditor:// deep link while the app is running)
        // to the existing process, where the deep-link plugin emits it.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // macOS: a unoeditor:// deep link while running launches a second
            // instance whose argv carries the URL. Forward it to the primary
            // process so the frontend can complete PKCE sign-in.
            let urls: Vec<String> = args
                .iter()
                .filter(|a| a.starts_with("unoeditor://"))
                .cloned()
                .collect();
            if !urls.is_empty() {
                let _ = app.emit("uno-deep-link", urls);
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            sync::uno_config_get,
            sync::uno_config_set,
            sync::uno_pick_dir,
            sync::uno_workspace_read,
            sync::uno_workspace_write,
            sync::uno_test_connection,
            sync::uno_sync,
            auth::uno_auth_exchange,
            auth::uno_auth_refresh,
            auth::uno_auth_userinfo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

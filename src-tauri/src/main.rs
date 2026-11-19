#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod sync;

fn main() {
    tauri::Builder::default()
        // single-instance must be registered first: it forwards a second
        // launch (e.g. a unoeditor:// deep link while the app is running)
        // to the existing process, where the deep-link plugin emits it.
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
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

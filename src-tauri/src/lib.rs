// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod menu;
mod settings;
mod themes;

use std::sync::Mutex;

use commands::export::{export_binary, export_html, export_pdf};
use commands::files::{
    get_file_mtime, import_document, list_dir_markdown, open_file, open_folder_dialog, open_readme,
    read_file, save_file_as, write_file,
};
use commands::images;
use commands::settings::{get_settings, save_settings};
use commands::themes::{import_theme_css, import_theme_from_path, list_themes, read_theme_css};
use tauri::{Emitter, Manager, RunEvent};

struct PendingOpenPaths(Mutex<Vec<String>>);

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_image_asset(doc_path: String, bytes: Vec<u8>, ext: String) -> Result<String, String> {
    images::save_image_asset(std::path::Path::new(&doc_path), &bytes, &ext)
}

#[tauri::command]
fn take_pending_open_paths(state: tauri::State<'_, PendingOpenPaths>) -> Vec<String> {
    std::mem::take(&mut *state.0.lock().expect("pending open paths lock"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(PendingOpenPaths(Mutex::new(Vec::new())))
        .setup(|app| {
            menu::install(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_settings,
            save_settings,
            list_themes,
            read_theme_css,
            import_theme_from_path,
            import_theme_css,
            open_file,
            open_folder_dialog,
            import_document,
            list_dir_markdown,
            read_file,
            write_file,
            save_file_as,
            get_file_mtime,
            save_image_asset,
            export_html,
            export_pdf,
            export_binary,
            open_readme,
            take_pending_open_paths,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app, event| {
        if let RunEvent::Opened { urls } = event {
            let paths: Vec<String> = urls
                .into_iter()
                .filter_map(|u| u.to_file_path().ok())
                .map(|p| p.to_string_lossy().into_owned())
                .filter(|p| !p.is_empty())
                .collect();
            if paths.is_empty() {
                return;
            }
            let has_window = !app.webview_windows().is_empty();
            if has_window {
                let _ = app.emit("open-paths", &paths);
            } else if let Some(state) = app.try_state::<PendingOpenPaths>() {
                state
                    .0
                    .lock()
                    .expect("pending open paths lock")
                    .extend(paths);
            }
        }
    });
}

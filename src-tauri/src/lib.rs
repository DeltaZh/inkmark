// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod menu;
mod settings;
mod themes;

use commands::export::{export_binary, export_html, export_pdf};
use commands::files::{
    get_file_mtime, import_document, list_dir_markdown, open_file, open_folder_dialog, open_readme,
    read_file, save_file_as, write_file,
};
use commands::images;
use commands::settings::{get_settings, save_settings};
use commands::themes::{import_theme_css, import_theme_from_path, list_themes, read_theme_css};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_image_asset(doc_path: String, bytes: Vec<u8>, ext: String) -> Result<String, String> {
    images::save_image_asset(std::path::Path::new(&doc_path), &bytes, &ext)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

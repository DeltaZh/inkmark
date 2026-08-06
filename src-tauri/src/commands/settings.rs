use crate::menu;
use crate::settings::store::ALLOWED_IMAGE_STRATEGY;
use crate::settings::{store, Settings};
use tauri::AppHandle;
use tauri::Manager;

fn app_settings_path(handle: &AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data = handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(store::settings_path(&app_data))
}

#[tauri::command]
pub fn get_settings(handle: AppHandle) -> Result<Settings, String> {
    let path = app_settings_path(&handle)?;
    store::load_from_path(&path)
}

#[tauri::command]
pub fn save_settings(handle: AppHandle, mut settings: Settings) -> Result<(), String> {
    if settings.image_strategy != ALLOWED_IMAGE_STRATEGY {
        return Err(format!(
            "unsupported image_strategy: only \"{}\" is allowed",
            ALLOWED_IMAGE_STRATEGY
        ));
    }
    settings.normalize();
    let path = app_settings_path(&handle)?;
    store::save_to_path(&path, &settings)?;
    menu::refresh_after_settings_change(&handle);
    Ok(())
}

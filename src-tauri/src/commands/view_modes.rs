use tauri::{AppHandle, Wry};

use crate::menu;

#[tauri::command]
pub fn set_view_mode_menu_checked(
    app: AppHandle<Wry>,
    focus: bool,
    typewriter: bool,
) -> Result<(), String> {
    menu::set_view_mode_checked(&app, focus, typewriter);
    Ok(())
}

use crate::themes::{
    app_themes_dir, assert_path_allowed, builtin_default_css, builtin_default_theme,
    bundled_themes_dir, load_theme_css_resolved, scan_theme_dirs, external_themes_dir, ThemeInfo,
    ThemeSource,
};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri::Manager;

fn theme_root_paths(handle: &AppHandle) -> Result<Vec<PathBuf>, String> {
    let home = handle.path().home_dir().map_err(|e| e.to_string())?;
    let app_data = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let resource = handle.path().resource_dir().ok();
    Ok(vec![
        external_themes_dir(&home),
        bundled_themes_dir(resource.as_deref()),
        app_themes_dir(&app_data),
    ])
}

fn merge_with_builtin(themes: Vec<ThemeInfo>) -> Vec<ThemeInfo> {
    let mut map: std::collections::HashMap<String, ThemeInfo> = std::collections::HashMap::new();
    map.insert(builtin_default_theme().name.clone(), builtin_default_theme());
    for theme in themes {
        map.insert(theme.name.clone(), theme);
    }
    let mut list: Vec<_> = map.into_values().collect();
    list.sort_by(|a, b| a.name.cmp(&b.name));
    list
}

#[tauri::command]
pub fn list_themes(handle: AppHandle, read_external: bool) -> Result<Vec<ThemeInfo>, String> {
    let home = handle.path().home_dir().map_err(|e| e.to_string())?;
    let app_data = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let resource = handle.path().resource_dir().ok();
    let app_dir = app_themes_dir(&app_data);
    let external_dir = external_themes_dir(&home);
    let bundled_dir = bundled_themes_dir(resource.as_deref());

    // 扫描顺序任意；同名按 source_priority：app > bundled > external > builtin
    let mut dirs: Vec<(&Path, ThemeSource)> = Vec::new();
    if read_external {
        dirs.push((external_dir.as_path(), ThemeSource::External));
    }
    dirs.push((bundled_dir.as_path(), ThemeSource::Bundled));
    dirs.push((app_dir.as_path(), ThemeSource::App));

    Ok(merge_with_builtin(scan_theme_dirs(&dirs)))
}

#[tauri::command]
pub fn read_theme_css(handle: AppHandle, path: String) -> Result<String, String> {
    if path == crate::themes::BUILTIN_DEFAULT_PATH {
        return Ok(builtin_default_css().to_string());
    }

    let roots = theme_root_paths(&handle)?;
    let allowed: Vec<&Path> = roots.iter().map(|p| p.as_path()).collect();
    let file_path = assert_path_allowed(&path, &allowed)?;
    load_theme_css_resolved(&file_path)
}

/// 将任意可读 `.css` 复制到应用 themes 目录（同名覆盖），返回 source=app 的 ThemeInfo。
pub fn copy_theme_css_into_app_dir(source: &Path, dest_dir: &Path) -> Result<ThemeInfo, String> {
    if source.extension().and_then(|e| e.to_str()) != Some("css") {
        return Err("only .css theme files can be imported".into());
    }
    if !source.is_file() {
        return Err(format!("theme file not found: {}", source.display()));
    }

    let name = source
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "invalid theme file name".to_string())?;

    fs::create_dir_all(dest_dir).map_err(|e| e.to_string())?;
    let dest = dest_dir.join(format!("{name}.css"));
    fs::copy(source, &dest).map_err(|e| e.to_string())?;

    // 若主题目录含相对资源（@font-face 等），一并复制同名子目录
    if let Some(parent) = source.parent() {
        let asset_dir = parent.join(name);
        if asset_dir.is_dir() {
            let dest_assets = dest_dir.join(name);
            copy_dir_recursive(&asset_dir, &dest_assets)?;
        }
    }

    Ok(ThemeInfo {
        id: format!("{:?}:{}", ThemeSource::App, name),
        name: name.to_string(),
        path: dest.to_string_lossy().into(),
        source: ThemeSource::App,
    })
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if from.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else {
            fs::copy(&from, &to).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// 从任意可读路径导入主题 CSS（对话框选中的文件等）。
#[tauri::command]
pub fn import_theme_from_path(handle: AppHandle, source_path: String) -> Result<ThemeInfo, String> {
    let source = Path::new(&source_path);
    let app_data = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let dest_dir = app_themes_dir(&app_data);
    copy_theme_css_into_app_dir(source, &dest_dir)
}

/// 兼容旧命令名：与 `import_theme_from_path` 行为一致。
#[tauri::command]
pub fn import_theme_css(handle: AppHandle, source_path: String) -> Result<ThemeInfo, String> {
    import_theme_from_path(handle, source_path)
}

#[cfg(test)]
mod tests {
    use super::copy_theme_css_into_app_dir;
    use crate::themes::ThemeSource;
    use std::fs;

    #[test]
    fn imports_css_from_arbitrary_path_into_app_dir() {
        let root = tempfile::tempdir().unwrap();
        let outside = root.path().join("Downloads");
        let app = root.path().join("app-themes");
        fs::create_dir_all(&outside).unwrap();
        let source = outside.join("night.css");
        fs::write(&source, "/* night */").unwrap();

        let info = copy_theme_css_into_app_dir(&source, &app).unwrap();
        assert_eq!(info.name, "night");
        assert_eq!(info.source, ThemeSource::App);
        assert!(info.path.ends_with("night.css"));
        assert_eq!(fs::read_to_string(app.join("night.css")).unwrap(), "/* night */");
    }

    #[test]
    fn overwrite_same_name_ok() {
        let root = tempfile::tempdir().unwrap();
        let outside = root.path().join("src");
        let app = root.path().join("app-themes");
        fs::create_dir_all(&outside).unwrap();
        fs::create_dir_all(&app).unwrap();
        fs::write(app.join("custom.css"), "/* old */").unwrap();
        let source = outside.join("custom.css");
        fs::write(&source, "/* new */").unwrap();

        let info = copy_theme_css_into_app_dir(&source, &app).unwrap();
        assert_eq!(info.name, "custom");
        assert_eq!(fs::read_to_string(app.join("custom.css")).unwrap(), "/* new */");
    }

    #[test]
    fn rejects_non_css() {
        let root = tempfile::tempdir().unwrap();
        let source = root.path().join("notes.md");
        fs::write(&source, "# hi").unwrap();
        let err = copy_theme_css_into_app_dir(&source, root.path()).unwrap_err();
        assert!(err.contains(".css"));
    }

    #[test]
    fn copies_sibling_asset_dir() {
        let root = tempfile::tempdir().unwrap();
        let outside = root.path().join("themes");
        let app = root.path().join("app-themes");
        fs::create_dir_all(outside.join("night")).unwrap();
        fs::write(outside.join("night.css"), "/* n */").unwrap();
        fs::write(outside.join("night").join("a.css"), "/* a */").unwrap();

        copy_theme_css_into_app_dir(&outside.join("night.css"), &app).unwrap();
        assert!(app.join("night").join("a.css").is_file());
    }
}

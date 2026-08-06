use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

pub const ALLOWED_IMAGE_STRATEGY: &str = "assets_beside";
pub const RECENT_FILES_MAX: usize = 12;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub default_theme: String,
    /// 是否扫描本机社区主题目录（兼容旧版设置字段名）
    #[serde(alias = "readTyporaThemes")]
    pub read_external_themes: bool,
    pub image_strategy: String,
    /// 最近打开的文件夹（绝对路径）；无则为 null。
    #[serde(default)]
    pub last_folder: Option<String>,
    /// 最近打开/保存的文件绝对路径（新在前）。
    #[serde(default)]
    pub recent_files: Vec<String>,
    /// 键入时检查拼写。
    #[serde(default = "default_true")]
    pub spell_check: bool,
}

fn default_true() -> bool {
    true
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            default_theme: "github".into(),
            read_external_themes: true,
            image_strategy: ALLOWED_IMAGE_STRATEGY.into(),
            last_folder: None,
            recent_files: Vec::new(),
            spell_check: true,
        }
    }
}

impl Settings {
    /// 加载后规范化：非法 `image_strategy` 回落为默认值；整理最近文件列表。
    pub fn normalize(&mut self) {
        if self.image_strategy != ALLOWED_IMAGE_STRATEGY {
            self.image_strategy = ALLOWED_IMAGE_STRATEGY.into();
        }
        // 旧版 default 主题名 → 内置 github
        if self.default_theme == "default" {
            self.default_theme = "github".into();
        }
        normalize_recent_files(&mut self.recent_files);
    }
}

fn normalize_recent_files(files: &mut Vec<String>) {
    let mut cleaned = Vec::with_capacity(files.len().min(RECENT_FILES_MAX));
    let mut seen = HashSet::new();
    for p in files.drain(..) {
        let t = p.trim().to_string();
        if t.is_empty() || !seen.insert(t.clone()) {
            continue;
        }
        cleaned.push(t);
        if cleaned.len() >= RECENT_FILES_MAX {
            break;
        }
    }
    *files = cleaned;
}

pub fn settings_path(app_data: &Path) -> PathBuf {
    app_data.join("settings.json")
}

pub fn load_from_path(path: &Path) -> Result<Settings, String> {
    if !path.exists() {
        return Ok(Settings::default());
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut settings: Settings = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    settings.normalize();
    Ok(settings)
}

pub fn save_to_path(path: &Path, settings: &Settings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn default_settings_values() {
        let s = Settings::default();
        assert_eq!(s.default_theme, "github");
        assert!(s.read_external_themes);
        assert_eq!(s.image_strategy, "assets_beside");
        assert!(s.recent_files.is_empty());
    }

    #[test]
    fn roundtrip_json_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let s = Settings {
            default_theme: "newsprint".into(),
            read_external_themes: false,
            image_strategy: "assets_beside".into(),
            last_folder: Some("/tmp/notes".into()),
            recent_files: vec!["/tmp/notes/a.md".into(), "/tmp/b.md".into()],
            spell_check: true,
        };
        save_to_path(&path, &s).unwrap();
        let loaded = load_from_path(&path).unwrap();
        assert_eq!(loaded.default_theme, "newsprint");
        assert!(!loaded.read_external_themes);
        assert_eq!(loaded.last_folder.as_deref(), Some("/tmp/notes"));
        assert_eq!(
            loaded.recent_files,
            vec!["/tmp/notes/a.md".to_string(), "/tmp/b.md".to_string()]
        );
        let _ = fs::remove_file(path);
    }

    #[test]
    fn missing_last_folder_defaults_to_none() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        fs::write(
            &path,
            r#"{"defaultTheme":"default","readExternalThemes":true,"imageStrategy":"assets_beside"}"#,
        )
        .unwrap();
        let loaded = load_from_path(&path).unwrap();
        assert_eq!(loaded.last_folder, None);
        assert!(loaded.recent_files.is_empty());
        assert_eq!(loaded.default_theme, "github");
    }

    #[test]
    fn recent_files_deduped_and_capped_on_load() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let mut files = Vec::new();
        for i in 0..20 {
            files.push(format!("\"/f{i}.md\""));
        }
        files.push("\"/f0.md\"".into());
        let body = format!(
            r#"{{"defaultTheme":"default","readExternalThemes":true,"imageStrategy":"assets_beside","recentFiles":[{}]}}"#,
            files.join(",")
        );
        fs::write(&path, body).unwrap();
        let loaded = load_from_path(&path).unwrap();
        assert_eq!(loaded.recent_files.len(), RECENT_FILES_MAX);
        assert_eq!(loaded.recent_files[0], "/f0.md");
        assert!(!loaded.recent_files.iter().skip(1).any(|p| p == "/f0.md"));
    }

    #[test]
    fn illegal_image_strategy_coerced_on_load() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        fs::write(
            &path,
            r#"{"defaultTheme":"newsprint","readExternalThemes":false,"imageStrategy":"inline_base64"}"#,
        )
        .unwrap();
        let loaded = load_from_path(&path).unwrap();
        assert_eq!(loaded.default_theme, "newsprint");
        assert!(!loaded.read_external_themes);
        assert_eq!(loaded.image_strategy, ALLOWED_IMAGE_STRATEGY);
    }
}

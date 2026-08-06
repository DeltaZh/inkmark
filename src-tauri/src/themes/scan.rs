use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

pub const BUILTIN_DEFAULT_PATH: &str = "builtin:github";
const BUILTIN_DEFAULT_NAME: &str = "github";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ThemeInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub source: ThemeSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ThemeSource {
    /// 本机常见社区主题目录
    #[serde(alias = "typora")]
    External,
    App,
    Builtin,
    /// 随应用打包的内置主题
    Bundled,
}

/// 本机社区主题目录（macOS 上常见第三方编辑器主题存放位置）。
pub fn external_themes_dir(home: &Path) -> PathBuf {
    home.join("Library/Application Support/abnerworks.Typora/themes")
}

pub fn app_themes_dir(app_data: &Path) -> PathBuf {
    app_data.join("themes")
}

/// 开发态：仓库 `resources/editor/themes`；打包态：resource_dir 下同相对路径。
pub fn bundled_themes_dir(resource_dir: Option<&Path>) -> PathBuf {
    let rel = Path::new("editor/themes");
    if let Some(dir) = resource_dir {
        let candidate = dir.join(rel);
        if candidate.is_dir() {
            return candidate;
        }
        // 兼容旧布局 resource_dir/themes
        let legacy = dir.join("themes");
        if legacy.is_dir() {
            return legacy;
        }
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../resources/editor/themes")
}

pub fn builtin_default_theme() -> ThemeInfo {
    ThemeInfo {
        id: format!("{:?}:{}", ThemeSource::Builtin, BUILTIN_DEFAULT_NAME),
        name: BUILTIN_DEFAULT_NAME.into(),
        path: BUILTIN_DEFAULT_PATH.into(),
        source: ThemeSource::Builtin,
    }
}

pub fn builtin_default_css() -> &'static str {
    // 回退用内置 github 主题（base 由前端固定加载）
    include_str!("../../../resources/editor/themes/github.css")
}

fn source_priority(source: &ThemeSource) -> u8 {
    match source {
        ThemeSource::Builtin => 0,
        ThemeSource::External => 1,
        ThemeSource::Bundled => 2,
        ThemeSource::App => 3,
    }
}

pub fn scan_theme_dirs(dirs: &[(&Path, ThemeSource)]) -> Vec<ThemeInfo> {
    let mut map: HashMap<String, ThemeInfo> = HashMap::new();
    for (dir, source) in dirs {
        if !dir.exists() {
            continue;
        }
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("css") {
                continue;
            }
            let name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("untitled")
                .to_string();
            if let Some(existing) = map.get(&name) {
                if source_priority(&existing.source) >= source_priority(source) {
                    continue;
                }
            }
            let id = format!("{:?}:{}", source, name);
            map.insert(
                name.clone(),
                ThemeInfo {
                    id,
                    name,
                    path: path.to_string_lossy().into(),
                    source: source.clone(),
                },
            );
        }
    }
    let mut list: Vec<_> = map.into_values().collect();
    list.sort_by(|a, b| a.name.cmp(&b.name));
    list
}

pub fn assert_path_allowed(path: &str, allowed_roots: &[&Path]) -> Result<PathBuf, String> {
    if path == BUILTIN_DEFAULT_PATH {
        return Ok(PathBuf::from(path));
    }

    let path = Path::new(path);
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("path not allowed: {e}"))?;

    for root in allowed_roots {
        if !root.exists() {
            continue;
        }
        let root_canon = root
            .canonicalize()
            .map_err(|e| format!("path not allowed: {e}"))?;
        if canonical.starts_with(&root_canon) {
            return Ok(canonical);
        }
    }

    Err("path not allowed".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn scans_css_and_prefers_app_over_editor() {
        let root = tempfile::tempdir().unwrap();
        let editor = root.path().join("editor");
        let app = root.path().join("app");
        fs::create_dir_all(&editor).unwrap();
        fs::create_dir_all(&app).unwrap();
        fs::write(editor.join("newsprint.css"), "/* t */").unwrap();
        fs::write(app.join("newsprint.css"), "/* a */").unwrap();
        fs::write(app.join("custom.css"), "/* c */").unwrap();

        let themes = scan_theme_dirs(&[
            (app.as_path(), ThemeSource::App),
            (editor.as_path(), ThemeSource::External),
        ]);

        let names: Vec<_> = themes.iter().map(|t| t.name.as_str()).collect();
        assert!(names.contains(&"newsprint"));
        assert!(names.contains(&"custom"));
        let newsprint = themes.iter().find(|t| t.name == "newsprint").unwrap();
        assert_eq!(newsprint.source, ThemeSource::App);
        assert_eq!(themes.iter().filter(|t| t.name == "newsprint").count(), 1);
    }

    #[test]
    fn rejects_path_outside_roots() {
        let err = assert_path_allowed("/tmp/evil.css", &[]).unwrap_err();
        assert!(err.contains("not allowed") || err.contains("不允许"));
    }

    #[test]
    fn prefers_bundled_over_editor_and_app_over_bundled() {
        let root = tempfile::tempdir().unwrap();
        let editor = root.path().join("editor");
        let bundled = root.path().join("bundled");
        let app = root.path().join("app");
        fs::create_dir_all(&editor).unwrap();
        fs::create_dir_all(&bundled).unwrap();
        fs::create_dir_all(&app).unwrap();
        fs::write(editor.join("night.css"), "/* t */").unwrap();
        fs::write(bundled.join("night.css"), "/* b */").unwrap();
        fs::write(bundled.join("github.css"), "/* g */").unwrap();
        fs::write(app.join("night.css"), "/* a */").unwrap();

        let themes = scan_theme_dirs(&[
            (editor.as_path(), ThemeSource::External),
            (bundled.as_path(), ThemeSource::Bundled),
            (app.as_path(), ThemeSource::App),
        ]);

        let night = themes.iter().find(|t| t.name == "night").unwrap();
        assert_eq!(night.source, ThemeSource::App);
        let github = themes.iter().find(|t| t.name == "github").unwrap();
        assert_eq!(github.source, ThemeSource::Bundled);
    }
}

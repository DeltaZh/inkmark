use std::fs;
use std::path::{Path, PathBuf};

use chrono::Local;

const ALLOWED_IMAGE_EXTS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "svg"];

fn normalize_image_ext(ext: &str) -> Result<String, String> {
    let ext = ext.trim().trim_start_matches('.').to_ascii_lowercase();
    if ext.is_empty() || !ALLOWED_IMAGE_EXTS.contains(&ext.as_str()) {
        return Err(format!("不支持的图片格式 .{ext}"));
    }
    Ok(ext)
}

/// 生成 `image-YYYYMMDDHHMMSS[{-N}].ext` 文件名；同秒冲突时追加 `-1`、`-2` …
fn unique_image_filename(assets_dir: &Path, ext: &str) -> String {
    let stamp = Local::now().format("%Y%m%d%H%M%S").to_string();
    let base = format!("image-{stamp}");
    let mut suffix = 0u32;
    loop {
        let filename = if suffix == 0 {
            format!("{base}.{ext}")
        } else {
            format!("{base}-{suffix}.{ext}")
        };
        if !assets_dir.join(&filename).exists() {
            return filename;
        }
        suffix += 1;
    }
}

/// 将图片写入文档同级 `assets/` 目录，返回相对路径（如 `assets/image-….png`）。
pub fn save_image_asset(doc_path: &Path, bytes: &[u8], ext: &str) -> Result<String, String> {
    let ext = normalize_image_ext(ext)?;
    let parent = doc_path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .ok_or_else(|| "无法解析文档所在目录".to_string())?;

    let assets_dir: PathBuf = parent.join("assets");
    fs::create_dir_all(&assets_dir).map_err(|e| format!("无法创建 assets 目录：{e}"))?;

    let filename = unique_image_filename(&assets_dir, &ext);
    let file_path = assets_dir.join(&filename);
    fs::write(&file_path, bytes).map_err(|e| format!("写入图片失败：{e}"))?;

    Ok(format!("assets/{filename}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn timestamp_stem(filename: &str) -> &str {
        filename
            .strip_prefix("image-")
            .unwrap()
            .split('.')
            .next()
            .unwrap()
    }

    #[test]
    fn asset_relative_path_under_assets() {
        let dir = tempfile::tempdir().unwrap();
        let doc = dir.path().join("note.md");
        fs::write(&doc, "").unwrap();
        let rel = save_image_asset(&doc, b"fake", "png").unwrap();
        assert!(rel.starts_with("assets/image-"));
        assert!(rel.ends_with(".png"));
        let stem = timestamp_stem(rel.strip_prefix("assets/").unwrap());
        let base = stem.split('-').next().unwrap();
        assert_eq!(base.len(), 14);
        assert!(base.chars().all(|c| c.is_ascii_digit()));
        assert!(dir.path().join(&rel).exists());
    }

    #[test]
    fn collision_appends_numeric_suffix() {
        let dir = tempfile::tempdir().unwrap();
        let doc = dir.path().join("note.md");
        fs::write(&doc, "").unwrap();
        let rel1 = save_image_asset(&doc, b"one", "png").unwrap();
        let rel2 = save_image_asset(&doc, b"two", "png").unwrap();
        assert_ne!(rel1, rel2);
        let stem1 = timestamp_stem(rel1.strip_prefix("assets/").unwrap());
        let stem2 = timestamp_stem(rel2.strip_prefix("assets/").unwrap());
        assert_eq!(stem2, format!("{stem1}-1"));
    }

    #[test]
    fn rejects_unsupported_image_ext() {
        let dir = tempfile::tempdir().unwrap();
        let doc = dir.path().join("note.md");
        fs::write(&doc, "").unwrap();
        let err = save_image_asset(&doc, b"x", "bmp").unwrap_err();
        assert!(err.contains("bmp"));
    }
}

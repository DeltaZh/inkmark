use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use super::files::ERR_CANCELLED;

fn err_cancelled(kind: &str) -> String {
    format!("{ERR_CANCELLED}{kind}")
}

#[derive(Debug, Serialize)]
pub struct ExportedFile {
    pub path: String,
}

fn path_to_string(path: PathBuf) -> Result<String, String> {
    path.into_os_string()
        .into_string()
        .map_err(|_| "文件路径包含无法识别的字符".to_string())
}

fn file_path_to_pathbuf(file: tauri_plugin_dialog::FilePath) -> Result<PathBuf, String> {
    file.into_path()
        .map_err(|e| format!("无法解析所选路径：{e}"))
}

fn ensure_extension(mut path: PathBuf, ext: &str) -> PathBuf {
    match path.extension().and_then(|e| e.to_str()) {
        Some(existing) if existing.eq_ignore_ascii_case(ext) => path,
        _ => {
            path.set_extension(ext);
            path
        }
    }
}

fn write_bytes(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| format!("无法创建目录：{e}"))?;
        }
    }
    fs::write(path, bytes).map_err(|e| format!("写入失败：{e}"))
}

/// 将二进制内容保存到用户所选路径（用于 docx 等前端生成格式）。
#[tauri::command]
pub async fn export_binary(
    handle: AppHandle,
    bytes: Vec<u8>,
    default_name: String,
    extension: String,
    filter_label: String,
) -> Result<ExportedFile, String> {
    let ext = extension.trim().trim_start_matches('.').to_ascii_lowercase();
    if ext.is_empty() {
        return Err("导出扩展名无效".to_string());
    }
    let name = if default_name.trim().is_empty() {
        format!("未命名.{ext}")
    } else if default_name.to_ascii_lowercase().ends_with(&format!(".{ext}")) {
        default_name
    } else {
        format!("{default_name}.{ext}")
    };

    let picked = handle
        .dialog()
        .file()
        .add_filter(&filter_label, &[&ext])
        .set_file_name(&name)
        .blocking_save_file();

    let Some(file) = picked else {
        return Err(err_cancelled("export-binary"));
    };

    let path = ensure_extension(file_path_to_pathbuf(file)?, &ext);
    let path_str = path_to_string(path.clone())?;
    write_bytes(&path, &bytes)?;
    Ok(ExportedFile { path: path_str })
}

/// 导出完整 HTML 文档到用户所选路径。
#[tauri::command]
pub async fn export_html(handle: AppHandle, html: String) -> Result<ExportedFile, String> {
    let picked = handle
        .dialog()
        .file()
        .add_filter("HTML", &["html", "htm"])
        .set_file_name("未命名.html")
        .blocking_save_file();

    let Some(file) = picked else {
        return Err(err_cancelled("export-html"));
    };

    let path = ensure_extension(file_path_to_pathbuf(file)?, "html");
    let path_str = path_to_string(path.clone())?;
    write_bytes(&path, html.as_bytes())?;
    Ok(ExportedFile { path: path_str })
}

/// 将 HTML 转为 PDF 并保存到用户所选路径。
///
/// 优先使用本机已安装的 Chrome / Edge / Chromium headless（`--print-to-pdf`）。
#[tauri::command]
pub async fn export_pdf(handle: AppHandle, html: String) -> Result<ExportedFile, String> {
    let browser = find_chromium_browser().ok_or_else(|| {
        "未找到可用的 Chrome / Edge / Chromium，无法导出 PDF。请安装 Google Chrome 或 Microsoft Edge 后重试。"
            .to_string()
    })?;

    let picked = handle
        .dialog()
        .file()
        .add_filter("PDF", &["pdf"])
        .set_file_name("未命名.pdf")
        .blocking_save_file();

    let Some(file) = picked else {
        return Err(err_cancelled("export-pdf"));
    };

    let pdf_path = ensure_extension(file_path_to_pathbuf(file)?, "pdf");
    let pdf_path_str = path_to_string(pdf_path.clone())?;

    let temp_dir = std::env::temp_dir().join(format!(
        "delta-ink-export-{}",
        std::process::id()
    ));
    fs::create_dir_all(&temp_dir).map_err(|e| format!("无法创建临时目录：{e}"))?;
    let html_path = temp_dir.join("export.html");

    let cleanup = || {
        let _ = fs::remove_file(&html_path);
        let _ = fs::remove_dir(&temp_dir);
    };

    if let Err(e) = write_bytes(&html_path, html.as_bytes()) {
        cleanup();
        return Err(e);
    }

    let result = html_to_pdf_with_browser(&browser, &html_path, &pdf_path);
    cleanup();
    result?;

    if !pdf_path.is_file() {
        return Err("PDF 导出失败：未生成输出文件".to_string());
    }

    Ok(ExportedFile {
        path: pdf_path_str,
    })
}

fn html_to_pdf_with_browser(
    browser: &Path,
    html_path: &Path,
    pdf_path: &Path,
) -> Result<(), String> {
    let html_url = path_to_file_url(html_path)?;
    let pdf_arg = format!(
        "--print-to-pdf={}",
        pdf_path
            .to_str()
            .ok_or_else(|| "PDF 路径包含无法识别的字符".to_string())?
    );

    let output = Command::new(browser)
        .arg("--headless=new")
        .arg("--disable-gpu")
        .arg("--no-pdf-header-footer")
        .arg("--allow-file-access-from-files")
        .arg(&pdf_arg)
        .arg(&html_url)
        .output()
        .map_err(|e| format!("启动浏览器导出 PDF 失败：{e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let detail = [stderr.trim(), stdout.trim()]
            .into_iter()
            .find(|s| !s.is_empty())
            .unwrap_or("未知错误");
        return Err(format!("PDF 导出失败：{detail}"));
    }

    Ok(())
}

fn path_to_file_url(path: &Path) -> Result<String, String> {
    let abs = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|e| format!("无法解析当前目录：{e}"))?
            .join(path)
    };

    #[cfg(windows)]
    {
        let raw = abs
            .to_str()
            .ok_or_else(|| "HTML 临时路径包含无法识别的字符".to_string())?
            .replace('\\', "/");
        // Windows: file:///C:/...
        if raw.starts_with('/') {
            Ok(format!("file://{raw}"))
        } else {
            Ok(format!("file:///{raw}"))
        }
    }

    #[cfg(not(windows))]
    {
        let raw = abs
            .to_str()
            .ok_or_else(|| "HTML 临时路径包含无法识别的字符".to_string())?;
        Ok(format!("file://{raw}"))
    }
}

fn find_chromium_browser() -> Option<PathBuf> {
    static CACHED: OnceLock<Option<PathBuf>> = OnceLock::new();
    CACHED
        .get_or_init(|| discover_chromium_browser())
        .clone()
}

fn discover_chromium_browser() -> Option<PathBuf> {
    for candidate in chromium_candidates() {
        if candidate.is_file() {
            return Some(candidate);
        }
    }

    for name in ["google-chrome", "chromium", "chromium-browser", "chrome", "msedge"] {
        if let Some(path) = which(name) {
            return Some(path);
        }
    }

    None
}

fn chromium_candidates() -> Vec<PathBuf> {
    let mut list = Vec::new();

    #[cfg(target_os = "macos")]
    {
        list.push(PathBuf::from(
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        ));
        list.push(PathBuf::from(
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ));
        list.push(PathBuf::from(
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ));
        if let Ok(home) = std::env::var("HOME") {
            list.push(
                PathBuf::from(&home)
                    .join("Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            );
            list.push(
                PathBuf::from(&home)
                    .join("Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
            );
        }
    }

    #[cfg(target_os = "windows")]
    {
        let local = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);
        let program_files = std::env::var_os("PROGRAMFILES").map(PathBuf::from);
        let program_files_x86 = std::env::var_os("PROGRAMFILES(X86)").map(PathBuf::from);

        for base in [program_files, program_files_x86, local].into_iter().flatten() {
            list.push(base.join("Google/Chrome/Application/chrome.exe"));
            list.push(base.join("Microsoft/Edge/Application/msedge.exe"));
            list.push(base.join("Chromium/Application/chrome.exe"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        list.push(PathBuf::from("/usr/bin/google-chrome"));
        list.push(PathBuf::from("/usr/bin/google-chrome-stable"));
        list.push(PathBuf::from("/usr/bin/chromium"));
        list.push(PathBuf::from("/usr/bin/chromium-browser"));
        list.push(PathBuf::from("/snap/bin/chromium"));
    }

    list
}

fn which(name: &str) -> Option<PathBuf> {
    let path_var = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path_var) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
        #[cfg(windows)]
        {
            let with_exe = dir.join(format!("{name}.exe"));
            if with_exe.is_file() {
                return Some(with_exe);
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ensure_extension_adds_when_missing() {
        let p = ensure_extension(PathBuf::from("/tmp/a"), "html");
        assert_eq!(p.extension().and_then(|e| e.to_str()), Some("html"));
    }

    #[test]
    fn ensure_extension_keeps_matching() {
        let p = ensure_extension(PathBuf::from("/tmp/a.HTML"), "html");
        assert_eq!(p.file_name().and_then(|n| n.to_str()), Some("a.HTML"));
    }

    #[test]
    fn path_to_file_url_is_file_scheme() {
        let url = path_to_file_url(Path::new("/tmp/export.html")).unwrap();
        assert!(url.starts_with("file://"));
        assert!(url.contains("export.html"));
    }
}

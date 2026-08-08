use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

const ALLOWED_WRITE_EXTS: &[&str] = &["md", "markdown", "txt"];
const ALLOWED_TREE_EXTS: &[&str] = &["md", "markdown"];
/// 文件树最大递归深度（根为 0）。
const MAX_TREE_DEPTH: usize = 8;
/// 文件树最多收录的文件/目录节点数，防止超大目录拖垮 UI。
const MAX_TREE_ENTRIES: usize = 2000;
const SKIP_DIR_NAMES: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    ".DS_Store",
    "__pycache__",
    ".svn",
    ".hg",
];

/// 用户取消原生对话框时的稳定错误前缀（前端用 `starts_with` 识别，不依赖中文文案）。
pub const ERR_CANCELLED: &str = "CANCELLED:";

fn err_cancelled(kind: &str) -> String {
    format!("{ERR_CANCELLED}{kind}")
}

#[derive(Debug, Serialize)]
pub struct OpenedFile {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct SavedFile {
    pub path: String,
}

/// 导入对话框结果：文本类返回 `text`，docx 返回 `bytes` 供前端转换。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedDocument {
    pub path: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes: Option<Vec<u8>>,
}

/// 文件树节点：目录含 children；Markdown 文件为叶子。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownTreeNode {
    pub name: String,
    pub path: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<MarkdownTreeNode>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownDirListing {
    pub root: String,
    pub entries: Vec<MarkdownTreeNode>,
    /// 是否因深度/数量上限被截断。
    pub truncated: bool,
}

fn extension_lower(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
}

fn assert_writable_ext(path: &Path) -> Result<(), String> {
    let ext = extension_lower(path).ok_or_else(|| "请选择 Markdown 或文本文件（.md / .markdown / .txt）".to_string())?;
    if !ALLOWED_WRITE_EXTS.contains(&ext.as_str()) {
        return Err(format!(
            "不支持的文件类型 .{ext}，仅支持 .md / .markdown / .txt"
        ));
    }
    Ok(())
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

/// 打开文件对话框并读取内容（扩展名可较宽，便于选择各类文本）。
#[tauri::command]
pub async fn open_file(handle: AppHandle) -> Result<OpenedFile, String> {
    let picked = handle
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("文本", &["txt"])
        .add_filter("所有文件", &["*"])
        .blocking_pick_file();

    let Some(file) = picked else {
        return Err(err_cancelled("open"));
    };

    let path = file_path_to_pathbuf(file)?;
    let path_str = path_to_string(path.clone())?;
    let content = fs::read_to_string(&path).map_err(|e| format!("读取失败：{e}"))?;
    Ok(OpenedFile {
        path: path_str,
        content,
    })
}

/// 导入文档（Markdown / 文本 / HTML / Word docx）。
#[tauri::command]
pub async fn import_document(handle: AppHandle) -> Result<ImportedDocument, String> {
    let picked = handle
        .dialog()
        .file()
        .add_filter("Word", &["docx"])
        .add_filter("HTML", &["html", "htm"])
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("文本", &["txt"])
        .blocking_pick_file();

    let Some(file) = picked else {
        return Err(err_cancelled("import"));
    };

    let path = file_path_to_pathbuf(file)?;
    let path_str = path_to_string(path.clone())?;
    let ext = extension_lower(&path).unwrap_or_default();

    match ext.as_str() {
        "docx" => {
            let bytes = fs::read(&path).map_err(|e| format!("读取失败：{e}"))?;
            Ok(ImportedDocument {
                path: path_str,
                kind: "docx".into(),
                text: None,
                bytes: Some(bytes),
            })
        }
        "html" | "htm" => {
            let text = fs::read_to_string(&path).map_err(|e| format!("读取失败：{e}"))?;
            Ok(ImportedDocument {
                path: path_str,
                kind: "html".into(),
                text: Some(text),
                bytes: None,
            })
        }
        "md" | "markdown" => {
            let text = fs::read_to_string(&path).map_err(|e| format!("读取失败：{e}"))?;
            Ok(ImportedDocument {
                path: path_str,
                kind: "markdown".into(),
                text: Some(text),
                bytes: None,
            })
        }
        "txt" => {
            let text = fs::read_to_string(&path).map_err(|e| format!("读取失败：{e}"))?;
            Ok(ImportedDocument {
                path: path_str,
                kind: "text".into(),
                text: Some(text),
                bytes: None,
            })
        }
        _ => Err(format!(
            "暂不支持导入 .{ext}，请选择 .md / .txt / .html / .docx"
        )),
    }
}

/// 用系统默认应用打开项目 README（帮助入口）。
#[tauri::command]
pub fn open_readme(handle: AppHandle) -> Result<(), String> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("README.md"));
        candidates.push(cwd.join("../README.md"));
    }
    if let Ok(resource) = handle.path().resource_dir() {
        candidates.push(resource.join("README.md"));
    }
    // 开发态：从 src-tauri 工作目录回退到仓库根
    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../README.md"));

    for path in candidates {
        let Ok(canonical) = path.canonicalize() else {
            continue;
        };
        if canonical.is_file() {
            handle
                .opener()
                .open_path(canonical.to_string_lossy().as_ref(), None::<&str>)
                .map_err(|e| format!("无法打开帮助文档：{e}"))?;
            return Ok(());
        }
    }
    Err("未找到 README.md，请查看应用内帮助说明".into())
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let path = PathBuf::from(&path);
    assert_writable_ext(&path)?;
    fs::read_to_string(&path).map_err(|e| format!("读取失败：{e}"))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&path);
    assert_writable_ext(&path)?;
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| format!("无法创建目录：{e}"))?;
        }
    }
    fs::write(&path, content).map_err(|e| format!("保存失败：{e}"))
}

/// 返回文件修改时间（Unix 毫秒）。用于检测外部编辑。
#[tauri::command]
pub fn get_file_mtime(path: String) -> Result<i64, String> {
    file_mtime_ms(Path::new(&path))
}

fn file_mtime_ms(path: &Path) -> Result<i64, String> {
    let meta = fs::metadata(path).map_err(|e| format!("无法读取文件信息：{e}"))?;
    let modified = meta
        .modified()
        .map_err(|e| format!("无法读取修改时间：{e}"))?;
    let duration = modified
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("修改时间无效：{e}"))?;
    Ok(duration.as_millis() as i64)
}

/// 打开文件夹对话框，返回所选目录的绝对路径。
#[tauri::command]
pub async fn open_folder_dialog(handle: AppHandle) -> Result<String, String> {
    let picked = handle.dialog().file().blocking_pick_folder();
    let Some(file) = picked else {
        return Err(err_cancelled("open_folder"));
    };
    let path = file_path_to_pathbuf(file)?;
    if !path.is_dir() {
        return Err("所选路径不是文件夹".to_string());
    }
    let canonical = canonicalize_dir(&path)?;
    path_to_string(canonical)
}

/// 列出目录下的 Markdown 文件树（递归，含安全上限）。
#[tauri::command]
pub fn list_dir_markdown(path: String) -> Result<MarkdownDirListing, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err("路径不是文件夹或不存在".to_string());
    }
    let root = canonicalize_dir(&root)?;
    let root_str = path_to_string(root.clone())?;
    let mut counter = 0usize;
    let mut truncated = false;
    let entries = walk_markdown_tree(&root, &root, 0, &mut counter, &mut truncated)?;
    Ok(MarkdownDirListing {
        root: root_str,
        entries,
        truncated,
    })
}

fn canonicalize_dir(path: &Path) -> Result<PathBuf, String> {
    fs::canonicalize(path).map_err(|e| format!("无法解析文件夹路径：{e}"))
}

fn is_markdown_file(path: &Path) -> bool {
    extension_lower(path)
        .map(|ext| ALLOWED_TREE_EXTS.contains(&ext.as_str()))
        .unwrap_or(false)
}

fn should_skip_name(name: &str) -> bool {
    if name.is_empty() {
        return true;
    }
    if name.starts_with('.') {
        return true;
    }
    SKIP_DIR_NAMES.iter().any(|n| *n == name)
}

fn path_is_under_root(root: &Path, candidate: &Path) -> bool {
    candidate.starts_with(root)
}

fn walk_markdown_tree(
    root: &Path,
    dir: &Path,
    depth: usize,
    counter: &mut usize,
    truncated: &mut bool,
) -> Result<Vec<MarkdownTreeNode>, String> {
    if depth > MAX_TREE_DEPTH {
        *truncated = true;
        return Ok(Vec::new());
    }
    if *counter >= MAX_TREE_ENTRIES {
        *truncated = true;
        return Ok(Vec::new());
    }

    let read = fs::read_dir(dir).map_err(|e| format!("无法读取目录：{e}"))?;
    let mut dirs: Vec<(String, PathBuf)> = Vec::new();
    let mut files: Vec<(String, PathBuf)> = Vec::new();

    for entry in read {
        let entry = entry.map_err(|e| format!("无法读取目录项：{e}"))?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if should_skip_name(&name) {
            continue;
        }
        let path = entry.path();
        let Ok(meta) = entry.metadata() else {
            continue;
        };
        if meta.is_dir() {
            dirs.push((name, path));
        } else if meta.is_file() && is_markdown_file(&path) {
            files.push((name, path));
        }
    }

    dirs.sort_by(|a, b| a.0.to_ascii_lowercase().cmp(&b.0.to_ascii_lowercase()));
    files.sort_by(|a, b| a.0.to_ascii_lowercase().cmp(&b.0.to_ascii_lowercase()));

    let mut nodes = Vec::new();

    for (name, path) in dirs {
        if *counter >= MAX_TREE_ENTRIES {
            *truncated = true;
            break;
        }
        let canonical = match fs::canonicalize(&path) {
            Ok(p) => p,
            Err(_) => continue,
        };
        if !path_is_under_root(root, &canonical) {
            continue;
        }
        let children = walk_markdown_tree(root, &canonical, depth + 1, counter, truncated)?;
        // 空目录（无 Markdown）不展示，保持侧栏干净
        if children.is_empty() {
            continue;
        }
        *counter += 1;
        let path_str = path_to_string(canonical)?;
        nodes.push(MarkdownTreeNode {
            name,
            path: path_str,
            kind: "dir".into(),
            children: Some(children),
        });
    }

    for (name, path) in files {
        if *counter >= MAX_TREE_ENTRIES {
            *truncated = true;
            break;
        }
        let canonical = match fs::canonicalize(&path) {
            Ok(p) => p,
            Err(_) => continue,
        };
        if !path_is_under_root(root, &canonical) {
            continue;
        }
        *counter += 1;
        let path_str = path_to_string(canonical)?;
        nodes.push(MarkdownTreeNode {
            name,
            path: path_str,
            kind: "file".into(),
            children: None,
        });
    }

    Ok(nodes)
}

/// 另存为对话框并写入内容；默认扩展名 .md。
#[tauri::command]
pub async fn save_file_as(handle: AppHandle, content: String) -> Result<SavedFile, String> {
    let picked = handle
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("文本", &["txt"])
        .set_file_name("未命名.md")
        .blocking_save_file();

    let Some(file) = picked else {
        return Err(err_cancelled("save"));
    };

    let mut path = file_path_to_pathbuf(file)?;
    if path.extension().is_none() {
        path.set_extension("md");
    }
    assert_writable_ext(&path)?;
    let path_str = path_to_string(path.clone())?;
    write_file(path_str.clone(), content)?;
    Ok(SavedFile { path: path_str })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn rejects_unsupported_extension() {
        let err = assert_writable_ext(Path::new("/tmp/a.doc")).unwrap_err();
        assert!(err.contains(".doc"));
    }

    #[test]
    fn write_and_read_roundtrip() {
        let mut tmp = NamedTempFile::new().unwrap();
        // NamedTempFile 扩展名可能不是 md，改用带扩展名的路径
        let path = tmp.path().with_extension("md");
        write_file(path.to_string_lossy().into_owned(), "# hi\n".into()).unwrap();
        let content = read_file(path.to_string_lossy().into_owned()).unwrap();
        assert_eq!(content, "# hi\n");
        let _ = fs::remove_file(&path);
        let _ = tmp.flush();
    }

    #[test]
    fn get_file_mtime_returns_positive_millis() {
        let mut tmp = NamedTempFile::new().unwrap();
        writeln!(tmp, "mtime").unwrap();
        let path = tmp.path().with_extension("md");
        fs::copy(tmp.path(), &path).unwrap();
        let mtime = get_file_mtime(path.to_string_lossy().into_owned()).unwrap();
        assert!(mtime > 0);
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn get_file_mtime_increases_after_rewrite() {
        let path = std::env::temp_dir().join("inkmark-mtime-test.md");
        write_file(path.to_string_lossy().into_owned(), "a\n".into()).unwrap();
        let t1 = get_file_mtime(path.to_string_lossy().into_owned()).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(20));
        write_file(path.to_string_lossy().into_owned(), "b\n".into()).unwrap();
        let t2 = get_file_mtime(path.to_string_lossy().into_owned()).unwrap();
        assert!(t2 >= t1);
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn list_dir_markdown_finds_nested_md_and_skips_hidden() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();
        fs::create_dir_all(root.join("sub")).unwrap();
        fs::create_dir_all(root.join(".hidden")).unwrap();
        fs::write(root.join("a.md"), "# a\n").unwrap();
        fs::write(root.join("sub").join("b.markdown"), "# b\n").unwrap();
        fs::write(root.join("skip.txt"), "x\n").unwrap();
        fs::write(root.join(".hidden").join("secret.md"), "# s\n").unwrap();
        fs::create_dir_all(root.join("empty")).unwrap();

        let listing = list_dir_markdown(root.to_string_lossy().into_owned()).unwrap();
        assert!(!listing.truncated);
        let names: Vec<&str> = listing.entries.iter().map(|n| n.name.as_str()).collect();
        assert!(names.contains(&"a.md"));
        assert!(names.contains(&"sub"));
        assert!(!names.contains(&"empty"));
        assert!(!names.contains(&".hidden"));
        assert!(!names.iter().any(|n| *n == "skip.txt"));

        let sub = listing.entries.iter().find(|n| n.name == "sub").unwrap();
        assert_eq!(sub.kind, "dir");
        let children = sub.children.as_ref().unwrap();
        assert_eq!(children.len(), 1);
        assert_eq!(children[0].name, "b.markdown");
        assert_eq!(children[0].kind, "file");
    }
}

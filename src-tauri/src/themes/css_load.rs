use std::fs;
use std::path::{Path, PathBuf};

/// 递归内联相对 `@import "…"`，并把相对 `url(…)` 转为 `file://` 绝对路径，
/// 以便注入 `<style>` 后仍能加载主题字体/图片。
pub fn load_theme_css_resolved(path: &Path) -> Result<String, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("无法读取主题：{e}"))?;
    let base = canonical
        .parent()
        .ok_or_else(|| "主题路径无效".to_string())?
        .to_path_buf();
    let raw = fs::read_to_string(&canonical).map_err(|e| e.to_string())?;
    let mut stack = vec![canonical];
    Ok(resolve_css(&raw, &base, &mut stack)?)
}

fn resolve_css(css: &str, base: &Path, stack: &mut Vec<PathBuf>) -> Result<String, String> {
    let mut out = String::with_capacity(css.len());
    let mut rest = css;

    while let Some(idx) = find_import(rest) {
        out.push_str(&rest[..idx.start]);
        let import_path = idx.path;
        let after = &rest[idx.end..];

        let resolved = base.join(&import_path);
        let canonical = match resolved.canonicalize() {
            Ok(p) => p,
            Err(_) => {
                // 找不到的 import 保留原句，避免整主题失败
                out.push_str(&rest[idx.start..idx.end]);
                rest = after;
                continue;
            }
        };

        if stack.iter().any(|p| p == &canonical) {
            rest = after;
            continue;
        }

        let imported = fs::read_to_string(&canonical).map_err(|e| e.to_string())?;
        let child_base = canonical
            .parent()
            .ok_or_else(|| "import 路径无效".to_string())?
            .to_path_buf();
        stack.push(canonical);
        let nested = resolve_css(&imported, &child_base, stack)?;
        stack.pop();
        out.push('\n');
        out.push_str(&nested);
        out.push('\n');
        rest = after;
    }

    out.push_str(rest);
    Ok(rewrite_relative_urls(&out, base))
}

struct ImportMatch {
    start: usize,
    end: usize,
    path: String,
}

fn find_import(css: &str) -> Option<ImportMatch> {
    let mut search_from = 0;
    while let Some(rel) = css[search_from..].to_ascii_lowercase().find("@import") {
        let start = search_from + rel;
        let after_kw = &css[start + 7..];
        let pad = after_kw.len() - after_kw.trim_start().len();
        let trimmed = after_kw.trim_start();
        let mut chars = trimmed.chars();
        let quote = chars.next()?;
        if quote != '"' && quote != '\'' {
            search_from = start + 7;
            continue;
        }
        let body = &trimmed[quote.len_utf8()..];
        let end_quote = body.find(quote)?;
        let path = body[..end_quote].trim().to_string();
        if path.starts_with("http://")
            || path.starts_with("https://")
            || path.starts_with("data:")
            || path.is_empty()
        {
            search_from = start + 7;
            continue;
        }
        let after_path = &body[end_quote + quote.len_utf8()..];
        let semi = after_path.find(';')?;
        let end = start
            + 7
            + pad
            + quote.len_utf8()
            + end_quote
            + quote.len_utf8()
            + semi
            + 1;
        return Some(ImportMatch { start, end, path });
    }
    None
}

fn rewrite_relative_urls(css: &str, base: &Path) -> String {
    let mut out = String::with_capacity(css.len());
    let bytes = css.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i..].starts_with(b"url(") {
            out.push_str("url(");
            i += 4;
            while i < bytes.len() && bytes[i].is_ascii_whitespace() {
                out.push(bytes[i] as char);
                i += 1;
            }
            let quote = if i < bytes.len() && (bytes[i] == b'"' || bytes[i] == b'\'') {
                let q = bytes[i];
                out.push(q as char);
                i += 1;
                Some(q)
            } else {
                None
            };
            let start = i;
            while i < bytes.len() {
                if let Some(q) = quote {
                    if bytes[i] == q {
                        break;
                    }
                } else if bytes[i] == b')' || bytes[i].is_ascii_whitespace() {
                    break;
                }
                i += 1;
            }
            let raw = &css[start..i];
            out.push_str(&rewrite_one_url(raw, base));
            continue;
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}

fn rewrite_one_url(raw: &str, base: &Path) -> String {
    let t = raw.trim();
    if t.starts_with("http://")
        || t.starts_with("https://")
        || t.starts_with("data:")
        || t.starts_with("file:")
        || t.starts_with("asset:")
        || t.starts_with('#')
    {
        return t.to_string();
    }
    let path = if let Some(rest) = t.strip_prefix("./") {
        base.join(rest)
    } else if t.starts_with("../") {
        base.join(t)
    } else if t.starts_with('/') {
        return t.to_string();
    } else {
        base.join(t)
    };
    match path.canonicalize() {
        Ok(abs) => {
            let s = abs.to_string_lossy();
            if cfg!(windows) {
                format!("file:///{}", s.replace('\\', "/"))
            } else if s.starts_with('/') {
                format!("file://{s}")
            } else {
                format!("file:///{s}")
            }
        }
        Err(_) => t.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn inlines_relative_import_and_rewrites_url() {
        let dir = tempfile::tempdir().unwrap();
        let sub = dir.path().join("night");
        fs::create_dir_all(&sub).unwrap();
        fs::write(sub.join("codeblock.dark.css"), "/* code */\n.pre{color:red}").unwrap();
        fs::write(sub.join("cursor.png"), [0u8; 4]).unwrap();
        fs::write(
            dir.path().join("night.css"),
            r#"@import "night/codeblock.dark.css";
:root { --bg-color: #111; }
@font-face { src: url('./night/cursor.png'); }
"#,
        )
        .unwrap();

        let css = load_theme_css_resolved(&dir.path().join("night.css")).unwrap();
        assert!(css.contains(".pre{color:red}"), "{css}");
        assert!(css.contains("--bg-color"));
        assert!(css.contains("file://"));
        assert!(!css.contains("@import"));
    }
}

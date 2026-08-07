use crate::settings::store;
use std::path::Path;
use tauri::{
    menu::{AboutMetadata, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    App, AppHandle, Emitter, Manager, Wry,
};

fn item(
    app: &AppHandle<Wry>,
    id: &str,
    title: &str,
    accelerator: Option<&str>,
) -> tauri::Result<tauri::menu::MenuItem<Wry>> {
    let mut b = MenuItemBuilder::with_id(id, title);
    if let Some(acc) = accelerator {
        b = b.accelerator(acc);
    }
    b.build(app)
}

fn load_recent_files(app: &AppHandle<Wry>) -> Vec<String> {
    let Ok(app_data) = app.path().app_data_dir() else {
        return Vec::new();
    };
    let path = store::settings_path(&app_data);
    store::load_from_path(&path)
        .map(|s| s.recent_files)
        .unwrap_or_default()
}

fn recent_display_name(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|s| s.to_str())
        .filter(|s| !s.is_empty())
        .unwrap_or(path)
        .to_string()
}

fn build_recent_submenu(
    app: &AppHandle<Wry>,
    recent: &[String],
) -> tauri::Result<tauri::menu::Submenu<Wry>> {
    let mut builder = SubmenuBuilder::new(app, "打开最近文件");
    if recent.is_empty() {
        let empty = MenuItemBuilder::with_id("recent-empty", "暂无最近文件")
            .enabled(false)
            .build(app)?;
        builder = builder.item(&empty);
    } else {
        for (index, path) in recent.iter().enumerate() {
            let id = format!("recent:{index}");
            let title = recent_display_name(path);
            let entry = MenuItemBuilder::with_id(id, title)
                .build(app)?;
            builder = builder.item(&entry);
        }
    }
    let clear = item(app, "clear-recent", "清除最近文件", None)?;
    builder.separator().item(&clear).build()
}

/// 按当前 settings 重建并安装菜单（可在保存 settings 后调用以刷新最近文件）。
pub fn rebuild(app: &AppHandle<Wry>) -> tauri::Result<()> {
    let recent = load_recent_files(app);

    // —— 文件 ——
    let new_item = item(app, "new", "新建", Some("CmdOrCtrl+N"))?;
    let open_item = item(app, "open", "打开…", Some("CmdOrCtrl+O"))?;
    let open_folder = item(app, "open-folder", "打开文件夹…", Some("CmdOrCtrl+Shift+O"))?;
    let open_quickly = item(app, "open-quickly", "快速打开…", Some("CmdOrCtrl+Shift+P"))?;
    let import_item = item(app, "import", "导入…", None)?;
    let recent_submenu = build_recent_submenu(app, &recent)?;
    let save_item = item(app, "save", "保存", Some("CmdOrCtrl+S"))?;
    let save_as_item = item(app, "save-as", "另存为…", Some("CmdOrCtrl+Shift+S"))?;
    let close_tab_item = item(app, "close-tab", "关闭", Some("CmdOrCtrl+W"))?;
    let export_html_item = item(app, "export-html", "导出为 HTML", None)?;
    let export_html_plain = item(app, "export-html-plain", "导出为 HTML（无样式）", None)?;
    let export_pdf_item = item(app, "export-pdf", "导出为 PDF", None)?;
    let export_docx_item = item(app, "export-docx", "导出为 Word (.docx)", None)?;
    let print_item = item(app, "print", "打印…", Some("CmdOrCtrl+P"))?;
    let settings_item = item(app, "settings", "偏好设置…", Some("CmdOrCtrl+,"))?;

    // —— 编辑 ——
    let undo = PredefinedMenuItem::undo(app, Some("撤销"))?;
    let redo = PredefinedMenuItem::redo(app, Some("重做"))?;
    let cut = PredefinedMenuItem::cut(app, Some("剪切"))?;
    let copy = PredefinedMenuItem::copy(app, Some("复制"))?;
    let paste = PredefinedMenuItem::paste(app, Some("粘贴"))?;
    // 不用系统 PredefinedMenuItem::select_all：WKWebView 会整篇 contenteditable 全选。
    // 改为自定义项，由前端按 编辑规则（单元格 / 代码块 / 正文）处理。
    let select_all = item(app, "select-all", "全选", Some("CmdOrCtrl+A"))?;
    let copy_md = item(app, "copy-markdown", "复制为 Markdown", Some("CmdOrCtrl+Shift+C"))?;
    let copy_html = item(app, "copy-html", "复制为 HTML 代码", None)?;
    let copy_word = item(app, "copy-word", "复制到 MS Word", None)?;
    let paste_plain = item(app, "paste-plain", "粘贴为纯文本", Some("CmdOrCtrl+Shift+V"))?;
    let smart_punct = item(app, "smart-punctuation", "智能标点", None)?;
    let find_item = item(app, "find", "查找", Some("CmdOrCtrl+F"))?;
    let replace_item = item(app, "replace", "替换", Some("CmdOrCtrl+H"))?;
    let jump_top = item(app, "jump-top", "跳转到文首", Some("CmdOrCtrl+Home"))?;
    let jump_bottom = item(app, "jump-bottom", "跳转到文末", Some("CmdOrCtrl+End"))?;
    let spell_check = item(app, "spell-check", "拼写检查", None)?;

    // —— 段落 ——
    let h1 = item(app, "heading-1", "一级标题", Some("CmdOrCtrl+1"))?;
    let h2 = item(app, "heading-2", "二级标题", Some("CmdOrCtrl+2"))?;
    let h3 = item(app, "heading-3", "三级标题", Some("CmdOrCtrl+3"))?;
    let h4 = item(app, "heading-4", "四级标题", Some("CmdOrCtrl+4"))?;
    let h5 = item(app, "heading-5", "五级标题", Some("CmdOrCtrl+5"))?;
    let h6 = item(app, "heading-6", "六级标题", Some("CmdOrCtrl+6"))?;
    let paragraph = item(app, "paragraph", "段落", Some("CmdOrCtrl+0"))?;
    let heading_inc = item(app, "heading-inc", "提高标题级别", Some("CmdOrCtrl+="))?;
    let heading_dec = item(app, "heading-dec", "降低标题级别", Some("CmdOrCtrl+-"))?;
    let quote = item(app, "quote", "引用", Some("CmdOrCtrl+Alt+Q"))?;
    let ordered = item(app, "ordered-list", "有序列表", Some("CmdOrCtrl+Alt+O"))?;
    let bullet = item(app, "bullet-list", "无序列表", Some("CmdOrCtrl+Alt+U"))?;
    let task = item(app, "task-list", "任务列表", None)?;
    let code_block = item(app, "code-block", "代码块", Some("CmdOrCtrl+Alt+C"))?;
    let math_block = item(app, "math-block", "公式块", Some("CmdOrCtrl+Alt+B"))?;
    let table = item(app, "insert-table", "表格", Some("CmdOrCtrl+Alt+T"))?;
    let toc = item(app, "insert-toc", "内容目录", None)?;
    let yaml = item(app, "insert-yaml", "YAML Front Matter", None)?;
    let footnote = item(app, "insert-footnote", "脚注", None)?;
    let hr = item(app, "horizontal-rule", "水平分割线", None)?;
    let indent = item(app, "indent", "增加缩进", Some("CmdOrCtrl+]"))?;
    let outdent = item(app, "outdent", "减少缩进", Some("CmdOrCtrl+["))?;

    // —— 格式 ——
    let bold = item(app, "bold", "加粗", Some("CmdOrCtrl+B"))?;
    let italic = item(app, "italic", "斜体", Some("CmdOrCtrl+I"))?;
    let underline = item(app, "underline", "下划线", Some("CmdOrCtrl+U"))?;
    let code = item(app, "code", "代码", Some("CmdOrCtrl+Shift+`"))?;
    let strike = item(app, "strike", "删除线", None)?;
    let highlight = item(app, "highlight", "高亮", None)?;
    let subscript = item(app, "subscript", "下标", None)?;
    let superscript = item(app, "superscript", "上标", None)?;
    let math_inline = item(app, "math-inline", "内联公式", None)?;
    let link = item(app, "link", "超链接", Some("CmdOrCtrl+K"))?;
    let image = item(app, "image", "图像", None)?;
    let clear_fmt = item(app, "clear-format", "清除样式", Some("CmdOrCtrl+\\"))?;

    // —— 视图 ——
    let outline = item(app, "toggle-outline", "大纲", None)?;
    let file_tree = item(app, "toggle-file-tree", "文件树", None)?;
    let theme_item = item(app, "theme", "主题…", None)?;
    let source_mode = item(
        app,
        "source-mode",
        "切换源代码 / 所见即所得",
        Some("CmdOrCtrl+/"),
    )?;
    let focus_mode = item(app, "focus-mode", "专注模式", None)?;
    let typewriter = item(app, "typewriter-mode", "打字机模式", None)?;

    // —— 窗口 ——
    let always_on_top = item(app, "always-on-top", "保持窗口在最前端", None)?;

    let app_submenu = SubmenuBuilder::new(app, "delta-ink")
        .about(Some(AboutMetadata {
            ..Default::default()
        }))
        .separator()
        .item(&settings_item)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .quit()
        .build()?;

    let export_submenu = SubmenuBuilder::new(app, "导出")
        .item(&export_html_item)
        .item(&export_html_plain)
        .item(&export_pdf_item)
        .item(&export_docx_item)
        .build()?;

    let file_submenu = SubmenuBuilder::new(app, "文件")
        .item(&new_item)
        .item(&open_item)
        .item(&open_folder)
        .item(&open_quickly)
        .item(&import_item)
        .item(&recent_submenu)
        .separator()
        .item(&save_item)
        .item(&save_as_item)
        .separator()
        .item(&export_submenu)
        .item(&print_item)
        .separator()
        .item(&close_tab_item)
        .build()?;

    let edit_submenu = SubmenuBuilder::new(app, "编辑")
        .item(&undo)
        .item(&redo)
        .separator()
        .item(&cut)
        .item(&copy)
        .item(&paste)
        .item(&copy_md)
        .item(&copy_html)
        .item(&copy_word)
        .item(&paste_plain)
        .item(&smart_punct)
        .separator()
        .item(&select_all)
        .separator()
        .item(&find_item)
        .item(&replace_item)
        .separator()
        .item(&spell_check)
        .separator()
        .item(&jump_top)
        .item(&jump_bottom)
        .build()?;

    let paragraph_submenu = SubmenuBuilder::new(app, "段落")
        .item(&h1)
        .item(&h2)
        .item(&h3)
        .item(&h4)
        .item(&h5)
        .item(&h6)
        .item(&paragraph)
        .separator()
        .item(&heading_inc)
        .item(&heading_dec)
        .separator()
        .item(&quote)
        .item(&ordered)
        .item(&bullet)
        .item(&task)
        .separator()
        .item(&code_block)
        .item(&math_block)
        .item(&table)
        .item(&toc)
        .item(&yaml)
        .item(&footnote)
        .separator()
        .item(&hr)
        .separator()
        .item(&indent)
        .item(&outdent)
        .build()?;

    let format_submenu = SubmenuBuilder::new(app, "格式")
        .item(&bold)
        .item(&italic)
        .item(&underline)
        .item(&code)
        .item(&strike)
        .item(&highlight)
        .item(&subscript)
        .item(&superscript)
        .item(&math_inline)
        .separator()
        .item(&link)
        .item(&image)
        .separator()
        .item(&clear_fmt)
        .build()?;

    let view_submenu = SubmenuBuilder::new(app, "视图")
        .item(&outline)
        .item(&file_tree)
        .item(&source_mode)
        .separator()
        .item(&focus_mode)
        .item(&typewriter)
        .separator()
        .item(&theme_item)
        .build()?;

    let window_submenu = SubmenuBuilder::new(app, "窗口")
        .minimize()
        .maximize()
        .separator()
        .item(&always_on_top)
        .separator()
        .fullscreen()
        .build()?;

    let help_item = item(app, "help", "delta-ink 帮助", None)?;
    let help_readme = item(app, "help-readme", "打开 README…", None)?;
    let help_submenu = SubmenuBuilder::new(app, "帮助")
        .item(&help_item)
        .item(&help_readme)
        .build()?;

    let menu = MenuBuilder::new(app)
        .items(&[
            &app_submenu,
            &file_submenu,
            &edit_submenu,
            &paragraph_submenu,
            &format_submenu,
            &view_submenu,
            &window_submenu,
            &help_submenu,
        ])
        .build()?;

    app.set_menu(menu)?;
    Ok(())
}

fn emit_menu_event(app: &AppHandle<Wry>, id: &str) {
    if id.starts_with("unsupported-") {
        let _ = app.emit("menu://unsupported", id);
        return;
    }
    if id == "recent-empty" {
        return;
    }
    // 动态最近项：id = recent:{index}，payload 带绝对路径
    if let Some(index_str) = id.strip_prefix("recent:") {
        if let Ok(index) = index_str.parse::<usize>() {
            let recent = load_recent_files(app);
            if let Some(path) = recent.get(index) {
                let _ = app.emit("menu://open-recent", path.clone());
            }
        }
        return;
    }
    let event_name = format!("menu://{id}");
    let _ = app.emit(event_name.as_str(), id);
}

/// 安装对齐常见所见即所得习惯 中文菜单结构的 macOS 菜单，并注册一次性事件处理。
pub fn install(app: &App<Wry>) -> tauri::Result<()> {
    let handle = app.handle().clone();
    rebuild(&handle)?;

    app.on_menu_event(|app, event| {
        let id = event.id().as_ref();
        emit_menu_event(app, id);
        if let Some(win) = app.get_webview_window("main") {
            let _ = win.set_focus();
        }
    });

    Ok(())
}

/// 供命令侧在 settings 变更后刷新菜单（忽略错误以免阻断保存）。
pub fn refresh_after_settings_change(app: &AppHandle<Wry>) {
    let _ = rebuild(app);
}

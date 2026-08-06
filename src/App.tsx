import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { listen } from '@tauri-apps/api/event';
import { Editor } from './editor/Editor';
import { OutlineSidebar } from './components/OutlineSidebar';
import { ThemePicker } from './components/ThemePicker';
import { SettingsDialog } from './components/SettingsDialog';
import { TabBar } from './components/TabBar';
import { StatusBar } from './components/StatusBar';
import { FindReplaceBar } from './components/FindReplaceBar';
import { TableInsertDialog } from './components/TableInsertDialog';
import { FileTreeSidebar } from './components/FileTreeSidebar';
import { HelpDialog } from './components/HelpDialog';
import { OpenQuickDialog } from './components/OpenQuickDialog';
import type { Settings } from './ipc/settings';
import type { ThemeInfo } from './ipc/themes';
import { listThemes } from './ipc/themes';
import {
  formatFileError,
  getFileMtime,
  importDocument,
  isUserCancelled,
  listDirMarkdown,
  openFile,
  openFolderDialog,
  openReadme,
  readFile,
  saveFileAs,
  writeFile
} from './ipc/files';
import { exportBinary, exportHtml, exportPdf } from './ipc/export';
import {
  applyBuiltinFallbackCss,
  loadAndApplyTheme,
} from './lib/themes/loadTheme';
import {
  buildExportHtmlDocument,
  collectWriteHtml,
} from './lib/exportDocument';
import { markdownToDocxBytes } from './lib/exportDocx';
import { docxBytesToMarkdown, htmlToMarkdownRough } from './lib/importDocument';
import { printHtmlDocument } from './lib/printDocument';
import { copyHtmlForWord } from './lib/copyToWord';
import {
  collectFilePathsFromTree,
  mergeQuickOpenSources,
  type QuickOpenEntry,
} from './lib/openQuickly';
import { buildMarkdownTable } from './lib/insertMarkdownTable';
import { shouldPromptExternalChange } from './lib/externalFileChange';
import { resolveAppKeyboardAction } from './lib/appKeyboardShortcuts';
import { isTauri } from './lib/isTauri';
import { MENU_EVENT } from './lib/menuEvents';
import {
  runEditorSelectAll,
  selectActiveNativeField,
} from './editor/editorSelectAll';
import {
  copyAsMarkdown,
  decreaseHeadingLevel,
  increaseHeadingLevel,
  promptLink,
  runHeading,
  runParagraph,
} from './lib/editorCommands';
import {
  toggleFocusMode,
  toggleTypewriterMode,
} from './editor/viewModes';
import { toggleSmartPunctuation } from './editor/smartPunctuation';
import { pushRecentFile } from './lib/recentFiles';
import {
  getCachedSettings,
  loadSettings,
  patchSettings,
  saveSettings,
} from './state/settingsStore';
import { useTabs } from './state/tabsStore';
import type { OutlineItem } from './lib/outline';
import './styles/app.css';

const INITIAL_MARKDOWN = `# Hello

开始用所见即所得方式书写 Markdown。

- 列表项
- 另一项

- [ ] 待办事项
- [x] 已完成

\`\`\`ts
const x = 1;
\`\`\`

~~~json
{ "ok": true }
~~~

~~删除线~~ 与 **粗体** *斜体*
`;

function App() {
  const {
    state: tabsState,
    activeTab,
    createTab,
    closeTab,
    setActive,
    updateMarkdown,
    markSaved,
    reloadContent,
  } = useTabs(INITIAL_MARKDOWN);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedName, setSelectedName] = useState('github');
  const [themeError, setThemeError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'outline' | 'files'>('outline');
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [folderRoot, setFolderRoot] = useState<string | null>(null);
  const [folderRefreshToken, setFolderRefreshToken] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [spellCheck, setSpellCheck] = useState(true);
  const [openQuickOpen, setOpenQuickOpen] = useState(false);
  const [quickEntries, setQuickEntries] = useState<QuickOpenEntry[]>([]);

  const sidebarOpenRef = useRef(sidebarOpen);
  sidebarOpenRef.current = sidebarOpen;
  const sidebarTabRef = useRef(sidebarTab);
  sidebarTabRef.current = sidebarTab;

  const activeMarkdownRef = useRef(activeTab?.markdown ?? '');
  activeMarkdownRef.current = activeTab?.markdown ?? '';

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const editorRef = useRef<TiptapEditor | null>(null);
  editorRef.current = editorInstance;

  /** path → 上次已知 mtime（毫秒） */
  const mtimeByPathRef = useRef<Map<string, number>>(new Map());
  const externalPromptBusyRef = useRef(false);

  const rememberMtime = useCallback(async (path: string) => {
    try {
      const mtime = await getFileMtime(path);
      mtimeByPathRef.current.set(path, mtime);
    } catch {
      // 忽略：无路径或文件暂不可读
    }
  }, []);

  const handleThemeError = useCallback((message: string | null) => {
    setThemeError(message);
  }, []);

  const handleMarkdownChange = useCallback(
    (md: string) => {
      if (!activeTab) return;
      activeMarkdownRef.current = md;
      updateMarkdown(activeTab.id, md);
    },
    [activeTab, updateMarkdown],
  );

  const handleEditorReady = useCallback((editor: TiptapEditor) => {
    setEditorInstance(editor);
  }, []);

  const handleOutlineChange = useCallback((items: OutlineItem[]) => {
    setOutlineItems(items);
  }, []);

  useEffect(() => {
    setEditorInstance(null);
    setOutlineItems([]);
  }, [activeTab?.id]);

  const rememberRecentFile = useCallback(async (path: string) => {
    try {
      const current = getCachedSettings() ?? (await loadSettings());
      const next = await patchSettings({
        recentFiles: pushRecentFile(current.recentFiles ?? [], path),
      });
      setSettings(next);
    } catch {
      // 记忆失败不阻断打开/保存
    }
  }, []);

  const clearRecentFiles = useCallback(async () => {
    try {
      const next = await patchSettings({ recentFiles: [] });
      setSettings(next);
      setStatusMessage('已清除最近文件');
    } catch (e) {
      setFileError(formatFileError(e));
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    const markdown = activeMarkdownRef.current;
    try {
      if (activeTab.path) {
        await writeFile(activeTab.path, markdown);
        markSaved(activeTab.id, activeTab.path);
        await rememberMtime(activeTab.path);
        await rememberRecentFile(activeTab.path);
        setStatusMessage('已保存');
        setFileError(null);
        return;
      }
      const saved = await saveFileAs(markdown);
      markSaved(activeTab.id, saved.path);
      await rememberMtime(saved.path);
      await rememberRecentFile(saved.path);
      setStatusMessage('已保存');
      setFileError(null);
    } catch (e) {
      if (isUserCancelled(e)) return;
      setFileError(formatFileError(e));
    }
  }, [activeTab, markSaved, rememberMtime, rememberRecentFile]);

  const handleSaveAs = useCallback(async () => {
    if (!activeTab) return;
    const markdown = activeMarkdownRef.current;
    try {
      const saved = await saveFileAs(markdown);
      markSaved(activeTab.id, saved.path);
      await rememberMtime(saved.path);
      await rememberRecentFile(saved.path);
      setStatusMessage('已另存为');
      setFileError(null);
    } catch (e) {
      if (isUserCancelled(e)) return;
      setFileError(formatFileError(e));
    }
  }, [activeTab, markSaved, rememberMtime, rememberRecentFile]);

  const handleOpen = useCallback(async () => {
    try {
      const opened = await openFile();
      createTab({
        markdown: opened.content,
        path: opened.path,
      });
      await rememberMtime(opened.path);
      await rememberRecentFile(opened.path);
      setStatusMessage('已打开');
      setFileError(null);
    } catch (e) {
      if (isUserCancelled(e)) return;
      setFileError(formatFileError(e));
    }
  }, [createTab, rememberMtime, rememberRecentFile]);

  const persistLastFolder = useCallback(async (path: string) => {
    try {
      const next = await patchSettings({ lastFolder: path });
      setSettings(next);
    } catch {
      // 记忆失败不阻断打开文件夹
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    try {
      const path = await openFolderDialog();
      setSidebarOpen(true);
      setSidebarTab('files');
      setFolderRoot(path);
      setFolderRefreshToken((n) => n + 1);
      await persistLastFolder(path);
      setStatusMessage('已打开文件夹');
      setFileError(null);
    } catch (e) {
      if (isUserCancelled(e)) return;
      setFileError(formatFileError(e));
    }
  }, [persistLastFolder]);

  const handleOpenPath = useCallback(
    async (path: string) => {
      try {
        const existing = tabsState.tabs.find((t) => t.path === path);
        if (existing) {
          setActive(existing.id);
          await rememberRecentFile(path);
          setStatusMessage('已切换到已打开文件');
          return;
        }
        const content = await readFile(path);
        createTab({ markdown: content, path });
        await rememberMtime(path);
        await rememberRecentFile(path);
        setStatusMessage('已打开');
        setFileError(null);
      } catch (e) {
        setFileError(formatFileError(e));
      }
    },
    [createTab, rememberMtime, rememberRecentFile, setActive, tabsState.tabs],
  );

  const toggleOutlinePane = useCallback(() => {
    if (sidebarOpenRef.current && sidebarTabRef.current === 'outline') {
      setSidebarOpen(false);
    } else {
      setSidebarTab('outline');
      setSidebarOpen(true);
    }
  }, []);

  const toggleFileTreePane = useCallback(() => {
    if (sidebarOpenRef.current && sidebarTabRef.current === 'files') {
      setSidebarOpen(false);
    } else {
      setSidebarTab('files');
      setSidebarOpen(true);
    }
  }, []);

  const buildCurrentExportHtml = useCallback(() => {
    if (!editorRef.current) {
      throw new Error('编辑器尚未就绪，无法导出');
    }
    const title = activeTabRef.current?.title?.trim() || '未命名';
    return buildExportHtmlDocument({ title });
  }, []);

  const handleExportHtml = useCallback(async () => {
    try {
      const html = buildCurrentExportHtml();
      await exportHtml(html);
      setStatusMessage('已导出 HTML');
      setFileError(null);
    } catch (e) {
      if (isUserCancelled(e)) return;
      setFileError(formatFileError(e));
    }
  }, [buildCurrentExportHtml]);

  const handleExportHtmlPlain = useCallback(async () => {
    try {
      if (!editorRef.current) {
        throw new Error('编辑器尚未就绪，无法导出');
      }
      const title = activeTabRef.current?.title?.trim() || '未命名';
      const html = buildExportHtmlDocument({ title, includeStyles: false });
      await exportHtml(html);
      setStatusMessage('已导出 HTML（无样式）');
      setFileError(null);
    } catch (e) {
      if (isUserCancelled(e)) return;
      setFileError(formatFileError(e));
    }
  }, []);

  const handleCopyWord = useCallback(() => {
    void (async () => {
      try {
        if (!editorRef.current) {
          setStatusMessage('请先聚焦编辑器');
          return;
        }
        await copyHtmlForWord(collectWriteHtml());
        setStatusMessage('已复制，可粘贴到 Word');
        setFileError(null);
      } catch (e) {
        setFileError(formatFileError(e));
      }
    })();
  }, []);

  const handleOpenQuickly = useCallback(async () => {
    try {
      const recent = settings?.recentFiles ?? [];
      let treePaths: string[] = [];
      if (folderRoot) {
        const listing = await listDirMarkdown(folderRoot);
        treePaths = collectFilePathsFromTree(listing.entries);
      }
      setQuickEntries(mergeQuickOpenSources(recent, treePaths));
      setOpenQuickOpen(true);
      setFileError(null);
    } catch (e) {
      setFileError(formatFileError(e));
    }
  }, [folderRoot, settings?.recentFiles]);

  const handleExportPdf = useCallback(async () => {
    try {
      const html = buildCurrentExportHtml();
      await exportPdf(html);
      setStatusMessage('已导出 PDF');
      setFileError(null);
    } catch (e) {
      if (isUserCancelled(e)) return;
      setFileError(formatFileError(e));
    }
  }, [buildCurrentExportHtml]);

  const handleExportDocx = useCallback(async () => {
    try {
      const md = activeMarkdownRef.current;
      const bytes = await markdownToDocxBytes(md);
      const title = activeTabRef.current?.title?.trim() || '未命名';
      await exportBinary(bytes, title, 'docx', 'Word 文档');
      setStatusMessage('已导出 Word');
      setFileError(null);
    } catch (e) {
      if (isUserCancelled(e)) return;
      setFileError(formatFileError(e));
    }
  }, []);

  const handleImport = useCallback(async () => {
    try {
      const doc = await importDocument();
      let markdown = '';
      if (doc.kind === 'docx') {
        if (!doc.bytes?.length) {
          throw new Error('Word 文件内容为空');
        }
        markdown = await docxBytesToMarkdown(doc.bytes);
        createTab({ markdown });
        setStatusMessage('已导入 Word');
      } else if (doc.kind === 'html') {
        markdown = htmlToMarkdownRough(doc.text ?? '');
        createTab({ markdown });
        setStatusMessage('已导入 HTML');
      } else if (doc.kind === 'markdown') {
        markdown = doc.text ?? '';
        createTab({ markdown, path: doc.path });
        await rememberMtime(doc.path);
        await rememberRecentFile(doc.path);
        setStatusMessage('已导入 Markdown');
      } else {
        markdown = doc.text ?? '';
        createTab({ markdown });
        setStatusMessage('已导入文本');
      }
      setFileError(null);
    } catch (e) {
      if (isUserCancelled(e)) return;
      setFileError(formatFileError(e));
    }
  }, [createTab, rememberMtime, rememberRecentFile]);

  const handlePrint = useCallback(() => {
    try {
      const html = buildCurrentExportHtml();
      printHtmlDocument(html);
      setStatusMessage('已打开打印');
      setFileError(null);
    } catch (e) {
      setFileError(formatFileError(e));
    }
  }, [buildCurrentExportHtml]);

  const handleToggleSpellCheck = useCallback(() => {
    void (async () => {
      const next = !spellCheck;
      setSpellCheck(next);
      try {
        const saved = await patchSettings({ spellCheck: next });
        setSettings(saved);
        setStatusMessage(next ? '已开启拼写检查' : '已关闭拼写检查');
      } catch (e) {
        setSpellCheck(!next);
        setFileError(formatFileError(e));
      }
    })();
  }, [spellCheck]);

  const handleOpenReadme = useCallback(async () => {
    try {
      await openReadme();
      setStatusMessage('已打开 README');
      setFileError(null);
    } catch (e) {
      setFileError(formatFileError(e));
    }
  }, []);

  const handleCloseTab = useCallback(
    (id: string) => {
      const tab = tabsState.tabs.find((t) => t.id === id);
      if (tab?.dirty) {
        const ok = window.confirm(
          `「${tab.title}」有未保存的更改，确定关闭吗？`,
        );
        if (!ok) return;
      }
      if (tab?.path) {
        mtimeByPathRef.current.delete(tab.path);
      }
      closeTab(id);
    },
    [tabsState.tabs, closeTab],
  );

  const handleCloseActiveTab = useCallback(() => {
    if (!activeTab) return;
    handleCloseTab(activeTab.id);
  }, [activeTab, handleCloseTab]);

  const checkExternalChange = useCallback(async () => {
    const tab = activeTabRef.current;
    if (!tab?.path || externalPromptBusyRef.current) return;

    try {
      const diskMtime = await getFileMtime(tab.path);
      const known = mtimeByPathRef.current.get(tab.path) ?? null;
      if (!shouldPromptExternalChange(known, diskMtime, tab.dirty)) {
        if (known == null) {
          mtimeByPathRef.current.set(tab.path, diskMtime);
        }
        return;
      }

      externalPromptBusyRef.current = true;
      const reload = window.confirm(
        `文件「${tab.title}」已在外部被修改。\n\n确定：重新加载磁盘版本\n取消：保留当前编辑内容`,
      );
      if (reload) {
        try {
          const content = await readFile(tab.path);
          reloadContent(tab.id, content);
          activeMarkdownRef.current = content;
          mtimeByPathRef.current.set(tab.path, diskMtime);
          setStatusMessage('已重新加载');
          setFileError(null);
        } catch (e) {
          setFileError(formatFileError(e));
        }
      } else {
        // 保留内存版本：抬高已知 mtime，避免每次聚焦重复弹窗
        mtimeByPathRef.current.set(tab.path, diskMtime);
        setStatusMessage('已保留当前内容');
      }
    } catch {
      // 文件可能已删除，静默跳过
    } finally {
      externalPromptBusyRef.current = false;
    }
  }, [reloadContent]);

  useEffect(() => {
    const onFocus = () => {
      void checkExternalChange();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [checkExternalChange]);

  /** 原生菜单回调里需延迟打开对话框，否则 macOS 菜单关闭时常吃掉同步 setState */
  const openTableInsertDialog = useCallback(() => {
    window.setTimeout(() => {
      setTableDialogOpen(true);
      setStatusMessage('选择表格大小');
    }, 0);
  }, []);

  const handleConfirmTableInsert = useCallback(
    (rows: number, cols: number) => {
      if (sourceMode) {
        const block = buildMarkdownTable(rows, cols);
        const tab = activeTabRef.current;
        if (!tab) {
          setStatusMessage('请先打开文档');
          return;
        }
        handleMarkdownChange(`${tab.markdown.trimEnd()}\n\n${block}`);
        setStatusMessage(`已插入 ${rows}×${cols} 表格`);
        return;
      }

      const ed = editorRef.current;
      if (!ed) {
        setStatusMessage('请先聚焦编辑器');
        return;
      }

      const tryInsert = () =>
        ed
          .chain()
          .focus()
          .insertTable({ rows, cols, withHeaderRow: true })
          .run();

      let ok = tryInsert();
      if (!ok && ed.isActive('codeBlock')) {
        ed.chain().focus().toggleCodeBlock().run();
        ok = tryInsert();
      }
      if (
        !ok &&
        (ed.isActive('bulletList') ||
          ed.isActive('orderedList') ||
          ed.isActive('taskList'))
      ) {
        ed.chain().focus().liftListItem('listItem').run();
        ok = tryInsert();
      }
      if (!ok) {
        ed.chain().focus().clearNodes().setParagraph().run();
        ok = tryInsert();
      }
      if (!ok) {
        setStatusMessage('当前位置无法插入表格，请换到正文段落后再试');
        return;
      }
      setStatusMessage(`已插入 ${rows}×${cols} 表格`);
    },
    [sourceMode, handleMarkdownChange],
  );

  // 菜单处理器走 ref：渲染时更新，监听只挂一次，避免反复 listen/unlisten 丢点击
  const menuHandlerMapRef = useRef<
    Partial<Record<string, (payload?: unknown) => void>>
  >({});

  const withEditor = useCallback((fn: (ed: TiptapEditor) => void) => {
    const ed = editorRef.current;
    if (!ed) {
      setStatusMessage('请先聚焦编辑器');
      return;
    }
    fn(ed);
  }, []);

  menuHandlerMapRef.current = {
    [MENU_EVENT.new]: () => createTab({ markdown: '' }),
    [MENU_EVENT.open]: () => void handleOpen(),
    [MENU_EVENT.openFolder]: () => void handleOpenFolder(),
    [MENU_EVENT.import]: () => void handleImport(),
    [MENU_EVENT.openQuickly]: () => void handleOpenQuickly(),
    [MENU_EVENT.openRecent]: (payload) => {
      if (typeof payload === 'string' && payload.trim()) {
        void handleOpenPath(payload);
      }
    },
    [MENU_EVENT.clearRecent]: () => void clearRecentFiles(),
    [MENU_EVENT.toggleFileTree]: () => toggleFileTreePane(),
    [MENU_EVENT.save]: () => void handleSave(),
    [MENU_EVENT.saveAs]: () => void handleSaveAs(),
    [MENU_EVENT.closeTab]: () => handleCloseActiveTab(),
    [MENU_EVENT.exportHtml]: () => void handleExportHtml(),
    [MENU_EVENT.exportHtmlPlain]: () => void handleExportHtmlPlain(),
    [MENU_EVENT.exportPdf]: () => void handleExportPdf(),
    [MENU_EVENT.exportDocx]: () => void handleExportDocx(),
    [MENU_EVENT.print]: () => handlePrint(),
    [MENU_EVENT.spellCheck]: () => handleToggleSpellCheck(),
    [MENU_EVENT.help]: () => setHelpOpen(true),
    [MENU_EVENT.helpReadme]: () => void handleOpenReadme(),
    [MENU_EVENT.copyWord]: () => handleCopyWord(),
    [MENU_EVENT.insertTable]: () => openTableInsertDialog(),
    [MENU_EVENT.mathBlock]: () =>
      withEditor((ed) => ed.chain().focus().insertMathBlock('').run()),
    [MENU_EVENT.mathInline]: () =>
      withEditor((ed) => ed.chain().focus().insertMathInline('').run()),
    [MENU_EVENT.insertToc]: () =>
      withEditor((ed) => ed.chain().focus().insertToc().run()),
    [MENU_EVENT.insertYaml]: () =>
      withEditor((ed) =>
        ed.chain().focus().insertYamlFrontMatter('title: \n').run(),
      ),
    [MENU_EVENT.insertFootnote]: () =>
      withEditor((ed) => ed.chain().focus().insertFootnote().run()),
    [MENU_EVENT.highlight]: () =>
      withEditor((ed) => ed.chain().focus().toggleHighlight().run()),
    [MENU_EVENT.subscript]: () =>
      withEditor((ed) => ed.chain().focus().toggleSubscript().run()),
    [MENU_EVENT.superscript]: () =>
      withEditor((ed) => ed.chain().focus().toggleSuperscript().run()),
    [MENU_EVENT.copyHtml]: () => {
      const html = editorRef.current?.getHTML() ?? '';
      void navigator.clipboard.writeText(html).then(() =>
        setStatusMessage('已复制为 HTML'),
      );
    },
    [MENU_EVENT.jumpTop]: () =>
      withEditor((ed) => {
        ed.chain().focus().setTextSelection(1).run();
        ed.view.dom.scrollIntoView({ block: 'start' });
      }),
    [MENU_EVENT.jumpBottom]: () =>
      withEditor((ed) => {
        const end = ed.state.doc.content.size;
        ed.chain().focus().setTextSelection(end).run();
      }),
    [MENU_EVENT.indent]: () =>
      withEditor((ed) => ed.chain().focus().sinkListItem('listItem').run()),
    [MENU_EVENT.outdent]: () =>
      withEditor((ed) => ed.chain().focus().liftListItem('listItem').run()),
    [MENU_EVENT.alwaysOnTop]: () => {
      void (async () => {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const win = getCurrentWindow();
          const next = !(await win.isAlwaysOnTop());
          await win.setAlwaysOnTop(next);
          setStatusMessage(next ? '已置顶' : '已取消置顶');
        } catch (e) {
          setFileError(formatFileError(e));
        }
      })();
    },
    [MENU_EVENT.theme]: () => {
      const el = document.getElementById('theme-picker-select');
      if (el instanceof HTMLSelectElement) {
        el.focus();
        el.click();
      }
    },
    [MENU_EVENT.settings]: () => setSettingsOpen(true),
    [MENU_EVENT.find]: () => setFindReplaceOpen(true),
    [MENU_EVENT.replace]: () => setFindReplaceOpen(true),
    [MENU_EVENT.copyMarkdown]: () => {
      void copyAsMarkdown(activeMarkdownRef.current).then(() =>
        setStatusMessage('已复制为 Markdown'),
      );
    },
    [MENU_EVENT.pastePlain]: () => {
      void navigator.clipboard.readText().then((text) => {
        withEditor((ed) => {
          ed.chain().focus().insertContent(text).run();
        });
      });
    },
    [MENU_EVENT.selectAll]: () => {
      // Editor：INPUT/TEXTAREA / 源代码框 → 只选控件；否则按单元格/代码块/全文
      if (selectActiveNativeField()) return;
      withEditor((ed) => {
        ed.commands.focus();
        runEditorSelectAll(ed);
      });
    },
    [MENU_EVENT.smartPunctuation]: () =>
      withEditor((ed) => {
        const on = toggleSmartPunctuation(ed);
        setStatusMessage(on ? '已开启智能标点' : '已关闭智能标点');
      }),
    [MENU_EVENT.heading1]: () => withEditor((ed) => runHeading(ed, 1)),
    [MENU_EVENT.heading2]: () => withEditor((ed) => runHeading(ed, 2)),
    [MENU_EVENT.heading3]: () => withEditor((ed) => runHeading(ed, 3)),
    [MENU_EVENT.heading4]: () => withEditor((ed) => runHeading(ed, 4)),
    [MENU_EVENT.heading5]: () => withEditor((ed) => runHeading(ed, 5)),
    [MENU_EVENT.heading6]: () => withEditor((ed) => runHeading(ed, 6)),
    [MENU_EVENT.paragraph]: () => withEditor((ed) => runParagraph(ed)),
    [MENU_EVENT.headingInc]: () => withEditor((ed) => increaseHeadingLevel(ed)),
    [MENU_EVENT.headingDec]: () => withEditor((ed) => decreaseHeadingLevel(ed)),
    [MENU_EVENT.quote]: () =>
      withEditor((ed) => ed.chain().focus().toggleBlockquote().run()),
    [MENU_EVENT.orderedList]: () =>
      withEditor((ed) => ed.chain().focus().toggleOrderedList().run()),
    [MENU_EVENT.bulletList]: () =>
      withEditor((ed) => ed.chain().focus().toggleBulletList().run()),
    [MENU_EVENT.taskList]: () =>
      withEditor((ed) => ed.chain().focus().toggleTaskList().run()),
    [MENU_EVENT.codeBlock]: () =>
      withEditor((ed) => ed.chain().focus().toggleCodeBlock().run()),
    [MENU_EVENT.horizontalRule]: () =>
      withEditor((ed) => ed.chain().focus().setHorizontalRule().run()),
    [MENU_EVENT.sourceMode]: () => {
      setSourceMode((v) => {
        const next = !v;
        setStatusMessage(next ? '已进入源代码模式' : '已退出源代码模式');
        return next;
      });
    },
    [MENU_EVENT.focusMode]: () =>
      withEditor((ed) => {
        const on = toggleFocusMode(ed);
        setStatusMessage(on ? '已开启专注模式' : '已关闭专注模式');
      }),
    [MENU_EVENT.typewriterMode]: () =>
      withEditor((ed) => {
        const on = toggleTypewriterMode(ed);
        setStatusMessage(on ? '已开启打字机模式' : '已关闭打字机模式');
      }),
    [MENU_EVENT.bold]: () =>
      withEditor((ed) => ed.chain().focus().toggleBold().run()),
    [MENU_EVENT.italic]: () =>
      withEditor((ed) => ed.chain().focus().toggleItalic().run()),
    [MENU_EVENT.underline]: () =>
      withEditor((ed) => ed.chain().focus().toggleUnderline().run()),
    [MENU_EVENT.code]: () =>
      withEditor((ed) => ed.chain().focus().toggleCode().run()),
    [MENU_EVENT.strike]: () =>
      withEditor((ed) => ed.chain().focus().toggleStrike().run()),
    [MENU_EVENT.link]: () => withEditor((ed) => promptLink(ed)),
    [MENU_EVENT.image]: () => {
      setStatusMessage('请将图片拖入编辑器，或右键「插入图像」');
    },
    [MENU_EVENT.clearFormat]: () =>
      withEditor((ed) => {
        ed.chain().focus().unsetAllMarks().clearNodes().run();
      }),
    [MENU_EVENT.toggleOutline]: () => toggleOutlinePane(),
    [MENU_EVENT.unsupported]: (payload) => {
      setStatusMessage(`暂未实现：${String(payload ?? '该功能')}`);
    },
  };

  useEffect(() => {
    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    const bind = async () => {
      try {
        for (const event of Object.values(MENU_EVENT)) {
          const un = await listen(event, (ev) => {
            menuHandlerMapRef.current[event]?.(ev.payload);
          });
          if (cancelled) {
            un();
            return;
          }
          unlisteners.push(un);
        }
      } catch {
        // 非 Tauri 环境（纯 Vite / 单测）忽略
      }
    };

    void bind();
    return () => {
      cancelled = true;
      for (const un of unlisteners) un();
    };
  }, []);

  useEffect(() => {
    const inTauri = isTauri();
    const onKeyDown = (e: KeyboardEvent) => {
      const action = resolveAppKeyboardAction(e, inTauri);
      if (!action) return;
      e.preventDefault();
      switch (action) {
        case 'saveAs':
          void handleSaveAs();
          break;
        case 'save':
          void handleSave();
          break;
        case 'open':
          void handleOpen();
          break;
        case 'new':
          createTab({ markdown: '' });
          break;
        case 'closeTab':
          handleCloseActiveTab();
          break;
        case 'findReplace':
          setFindReplaceOpen(true);
          break;
        case 'settings':
          setSettingsOpen(true);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, handleSaveAs, handleOpen, handleCloseActiveTab, createTab]);

  useEffect(() => {
    if (!statusMessage) return;
    const t = window.setTimeout(() => setStatusMessage(null), 2500);
    return () => window.clearTimeout(t);
  }, [statusMessage]);

  // 全局禁止 WebView 默认右键（重新载入 / 检查元素）；编辑区由 Editor 自绘菜单
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', onContextMenu, true);
    return () => document.removeEventListener('contextmenu', onContextMenu, true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await loadSettings();
        if (cancelled) return;
        const legacy = s as Settings & { readTyporaThemes?: boolean };
        const normalized: Settings = {
          ...s,
          readExternalThemes:
            legacy.readExternalThemes ?? legacy.readTyporaThemes ?? true,
          lastFolder: s.lastFolder ?? null,
          recentFiles: s.recentFiles ?? [],
          spellCheck: s.spellCheck ?? true,
        };
        setSettings(normalized);
        setSpellCheck(normalized.spellCheck);
        // 恢复上次选择的主题（settings.defaultTheme）
        setSelectedName(normalized.defaultTheme);

        if (normalized.lastFolder) {
          setFolderRoot(normalized.lastFolder);
        }

        const themes = await listThemes(normalized.readExternalThemes);
        if (cancelled) return;
        const target =
          themes.find((t) => t.name === normalized.defaultTheme) ??
          themes.find((t) => t.name === 'github') ??
          themes[0];
        if (!target) {
          applyBuiltinFallbackCss();
          return;
        }
        setSelectedName(target.name);
        const err = await loadAndApplyTheme(target.path, target.name);
        if (!cancelled) setThemeError(err);
      } catch {
        if (!cancelled) {
          applyBuiltinFallbackCss();
          setThemeError('主题加载失败，已回退默认主题');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleThemeChange = useCallback((theme: ThemeInfo) => {
    setSelectedName(theme.name);
    void patchSettings({ defaultTheme: theme.name }).then((next) => {
      setSettings(next);
    });
  }, []);

  const handleSaveSettings = useCallback(async (next: Settings) => {
    await saveSettings(next);
    setSettings(next);
    setSpellCheck(next.spellCheck ?? true);
    setRefreshToken((n) => n + 1);

    const themes = await listThemes(next.readExternalThemes);
    const target =
      themes.find((t) => t.name === next.defaultTheme) ??
      themes.find((t) => t.name === 'github') ??
      themes[0];
    if (!target) {
      applyBuiltinFallbackCss();
      setSelectedName('github');
      return;
    }
    setSelectedName(target.name);
    const err = await loadAndApplyTheme(target.path, target.name);
    setThemeError(err);
  }, []);

  return (
    <main className="app-shell">
      <header className="app-toolbar">
        {settings ? (
          <ThemePicker
            readExternalThemes={settings.readExternalThemes}
            selectedName={selectedName}
            onThemeChange={handleThemeChange}
            onError={handleThemeError}
            refreshToken={refreshToken}
          />
        ) : (
          <span className="theme-picker theme-picker--pending">主题加载中…</span>
        )}
        <div className="app-toolbar__file-actions">
          <button type="button" className="app-toolbar__btn" onClick={() => void handleOpen()}>
            打开
          </button>
          <button
            type="button"
            className="app-toolbar__btn"
            onClick={() => void handleOpenFolder()}
            title="打开文件夹"
          >
            打开文件夹
          </button>
          <button type="button" className="app-toolbar__btn" onClick={() => void handleSave()}>
            保存
          </button>
          <button
            type="button"
            className={`app-toolbar__btn${sidebarOpen && sidebarTab === 'outline' ? ' app-toolbar__btn--active' : ''}`}
            onClick={toggleOutlinePane}
            aria-pressed={sidebarOpen && sidebarTab === 'outline'}
            title="显示或隐藏文档大纲"
          >
            大纲
          </button>
          <button
            type="button"
            className={`app-toolbar__btn${sidebarOpen && sidebarTab === 'files' ? ' app-toolbar__btn--active' : ''}`}
            onClick={toggleFileTreePane}
            aria-pressed={sidebarOpen && sidebarTab === 'files'}
            title="显示或隐藏文件树"
          >
            文件
          </button>
          <button
            type="button"
            className="app-toolbar__btn"
            onClick={openTableInsertDialog}
            title="插入表格"
          >
            表格
          </button>
        </div>
        <button
          type="button"
          className="app-toolbar__settings"
          onClick={() => setSettingsOpen(true)}
          disabled={!settings}
        >
          设置
        </button>
      </header>

      <TabBar
        tabs={tabsState.tabs}
        activeId={tabsState.activeId}
        onSelect={setActive}
        onClose={handleCloseTab}
        onNew={() => createTab({ markdown: '' })}
      />

      <FindReplaceBar
        editor={editorInstance}
        open={findReplaceOpen}
        onClose={() => setFindReplaceOpen(false)}
      />

      {activeTab ? (
        <div className={`app-main${sourceMode ? ' app-main--source' : ''}`}>
          {sidebarOpen && !sourceMode ? (
            <aside className="left-sidebar" aria-label="侧栏">
              <div className="left-sidebar__tabs" role="tablist" aria-label="侧栏切换">
                <button
                  type="button"
                  role="tab"
                  className={`left-sidebar__tab${sidebarTab === 'outline' ? ' left-sidebar__tab--active' : ''}`}
                  aria-selected={sidebarTab === 'outline'}
                  onClick={() => setSidebarTab('outline')}
                >
                  大纲
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`left-sidebar__tab${sidebarTab === 'files' ? ' left-sidebar__tab--active' : ''}`}
                  aria-selected={sidebarTab === 'files'}
                  onClick={() => setSidebarTab('files')}
                >
                  文件
                </button>
              </div>
              <div className="left-sidebar__body">
                {sidebarTab === 'outline' ? (
                  <OutlineSidebar items={outlineItems} editor={editorInstance} />
                ) : (
                  <FileTreeSidebar
                    root={folderRoot}
                    activePath={activeTab.path}
                    onOpenFile={(path) => void handleOpenPath(path)}
                    onOpenFolder={() => void handleOpenFolder()}
                    refreshToken={folderRefreshToken}
                  />
                )}
              </div>
            </aside>
          ) : null}
          {sourceMode ? (
            <textarea
              className="source-mode-editor"
              value={activeTab.markdown}
              spellCheck={spellCheck}
              aria-label="源代码模式"
              onChange={(e) => handleMarkdownChange(e.target.value)}
            />
          ) : (
            <Editor
              key={activeTab.id}
              markdown={activeTab.markdown}
              docPath={activeTab.path}
              onChangeMarkdown={handleMarkdownChange}
              onEditorReady={handleEditorReady}
              onOutlineChange={handleOutlineChange}
              spellCheck={spellCheck}
              editable
            />
          )}
        </div>
      ) : null}

      <TableInsertDialog
        open={tableDialogOpen}
        onClose={() => setTableDialogOpen(false)}
        onInsert={handleConfirmTableInsert}
      />

      {themeError || fileError ? (
        <div className="app-status app-status--error" role="status">
          {fileError ?? themeError}
          <button
            type="button"
            className="app-status__dismiss"
            onClick={() => {
              setFileError(null);
              setThemeError(null);
            }}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      ) : null}

      <StatusBar
        tab={activeTab}
        themeName={selectedName}
        message={statusMessage}
        spellCheck={spellCheck}
        onToggleSpellCheck={handleToggleSpellCheck}
      />

      {settings ? (
        <SettingsDialog
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      ) : null}

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onOpenReadme={() => void handleOpenReadme()}
      />

      <OpenQuickDialog
        open={openQuickOpen}
        entries={quickEntries}
        onClose={() => setOpenQuickOpen(false)}
        onOpen={(path) => void handleOpenPath(path)}
      />
    </main>
  );
}

export default App;

import { WRITE_ROOT_ID } from '../editor/editorDom';
import editorBaseCss from '../../resources/editor/base.css?raw';
import githubCss from '../../resources/editor/themes/github.css?raw';

const THEME_STYLE_ID = 'inkmark-theme';

const EXPORT_BASE_CSS = `
html, body {
  margin: 0;
  padding: 0;
}
body {
  overflow: auto;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.delta-export #write {
  min-height: 0;
}
.delta-export .code-tooltip,
.delta-export .ProseMirror-selectednode {
  display: none !important;
}
@media print {
  body { background: transparent; }
  #write {
    max-width: none;
    margin: 0;
    padding: 0;
  }
}
`.trim();

/** 读取当前已应用主题 CSS；若尚未注入则回退内置基础样式。 */
export function collectThemeCss(): string {
  const el = document.getElementById(THEME_STYLE_ID);
  const fromDom = el?.textContent?.trim() ?? '';
  if (fromDom) return fromDom;
  return `${editorBaseCss}\n${githubCss}`;
}

/** 从编辑器 `#write` 克隆正文 HTML，并去掉导出无关的编辑器控件。 */
export function collectWriteHtml(): string {
  const write = document.getElementById(WRITE_ROOT_ID);
  if (!write) {
    throw new Error('编辑器尚未就绪，无法导出');
  }

  const clone = write.cloneNode(true) as HTMLElement;
  clone.removeAttribute('contenteditable');
  clone.removeAttribute('translate');
  clone.classList.remove('ProseMirror-focused');

  clone
    .querySelectorAll(
      '.code-tooltip, .ProseMirror-widget, .ProseMirror-separator, .ProseMirror-trailingBreak',
    )
    .forEach((node) => node.remove());

  clone.querySelectorAll('[contenteditable]').forEach((node) => {
    node.removeAttribute('contenteditable');
  });

  // 去掉空段占位符，避免导出残留提示文案
  clone.querySelectorAll('p.is-editor-empty').forEach((p) => {
    if (!p.textContent?.trim()) p.remove();
  });

  return clone.innerHTML;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 组装可独立打开的完整 HTML 文档。
 * `includeStyles: false` 时仅输出正文（无样式 HTML）。
 */
export function buildExportHtmlDocument(options: {
  title: string;
  bodyHtml?: string;
  themeCss?: string;
  includeStyles?: boolean;
}): string {
  const title = options.title.trim() || '未命名';
  const bodyHtml = options.bodyHtml ?? collectWriteHtml();
  const includeStyles = options.includeStyles !== false;

  if (!includeStyles) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
  }

  const themeCss = options.themeCss ?? collectThemeCss();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
${EXPORT_BASE_CSS}

${themeCss}
</style>
</head>
<body class="delta-export">
<div class="editor-root">
<div id="${WRITE_ROOT_ID}" class="editor-write">
${bodyHtml}
</div>
</div>
</body>
</html>
`;
}

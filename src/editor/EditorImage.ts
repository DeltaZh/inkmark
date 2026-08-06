import type { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';

/** 与 Editor `#zoom-img-menu` 一致的缩放档位 */
export const EDITOR_IMAGE_ZOOM_FACTORS = [
  '25%',
  '33%',
  '50%',
  '67%',
  '80%',
  '100%',
  '150%',
  '200%',
] as const;

export type EditorImageZoom = (typeof EDITOR_IMAGE_ZOOM_FACTORS)[number];

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseZoomFromElement(el: HTMLElement): string | null {
  const inline = el.style.zoom;
  if (inline) {
    if (typeof inline === 'number') {
      return `${Math.round(inline * 100)}%`;
    }
    const trimmed = String(inline).trim();
    if (trimmed) return trimmed.endsWith('%') ? trimmed : `${trimmed}`;
  }
  const style = el.getAttribute('style') ?? '';
  const match = style.match(/(?:^|;)\s*zoom\s*:\s*([^;]+)/i);
  if (!match) return null;
  return match[1].trim();
}

function parseDimension(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function needsHtmlImage(attrs: {
  zoom?: string | null;
  width?: number | null;
  height?: number | null;
  forceHtml?: boolean | null;
}): boolean {
  if (attrs.forceHtml) return true;
  if (attrs.width != null || attrs.height != null) return true;
  if (attrs.zoom && attrs.zoom !== '100%') return true;
  return false;
}

function renderHtmlImage(attrs: {
  src?: string | null;
  alt?: string | null;
  title?: string | null;
  zoom?: string | null;
  width?: number | null;
  height?: number | null;
}): string {
  const src = attrs.src ?? '';
  const alt = attrs.alt ?? '';
  const title = attrs.title ?? '';
  const parts = [`src="${escapeAttr(src)}"`, `alt="${escapeAttr(alt)}"`];
  if (title) parts.push(`title="${escapeAttr(title)}"`);
  if (attrs.width != null) parts.push(`width="${attrs.width}"`);
  if (attrs.height != null) parts.push(`height="${attrs.height}"`);
  if (attrs.zoom && attrs.zoom !== '100%') {
    parts.push(`style="zoom:${attrs.zoom}"`);
  }
  return `<img ${parts.join(' ')} />`;
}

/**
 * Editor 式图片：缩放写入 `style="zoom:N%"`，有尺寸/缩放时以 HTML `<img>` 落盘。
 */
export const EditorImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      zoom: {
        default: null,
        parseHTML: (element) => parseZoomFromElement(element as HTMLElement),
        renderHTML: (attributes) => {
          if (!attributes.zoom || attributes.zoom === '100%') return {};
          return { style: `zoom:${attributes.zoom}` };
        },
      },
      forceHtml: {
        default: false,
        parseHTML: (element) => {
          // 凡是从 HTML img 解析进来的，默认保留 HTML 语法
          return element.tagName === 'IMG';
        },
        renderHTML: () => ({}),
      },
      width: {
        default: null,
        parseHTML: (element) =>
          parseDimension(element.getAttribute('width')) ??
          parseDimension((element as HTMLElement).style.width),
        renderHTML: (attributes) => {
          if (attributes.width == null) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) =>
          parseDimension(element.getAttribute('height')) ??
          parseDimension((element as HTMLElement).style.height),
        renderHTML: (attributes) => {
          if (attributes.height == null) return {};
          return { height: attributes.height };
        },
      },
    };
  },

  parseMarkdown: (token, helpers) => {
    return helpers.createNode('image', {
      src: token.href,
      title: token.title,
      alt: token.text,
      forceHtml: false,
      zoom: null,
    });
  },

  renderMarkdown: (node) => {
    const attrs = node.attrs ?? {};
    const src = (attrs.src as string | null) ?? '';
    const alt = (attrs.alt as string | null) ?? '';
    const title = (attrs.title as string | null) ?? '';
    const zoom = (attrs.zoom as string | null) ?? null;
    const width = attrs.width as number | null | undefined;
    const height = attrs.height as number | null | undefined;
    const forceHtml = Boolean(attrs.forceHtml);

    if (
      needsHtmlImage({
        zoom,
        width,
        height,
        forceHtml,
      })
    ) {
      return renderHtmlImage({ src, alt, title, zoom, width, height });
    }

    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
  },

});

/** 与 Editor `zoomAction` 一致：100% 清除 zoom，其它比例写入 style */
export function setImageZoom(editor: Editor, zoom: string): boolean {
  const { selection } = editor.state;
  const node = editor.state.doc.nodeAt(selection.from);
  if (!node || node.type.name !== 'image') return false;
  const nextZoom = zoom === '100%' ? null : zoom;
  return editor
    .chain()
    .focus()
    .updateAttributes('image', {
      zoom: nextZoom,
      forceHtml: nextZoom != null || Boolean(node.attrs.forceHtml),
    })
    .run();
}

/** 与 「切换图片语法」一致 */
export function setImageSyntax(
  editor: Editor,
  syntax: 'markdown' | 'html',
): boolean {
  const { selection } = editor.state;
  const node = editor.state.doc.nodeAt(selection.from);
  if (!node || node.type.name !== 'image') return false;
  if (syntax === 'markdown') {
    return editor
      .chain()
      .focus()
      .updateAttributes('image', {
        forceHtml: false,
        zoom: null,
        width: null,
        height: null,
      })
      .run();
  }
  return editor
    .chain()
    .focus()
    .updateAttributes('image', { forceHtml: true })
    .run();
}

import { marked } from 'marked';
import { adaptHtmlForTipTap } from './adaptHtmlForTipTap';

marked.setOptions({ gfm: true, breaks: false });

/** Markdown → TipTap 可用 HTML（含任务列表等 GFM → TipTap 适配） */
export function markdownToHtml(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  return adaptHtmlForTipTap(html);
}

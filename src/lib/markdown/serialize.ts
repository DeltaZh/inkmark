import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
td.use(gfm);

// TipTap 任务列表：ul[data-type=taskList] / li[data-type=taskItem][data-checked]
td.addRule('tiptapTaskList', {
  filter(node) {
    return (
      node.nodeName === 'UL' &&
      (node as HTMLElement).getAttribute('data-type') === 'taskList'
    );
  },
  replacement(_content, node) {
    const items = Array.from((node as HTMLElement).children).filter(
      (el) => el.nodeName === 'LI',
    );
    const lines = items.map((li) => {
      const checked =
        (li as HTMLElement).getAttribute('data-checked') === 'true';
      const box = checked ? '[x]' : '[ ]';
      const text = (li.textContent ?? '').replace(/\s+/g, ' ').trim();
      return `- ${box} ${text}`;
    });
    return `\n\n${lines.join('\n')}\n\n`;
  },
});

/** Turndown GFM 会在 `-` 后输出多空格，归一化为单空格以稳定往返 */
function normalizeListSpacing(md: string): string {
  return md.replace(/^(\s*[-*+]|\d+\.)\s{2,}/gm, '$1 ');
}

export function serializeMarkdown(html: string): string {
  return normalizeListSpacing(td.turndown(html)).trim() + '\n';
}

export function htmlToMarkdown(html: string): string {
  return serializeMarkdown(html);
}

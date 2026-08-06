import mammoth from 'mammoth';

/** mammoth 运行时提供 convertToMarkdown，官方 d.ts 未声明。 */
type MammothMarkdown = typeof mammoth & {
  convertToMarkdown: (input: {
    arrayBuffer: ArrayBuffer;
  }) => Promise<{ value: string }>;
};

const mammothMd = mammoth as MammothMarkdown;

/** HTML → 近似 Markdown（去标签，保留换行与链接文本）。 */
export function htmlToMarkdownRough(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join('');
    if (/^h([1-6])$/.test(tag)) {
      const level = Number(tag.slice(1));
      return `${'#'.repeat(level)} ${inner.trim()}\n\n`;
    }
    if (tag === 'p' || tag === 'div') return `${inner.trim()}\n\n`;
    if (tag === 'br') return '\n';
    if (tag === 'li') return `- ${inner.trim()}\n`;
    if (tag === 'pre' || tag === 'code') return `\`${inner}\``;
    if (tag === 'strong' || tag === 'b') return `**${inner}**`;
    if (tag === 'em' || tag === 'i') return `*${inner}*`;
    if (tag === 'a') {
      const href = el.getAttribute('href') ?? '';
      return href ? `[${inner}](${href})` : inner;
    }
    return inner;
  };
  return walk(doc.body)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .concat('\n');
}

export async function docxBytesToMarkdown(bytes: number[] | Uint8Array): Promise<string> {
  const array =
    bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  const result = await mammothMd.convertToMarkdown({
    arrayBuffer: array.buffer.slice(
      array.byteOffset,
      array.byteOffset + array.byteLength,
    ) as ArrayBuffer,
  });
  const md = result.value.trim();
  return md.endsWith('\n') ? md : `${md}\n`;
}

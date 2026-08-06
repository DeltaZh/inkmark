import type { JSONContent } from '@tiptap/core';

export type OutlineItem = { level: number; text: string; id: string };

export function extractOutlineFromHtml(html: string): OutlineItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6');
  return Array.from(nodes).map((el, i) => ({
    level: Number(el.tagName.substring(1)),
    text: el.textContent?.trim() || '',
    id: el.id || `heading-${i}`,
  }));
}

export function extractOutlineFromEditorJson(doc: JSONContent): OutlineItem[] {
  const items: OutlineItem[] = [];
  const walk = (node?: JSONContent) => {
    if (!node) return;
    if (node.type === 'heading') {
      const level = Number(node.attrs?.level ?? 1);
      const text = (node.content ?? []).map((c) => c.text ?? '').join('');
      items.push({ level, text, id: `h-${items.length}` });
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return items;
}

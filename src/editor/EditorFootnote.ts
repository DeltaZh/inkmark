import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Editor 脚注定义：`[^id]: text`
 * 引用以字面量 `[^id]` 插入正文（与 Markdown 源一致）。
 */
export const FootnoteDef = Node.create({
  name: 'footnoteDef',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      id: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.md-footnote-def[data-footnote-id]',
        getAttrs: (el) => ({
          id: (el as HTMLElement).getAttribute('data-footnote-id') ?? '',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const id = String(node.attrs.id ?? '');
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'md-footnote-def',
        id: `fn-${id}`,
        'data-footnote-id': id,
      }),
      0,
    ];
  },

  parseMarkdown: (token, helpers) => {
    const id = String((token as { meta?: string; id?: string }).meta ?? '');
    const text = String(token.text ?? '');
    return helpers.createNode(
      'footnoteDef',
      { id },
      text ? [helpers.createTextNode(text)] : [],
    );
  },

  renderMarkdown: (node, helpers) => {
    const id = String(node.attrs?.id ?? '');
    const body = helpers.renderChildren(node).trim();
    return `[^${id}]: ${body}\n\n`;
  },

  markdownTokenizer: {
    name: 'footnoteDef',
    level: 'block',
    start: (src: string) => {
      const idx = src.search(/^\[\^[^\]]+\]:/m);
      return idx;
    },
    tokenize: (src: string) => {
      const match = /^\[\^([^\]]+)\]:\s*(.*)(?:\n|$)/.exec(src);
      if (!match) return undefined;
      return {
        type: 'footnoteDef',
        raw: match[0],
        meta: match[1],
        text: match[2] ?? '',
      };
    },
  },

  addNodeView() {
    return ({ node }) => {
      const id = String(node.attrs.id ?? '');
      const dom = document.createElement('div');
      dom.className = 'md-footnote-def';
      dom.id = `fn-${id}`;
      dom.setAttribute('data-footnote-id', id);

      const label = document.createElement('span');
      label.className = 'md-footnote-def-label';
      label.contentEditable = 'false';
      label.textContent = `[^${id}]: `;

      const body = document.createElement('span');
      body.className = 'md-footnote-def-body';

      dom.append(label, body);

      return {
        dom,
        contentDOM: body,
        update: (updated) => {
          if (updated.type !== node.type) return false;
          const nextId = String(updated.attrs.id ?? '');
          label.textContent = `[^${nextId}]: `;
          dom.id = `fn-${nextId}`;
          dom.setAttribute('data-footnote-id', nextId);
          return true;
        },
        ignoreMutation: (m) => m.type === 'selection',
      };
    };
  },

  addCommands() {
    return {
      insertFootnote:
        (id?: string) =>
        ({ editor, commands, state }) => {
          let max = 0;
          state.doc.descendants((n) => {
            if (n.type.name !== 'footnoteDef') return true;
            const num = Number.parseInt(String(n.attrs.id), 10);
            if (Number.isFinite(num)) max = Math.max(max, num);
            return true;
          });
          const nextId = id || String(max + 1);
          commands.insertContent(`[^${nextId}]`);
          const end = editor.state.doc.content.size;
          return editor
            .chain()
            .insertContentAt(end, {
              type: this.name,
              attrs: { id: nextId },
              content: [{ type: 'text', text: '脚注内容' }],
            })
            .run();
        },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnoteDef: {
      insertFootnote: (id?: string) => ReturnType;
    };
  }
}

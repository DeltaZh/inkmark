import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Editor `[TOC]`：渲染为可点击的文档大纲。
 * 源码形态保持为段落文本 `[TOC]` 或专用节点；此处用 atom 块节点持久化。
 */
export const EditorToc = Node.create({
  name: 'toc',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div.md-toc' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'md-toc',
        'data-toc': 'true',
      }),
      ['p', { class: 'md-toc-content' }, '[TOC]'],
    ];
  },

  parseMarkdown: (_token, helpers) => {
    return helpers.createNode('toc');
  },

  renderMarkdown: () => '[TOC]\n\n',

  markdownTokenizer: {
    name: 'toc',
    level: 'block',
    start: (src: string) => {
      const m = /^(?:\[TOC\]|\[toc\])(?:\n|$)/m.exec(src);
      return m ? src.indexOf(m[0]) : -1;
    },
    tokenize: (src: string) => {
      const match = /^(?:\[TOC\]|\[toc\])(?:\n|$)/.exec(src);
      if (!match) return undefined;
      return {
        type: 'toc',
        raw: match[0],
        text: '[TOC]',
      };
    },
  },

  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement('div');
      dom.className = 'md-toc';
      dom.setAttribute('data-toc', 'true');
      dom.contentEditable = 'false';

      const render = () => {
        const headings: Array<{ level: number; text: string; pos: number }> = [];
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading') {
            headings.push({
              level: node.attrs.level as number,
              text: node.textContent,
              pos,
            });
          }
        });
        dom.innerHTML = '';
        const list = document.createElement('nav');
        list.className = 'md-toc-content';
        if (!headings.length) {
          const empty = document.createElement('p');
          empty.textContent = '[TOC]';
          list.appendChild(empty);
        } else {
          for (const h of headings) {
            const a = document.createElement('a');
            a.href = '#';
            a.className = `md-toc-item md-toc-h${h.level}`;
            a.textContent = h.text || '(空标题)';
            a.style.paddingLeft = `${(h.level - 1) * 12}px`;
            a.addEventListener('click', (e) => {
              e.preventDefault();
              editor.chain().focus().setTextSelection(h.pos + 1).run();
              const el = editor.view.nodeDOM(h.pos);
              if (el instanceof HTMLElement) {
                el.scrollIntoView({ block: 'start', behavior: 'smooth' });
              }
            });
            list.appendChild(a);
          }
        }
        dom.appendChild(list);
      };

      render();

      return {
        dom,
        update: () => {
          render();
          return true;
        },
        selectNode: () => {
          dom.classList.add('ProseMirror-selectednode');
        },
        deselectNode: () => {
          dom.classList.remove('ProseMirror-selectednode');
        },
        destroy: () => {
          /* noop */
        },
        ignoreMutation: () => true,
      };
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('editorTocRefresh'),
        view: () => ({
          update: (view, prev) => {
            if (prev.doc.eq(view.state.doc)) return;
            // node views refresh on update()
          },
        }),
      }),
    ];
  },

  addCommands() {
    return {
      insertToc:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toc: {
      insertToc: () => ReturnType;
    };
  }
}

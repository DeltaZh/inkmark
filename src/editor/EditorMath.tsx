import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import katex from 'katex';
import { useMemo, useState, type MouseEvent } from 'react';
import 'katex/dist/katex.min.css';

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex || '', {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
    });
  } catch {
    return `<span class="md-math-error">${latex}</span>`;
  }
}

function MathNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const latex = String(node.attrs.latex ?? '');
  const display = node.type.name === 'mathBlock';
  const [editing, setEditing] = useState(!latex);
  const html = useMemo(() => renderKatex(latex, display), [latex, display]);

  if (editing) {
    return (
      <NodeViewWrapper
        as={display ? 'div' : 'span'}
        className={display ? 'md-math-block md-math-edit' : 'md-inline-math md-math-edit'}
        data-selected={selected || undefined}
      >
        <textarea
          className="md-math-input"
          value={latex}
          rows={display ? 3 : 1}
          placeholder={display ? '输入公式…' : '公式'}
          onChange={(e) => updateAttributes({ latex: e.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
              e.preventDefault();
              e.stopPropagation();
              (e.target as HTMLTextAreaElement).select();
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
            }
            e.stopPropagation();
          }}
          autoFocus
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as={display ? 'div' : 'span'}
      className={display ? 'md-math-block' : 'md-inline-math'}
      data-selected={selected || undefined}
      onDoubleClick={(e: MouseEvent) => {
        e.preventDefault();
        setEditing(true);
      }}
    >
      <span
        className="md-mathjax-preview"
        contentEditable={false}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </NodeViewWrapper>
  );
}

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.md-inline-math[data-latex]',
        getAttrs: (el) => ({
          latex: (el as HTMLElement).getAttribute('data-latex') ?? '',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'md-inline-math',
        'data-latex': node.attrs.latex,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },

  parseMarkdown: (token, helpers) => {
    return helpers.createNode('mathInline', {
      latex: token.text ?? token.raw ?? '',
    });
  },

  renderMarkdown: (node) => {
    const latex = String(node.attrs?.latex ?? '');
    return `$${latex}$`;
  },

  markdownTokenizer: {
    name: 'mathInline',
    level: 'inline',
    start: (src: string) => {
      const i = src.indexOf('$');
      if (i < 0) return -1;
      if (src[i + 1] === '$') return -1;
      return i;
    },
    tokenize: (src: string) => {
      const match = /^\$([^$\n]+?)\$/.exec(src);
      if (!match) return undefined;
      return {
        type: 'mathInline',
        raw: match[0],
        text: match[1],
      };
    },
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\$([^$\n]+)\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1] ?? '';
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          tr.replaceWith(
            start,
            end,
            this.type.create({ latex }),
          );
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertMathInline:
        (latex = '') =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { latex },
          }),
    };
  },
});

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  defining: true,

  addAttributes() {
    return {
      latex: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.md-math-block[data-latex]',
        getAttrs: (el) => ({
          latex: (el as HTMLElement).getAttribute('data-latex') ?? '',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'md-math-block',
        'data-latex': node.attrs.latex,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },

  parseMarkdown: (token, helpers) => {
    return helpers.createNode('mathBlock', {
      latex: (token.text ?? '').trim(),
    });
  },

  renderMarkdown: (node) => {
    const latex = String(node.attrs?.latex ?? '').trim();
    return `$$\n${latex}\n$$\n\n`;
  },

  markdownTokenizer: {
    name: 'mathBlock',
    level: 'block',
    start: (src: string) => src.indexOf('$$'),
    tokenize: (src: string) => {
      const match = /^\$\$\n?([\s\S]*?)\n?\$\$(?:\n|$)/.exec(src);
      if (!match) return undefined;
      return {
        type: 'mathBlock',
        raw: match[0],
        text: match[1] ?? '',
      };
    },
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\$\$\n([\s\S]+?)\n\$\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1] ?? '';
          const { tr } = state;
          tr.replaceWith(range.from, range.to, this.type.create({ latex }));
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex = '') =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { latex },
          }),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      insertMathInline: (latex?: string) => ReturnType;
    };
    mathBlock: {
      insertMathBlock: (latex?: string) => ReturnType;
    };
  }
}

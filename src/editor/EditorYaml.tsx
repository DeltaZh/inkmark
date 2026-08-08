import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { looksLikeYamlFrontMatter } from './yamlFrontMatter';

function YamlNodeView(_props: NodeViewProps) {
  return (
    <NodeViewWrapper className="md-yaml md-meta-block" as="pre">
      <code>
        <NodeViewContent />
      </code>
    </NodeViewWrapper>
  );
}

/**
 * Editor YAML Front Matter：仅文档开头的 `--- ... ---`。
 * 文中用作水平分割线的 `---` 不得匹配（否则会吞掉中间标题/表格）。
 */
export const EditorYaml = Node.create({
  name: 'yamlFrontMatter',
  group: 'block',
  content: 'text*',
  code: true,
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'pre.md-yaml' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(HTMLAttributes, { class: 'md-yaml md-meta-block' }),
      ['code', 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YamlNodeView);
  },

  parseMarkdown: (token, helpers) => {
    const text = String(token.text ?? '').replace(/^\n+|\n+$/g, '');
    return helpers.createNode(
      'yamlFrontMatter',
      {},
      text ? [helpers.createTextNode(text)] : [],
    );
  },

  renderMarkdown: (node, helpers) => {
    const body = helpers.renderChildren(node).replace(/\n$/, '');
    return `---\n${body}\n---\n\n`;
  },

  markdownTokenizer: {
    name: 'yamlFrontMatter',
    level: 'block',
    start: (src: string) =>
      src.startsWith('---\n') || src.startsWith('---\r\n') ? 0 : -1,
    tokenize: (src: string, tokens: unknown[]) => {
      // 已有前置块 → 不是文档开头，留给水平线 / 正文
      if (Array.isArray(tokens) && tokens.length > 0) return undefined;
      if (!src.startsWith('---\n') && !src.startsWith('---\r\n')) {
        return undefined;
      }
      const end = src.indexOf('\n---', 3);
      if (end < 0) return undefined;

      // 闭合 --- 后须为换行或文末，避免误吃表格分隔行
      const afterClose = src[end + 4];
      if (afterClose != null && afterClose !== '\n' && afterClose !== '\r') {
        return undefined;
      }

      const text = src.slice(src.startsWith('---\r\n') ? 5 : 4, end).replace(/^\n/, '');
      if (!looksLikeYamlFrontMatter(text)) return undefined;

      const closeLen = 4; // \n---
      let rawEnd = end + closeLen;
      if (src[rawEnd] === '\r') rawEnd += 1;
      if (src[rawEnd] === '\n') rawEnd += 1;

      return {
        type: 'yamlFrontMatter',
        raw: src.slice(0, rawEnd),
        text,
      };
    },
  },

  addCommands() {
    return {
      insertYamlFrontMatter:
        (content = 'title: \n') =>
        ({ commands, state }) => {
          if (state.doc.firstChild?.type.name === 'yamlFrontMatter') {
            return false;
          }
          return commands.insertContentAt(0, {
            type: this.name,
            content: [{ type: 'text', text: content }],
          });
        },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    yamlFrontMatter: {
      insertYamlFrontMatter: (content?: string) => ReturnType;
    };
  }
}

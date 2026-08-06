import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

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
 * Editor YAML Front Matter：文档开头 `--- ... ---`。
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
    start: (src: string) => (src.startsWith('---\n') || src.startsWith('---\r\n') ? 0 : -1),
    tokenize: (src: string) => {
      if (!src.startsWith('---')) return undefined;
      const end = src.indexOf('\n---', 3);
      if (end < 0) return undefined;
      const raw = src.slice(0, end + 4);
      // consume trailing newline after closing ---
      const consumed = raw + (src[end + 4] === '\n' ? '\n' : '');
      const text = src.slice(4, end).replace(/^\n/, '');
      return {
        type: 'yamlFrontMatter',
        raw: consumed.startsWith('---') ? (src.startsWith('---\n') ? `---\n${text}\n---\n` : raw) : raw,
        text,
      };
    },
  },

  addCommands() {
    return {
      insertYamlFrontMatter:
        (content = 'title: \n') =>
        ({ commands, state }) => {
          // 仅允许插在文档开头
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

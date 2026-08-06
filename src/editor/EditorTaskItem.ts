import TaskItem from '@tiptap/extension-task-item';
import { InputRule, mergeAttributes } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';

/**
 * Editor 任务列表 DOM（摘自本机 Editor.app …/appsrc/main.js）：
 * `<li class="md-list-item task-list-item md-task-list-item task-list-done|not-done">
 *    <input type="checkbox" …>content</li>`
 * 主题钩子：`.md-task-list-item > input`
 */
export const EditorTaskItem = TaskItem.extend({
  addOptions() {
    const parent = this.parent?.() ?? {
      nested: false,
      HTMLAttributes: {},
      taskListTypeName: 'taskList',
    };
    return {
      ...parent,
      nested: true,
      taskListTypeName: parent.taskListTypeName ?? 'taskList',
      HTMLAttributes: {
        ...parent.HTMLAttributes,
        class: 'md-list-item task-list-item md-task-list-item',
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const checked = Boolean(node.attrs.checked);
    return [
      'li',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': this.name,
        'data-checked': checked ? 'true' : 'false',
        class: [
          'md-list-item',
          'task-list-item',
          'md-task-list-item',
          checked ? 'task-list-done' : 'task-list-not-done',
        ].join(' '),
      }),
      [
        'input',
        {
          type: 'checkbox',
          checked: checked ? 'checked' : null,
        },
      ],
      // TipTap 需要 contentDOM 容器；不加额外 class，避免干扰 主题选择器
      ['div', 0],
    ];
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement('li');
      const checkbox = document.createElement('input');
      const content = document.createElement('div');

      const applyChecked = (current: PmNode) => {
        const checked = Boolean(current.attrs.checked);
        checkbox.checked = checked;
        listItem.dataset.checked = checked ? 'true' : 'false';
        listItem.classList.toggle('task-list-done', checked);
        listItem.classList.toggle('task-list-not-done', !checked);
      };

      listItem.className =
        'md-list-item task-list-item md-task-list-item task-list-not-done';

      const applyAttrs = (attrs: Record<string, unknown>) => {
        Object.entries(attrs).forEach(([key, value]) => {
          if (value == null) return;
          if (key === 'class') {
            String(value)
              .split(/\s+/)
              .forEach((c) => c && listItem.classList.add(c));
            return;
          }
          listItem.setAttribute(key, String(value));
        });
      };
      applyAttrs(this.options.HTMLAttributes as Record<string, unknown>);
      applyAttrs(HTMLAttributes as Record<string, unknown>);

      checkbox.type = 'checkbox';
      checkbox.contentEditable = 'false';
      checkbox.addEventListener('mousedown', (event) => event.preventDefault());
      checkbox.addEventListener('change', () => {
        if (!editor.isEditable) {
          checkbox.checked = !checkbox.checked;
          return;
        }
        if (typeof getPos !== 'function') return;
        const position = getPos();
        if (typeof position !== 'number') return;
        editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .command(({ tr }) => {
            const currentNode = tr.doc.nodeAt(position);
            if (!currentNode) return false;
            tr.setNodeMarkup(position, undefined, {
              ...currentNode.attrs,
              checked: checkbox.checked,
            });
            return true;
          })
          .run();
      });

      applyChecked(node);
      listItem.append(checkbox, content);

      return {
        dom: listItem,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) return false;
          applyChecked(updatedNode);
          return true;
        },
      };
    };
  },

  addInputRules() {
    const parentRules = this.parent?.() ?? [];

    // 常见习惯：段落开头输入 `- [ ] ` / `* [x] `
    const dashTaskRule = new InputRule({
      find: /^\s*([-*+])\s+\[([ xX])\]\s$/,
      handler: ({ chain, range, match }) => {
        const checked = match[2].toLowerCase() === 'x';
        chain()
          .deleteRange(range)
          .toggleTaskList()
          .command(({ tr, dispatch }) => {
            const { $from } = tr.selection;
            for (let depth = $from.depth; depth > 0; depth -= 1) {
              const n = $from.node(depth);
              if (n.type.name === 'taskItem') {
                tr.setNodeMarkup($from.before(depth), undefined, {
                  ...n.attrs,
                  checked,
                });
                dispatch?.(tr);
                return true;
              }
            }
            return true;
          })
          .run();
      },
    });

    return [...parentRules, dashTaskRule];
  },
});

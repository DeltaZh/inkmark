import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as PmNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';

/**
 * Editor appsrc 任务列表识别（main.js）：
 *   tasklist: /^(\s*)(([-+*])\s*)\[((x|X)| )\]\s+/
 *
 * TipTap 会先把 `- ` 收成普通 bullet；用户继续键入 `[ ] ` 后仍停在 bullet+字面量。
 * 此插件在事务后扫描：若 listItem 文本以 `[ ] `/`[x] ` 开头，则转为 taskItem（编辑器行为）。
 */
const TASK_PREFIX = /^\[([ xX])\]\s+/;

function listItemPlainText(node: PmNode): string {
  return node.textContent ?? '';
}

function convertBulletTasks(tr: Transaction): Transaction | null {
  const doc = tr.doc;
  const schema = doc.type.schema;
  const bulletList = schema.nodes.bulletList;
  const listItem = schema.nodes.listItem;
  const taskList = schema.nodes.taskList;
  const taskItem = schema.nodes.taskItem;
  if (!bulletList || !listItem || !taskList || !taskItem) return null;

  type Replacement = {
    from: number;
    to: number;
    nodes: PmNode[];
  };
  const replacements: Replacement[] = [];

  doc.descendants((node, pos) => {
    if (node.type !== bulletList) return true;

    const segments: PmNode[] = [];
    let currentTasks: PmNode[] = [];

    const flushTasks = () => {
      if (!currentTasks.length) return;
      segments.push(taskList.create(null, currentTasks));
      currentTasks = [];
    };

    node.forEach((child) => {
      if (child.type !== listItem) {
        flushTasks();
        segments.push(child);
        return;
      }
      const text = listItemPlainText(child);
      const m = TASK_PREFIX.exec(text);
      if (!m) {
        flushTasks();
        segments.push(child);
        return;
      }
      const checked = m[1].toLowerCase() === 'x';
      const rest = text.slice(m[0].length);
      // 重建 paragraph 内容：去掉 `[ ] ` 前缀
      const paragraph = child.firstChild;
      let newParagraph: PmNode;
      if (paragraph && paragraph.type.name === 'paragraph') {
        // 简单策略：用纯文本 rest（保留后续输入的主要场景）
        newParagraph = schema.nodes.paragraph.create(
          paragraph.attrs,
          rest ? schema.text(rest) : undefined,
        );
      } else {
        newParagraph = schema.nodes.paragraph.create(
          null,
          rest ? schema.text(rest) : undefined,
        );
      }
      const otherBlocks: PmNode[] = [];
      child.forEach((block, _offset, index) => {
        if (index === 0) return;
        otherBlocks.push(block);
      });
      currentTasks.push(
        taskItem.create({ checked }, [newParagraph, ...otherBlocks]),
      );
    });
    flushTasks();

    // 若没有任何转换，跳过
    const converted = segments.some((s) => s.type === taskList);
    if (!converted) return false;

    replacements.push({
      from: pos,
      to: pos + node.nodeSize,
      nodes: segments,
    });
    return false;
  });

  if (!replacements.length) return null;

  // 从后往前替换，避免位移
  for (let i = replacements.length - 1; i >= 0; i -= 1) {
    const { from, to, nodes } = replacements[i];
    tr.replaceWith(from, to, nodes);
  }
  return tr;
}

export const TaskAutoConvert = Extension.create({
  name: 'taskAutoConvert',
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('taskAutoConvert'),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((t) => t.docChanged)) return null;
          // 避免与协同/远程大事务冲突；本地输入即可
          const tr = newState.tr;
          const next = convertBulletTasks(tr);
          if (!next || !next.docChanged) return null;
          return next;
        },
      }),
    ];
  },
});

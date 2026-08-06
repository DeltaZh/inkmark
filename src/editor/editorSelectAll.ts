import { Extension, type Editor } from '@tiptap/core';
import type { ResolvedPos } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Editor `selection.selectAll` 行为（历史实现参考 appsrc/main.js）：
 * - INPUT/TEXTAREA → 选中控件自身（由 DOM 处理）
 * - 代码块（CodeMirror / fences）→ 选中当前代码块全文
 * - 表格 → 选中当前 `table_cell` 内容
 * - YAML / meta_block → 选中当前元信息块
 * - 其它普通正文 → 选中整篇文档
 */

/**
 * 需要「局部全选」的块节点名。
 * 匹配按光标 depth 由内到外，与 常见习惯一致：先 fences，再 table_cell，再 meta。
 */
export const LOCAL_SELECT_ALL_NODE_NAMES = [
  'codeBlock',
  'tableCell',
  'tableHeader',
  'yamlFrontMatter',
] as const;

export type LocalSelectAllNodeName =
  (typeof LOCAL_SELECT_ALL_NODE_NAMES)[number];

export function findLocalSelectAllDepth(
  $pos: ResolvedPos,
): { depth: number; name: LocalSelectAllNodeName } | null {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const name = $pos.node(depth).type.name;
    if (
      (LOCAL_SELECT_ALL_NODE_NAMES as readonly string[]).includes(name)
    ) {
      return { depth, name: name as LocalSelectAllNodeName };
    }
  }
  return null;
}

/** 选中节点内容（不含节点本身边界） */
export function selectNodeContents(
  editor: Editor,
  depth: number,
): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  const node = $from.node(depth);
  const before = $from.before(depth);
  const contentFrom = before + 1;
  const contentTo = before + node.nodeSize - 1;

  // codeBlock / yaml 等 inlineContent：可直接 TextSelection
  if (node.inlineContent) {
    return editor.commands.setTextSelection({
      from: contentFrom,
      to: contentTo,
    });
  }

  // tableCell 等 block+：端点必须落在 inline 文本节点内
  if (contentFrom >= contentTo) {
    return editor.commands.setTextSelection(contentFrom);
  }
  const $start = state.doc.resolve(contentFrom);
  const $end = state.doc.resolve(contentTo);
  const from = TextSelection.near($start, 1).from;
  const to = TextSelection.near($end, -1).to;
  return editor.commands.setTextSelection({ from, to });
}

/**
 * 执行 编辑器风格全选。
 * @returns true 表示已处理（含文档级 selectAll）
 */
/** 焦点在原生输入控件时：只选中该控件（Editor INPUT/TEXTAREA 分支） */
export function selectActiveNativeField(): boolean {
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) {
    active.select();
    return true;
  }
  return false;
}

export function runEditorSelectAll(editor: Editor): boolean {
  if (selectActiveNativeField()) return true;

  const { $from } = editor.state.selection;
  const local = findLocalSelectAllDepth($from);
  if (local) {
    return selectNodeContents(editor, local.depth);
  }

  return editor.commands.selectAll();
}

export const EditorSelectAll = Extension.create({
  name: 'editorSelectAll',
  // 高于默认 keymap，保证覆盖 ProseMirror selectAll
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      'Mod-a': () => runEditorSelectAll(this.editor),
    };
  },
});

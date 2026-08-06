import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export type TextRange = { from: number; to: number };

/** 在纯文本中查找下一处匹配（from 为起始字符偏移） */
export function findInText(
  text: string,
  search: string,
  from: number,
): TextRange | null {
  if (!search) return null;
  const index = text.indexOf(search, from);
  if (index === -1) return null;
  return { from: index, to: index + search.length };
}

/** findInText 别名，供编辑器侧调用 */
export function findNext(
  text: string,
  search: string,
  from: number,
): TextRange | null {
  return findInText(text, search, from);
}

function textOffsetToPos(doc: ProseMirrorNode, offset: number): number | null {
  let textOffset = 0;
  let result: number | null = null;

  doc.descendants((node, pos) => {
    if (result !== null) return false;
    if (!node.isText || !node.text) return true;

    const len = node.text.length;
    if (offset >= textOffset && offset <= textOffset + len) {
      result = pos + (offset - textOffset);
      return false;
    }
    textOffset += len;
    return true;
  });

  return result;
}

function collectTextMatches(
  doc: ProseMirrorNode,
  search: string,
): Array<TextRange & { textOffset: number }> {
  const text = doc.textContent;
  const matches: Array<TextRange & { textOffset: number }> = [];
  let from = 0;

  while (true) {
    const match = findInText(text, search, from);
    if (!match) break;

    const fromPos = textOffsetToPos(doc, match.from);
    const toPos = textOffsetToPos(doc, match.to);
    if (fromPos !== null && toPos !== null) {
      matches.push({ from: fromPos, to: toPos, textOffset: match.from });
    }
    from = match.to;
  }

  return matches;
}

/** 在编辑器文档中查找并选中下一处 */
export function findNextInEditor(
  editor: Editor,
  search: string,
  fromOffset = 0,
): TextRange | null {
  if (!search) return null;

  const doc = editor.state.doc;
  const text = doc.textContent;
  const match = findInText(text, search, fromOffset);
  if (!match) return null;

  const fromPos = textOffsetToPos(doc, match.from);
  const toPos = textOffsetToPos(doc, match.to);
  if (fromPos === null || toPos === null) return null;

  editor.chain().focus().setTextSelection({ from: fromPos, to: toPos }).run();
  return { from: fromPos, to: toPos };
}

/** 替换当前选区（仅当选中文本与查找词一致时） */
export function replaceCurrentInEditor(
  editor: Editor,
  search: string,
  replacement: string,
): boolean {
  if (!search) return false;

  const { from, to } = editor.state.selection;
  const { doc } = editor.state;
  const selected = doc.textBetween(from, to, '');
  if (selected !== search) return false;

  editor.chain().focus().insertContentAt({ from, to }, replacement).run();
  return true;
}

/** 全部替换，返回替换次数 */
export function replaceAllInEditor(
  editor: Editor,
  search: string,
  replacement: string,
): number {
  if (!search) return 0;

  const matches = collectTextMatches(editor.state.doc, search);
  if (!matches.length) return 0;

  let tr = editor.state.tr;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { from, to } = matches[i]!;
    tr = tr.insertText(replacement, from, to);
  }
  editor.view.dispatch(tr);
  editor.commands.focus();
  return matches.length;
}

/** 当前选区结束位置对应的 textContent 偏移（用于循环查找） */
export function selectionEndTextOffset(editor: Editor): number {
  const { to } = editor.state.selection;
  const doc = editor.state.doc;
  let textOffset = 0;
  let result = 0;

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    const nodeStart = pos;
    const nodeEnd = pos + node.text.length;
    if (to >= nodeStart && to <= nodeEnd) {
      result = textOffset + (to - nodeStart);
      return false;
    }
    textOffset += node.text.length;
    return true;
  });

  return result;
}

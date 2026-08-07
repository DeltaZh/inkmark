import { Extension } from '@tiptap/core';

/** 段首水平线标记：--- / *** / ___（≥3）及智能标点后的 dash 变体 */
export function isHorizontalRuleMarker(text: string): boolean {
  const t = text.trim();
  return /^(?:-{3,}|\*{3,}|_{3,}|—{2,}|–{3,}|—-)$/.test(t);
}

/**
 * 常见习惯：段落中输入 `---` 后按回车 → 水平分割线。
 * （智能标点可能把 `--` 变成 en/em dash，故同时识别这些变体。）
 */
export const HorizontalRuleOnEnter = Extension.create({
  name: 'horizontalRuleOnEnter',

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        if ($from.parent.type.name !== 'paragraph') return false;
        if ($from.parent.content.size === 0) return false;
        if (!isHorizontalRuleMarker($from.parent.textContent)) return false;

        const from = $from.before($from.depth);
        const to = $from.after($from.depth);
        return editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContentAt(from, [
            { type: 'horizontalRule' },
            { type: 'paragraph' },
          ])
          .run();
      },
    };
  },
});

import { Extension, InputRule } from '@tiptap/core';

type SmartStorage = { enabled: boolean };

/**
 * 「智能标点」子集：直引号 → 弯引号，`--` → en/em dash。
 */
export const SmartPunctuation = Extension.create({
  name: 'smartPunctuation',

  addStorage() {
    return { enabled: true } satisfies SmartStorage;
  },

  addInputRules() {
    const extension = this;
    const enabled = () => (extension.storage as SmartStorage).enabled;

    return [
      new InputRule({
        find: /--$/,
        handler: ({ range, chain, state }) => {
          if (!enabled()) return null;
          // 段首仅连字符时留给 `---` + Enter 水平线，不转 en-dash
          const $from = state.selection.$from;
          const textBefore = $from.parent.textBetween(
            0,
            Math.max(0, range.to - $from.start()),
            undefined,
            '\ufffc',
          );
          if (/^-*$/.test(textBefore)) return null;
          chain().deleteRange(range).insertContentAt(range.from, '–').run();
        },
      }),
      new InputRule({
        find: /–-$/,
        handler: ({ range, chain, state }) => {
          if (!enabled()) return null;
          const $from = state.selection.$from;
          const textBefore = $from.parent.textBetween(
            0,
            Math.max(0, range.to - $from.start()),
            undefined,
            '\ufffc',
          );
          if (/^[–-]*$/.test(textBefore)) return null;
          chain().deleteRange(range).insertContentAt(range.from, '—').run();
        },
      }),
      new InputRule({
        find: /(?:^|[\s(])"$/,
        handler: ({ range, chain }) => {
          if (!enabled()) return null;
          chain()
            .deleteRange({ from: range.to - 1, to: range.to })
            .insertContentAt(range.to - 1, '“')
            .run();
        },
      }),
      new InputRule({
        find: /"$/,
        handler: ({ range, chain }) => {
          if (!enabled()) return null;
          chain().deleteRange(range).insertContentAt(range.from, '”').run();
        },
      }),
      new InputRule({
        find: /(?:^|[\s(])'$/,
        handler: ({ range, chain }) => {
          if (!enabled()) return null;
          chain()
            .deleteRange({ from: range.to - 1, to: range.to })
            .insertContentAt(range.to - 1, '‘')
            .run();
        },
      }),
      new InputRule({
        find: /'$/,
        handler: ({ range, chain }) => {
          if (!enabled()) return null;
          chain().deleteRange(range).insertContentAt(range.from, '’').run();
        },
      }),
    ];
  },
});

export function setSmartPunctuation(editor: { storage: unknown }, enabled: boolean) {
  const storage = (editor.storage as { smartPunctuation?: SmartStorage })
    .smartPunctuation;
  if (storage) storage.enabled = enabled;
}

export function toggleSmartPunctuation(editor: { storage: unknown }): boolean {
  const storage = (editor.storage as { smartPunctuation?: SmartStorage })
    .smartPunctuation;
  if (!storage) return false;
  storage.enabled = !storage.enabled;
  return storage.enabled;
}

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
        handler: ({ range, chain }) => {
          if (!enabled()) return null;
          chain().deleteRange(range).insertContentAt(range.from, '–').run();
        },
      }),
      new InputRule({
        find: /–-$/,
        handler: ({ range, chain }) => {
          if (!enabled()) return null;
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

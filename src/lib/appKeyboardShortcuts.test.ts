import { describe, expect, it } from 'vitest';
import { resolveAppKeyboardAction } from './appKeyboardShortcuts';

function modKey(
  key: string,
  opts: { shift?: boolean } = {},
): Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'key'> {
  return {
    metaKey: true,
    ctrlKey: false,
    shiftKey: opts.shift ?? false,
    key,
  };
}

describe('resolveAppKeyboardAction', () => {
  it('ignores all app shortcuts in Tauri (native menu owns them)', () => {
    expect(resolveAppKeyboardAction(modKey('f'), true)).toBeNull();
    expect(resolveAppKeyboardAction(modKey('n'), true)).toBeNull();
    expect(resolveAppKeyboardAction(modKey('o'), true)).toBeNull();
    expect(resolveAppKeyboardAction(modKey('s'), true)).toBeNull();
    expect(resolveAppKeyboardAction(modKey('s', { shift: true }), true)).toBeNull();
    expect(resolveAppKeyboardAction(modKey('w'), true)).toBeNull();
    expect(resolveAppKeyboardAction(modKey(','), true)).toBeNull();
  });

  it('resolves file and find shortcuts in browser dev fallback', () => {
    expect(resolveAppKeyboardAction(modKey('n'), false)).toBe('new');
    expect(resolveAppKeyboardAction(modKey('o'), false)).toBe('open');
    expect(resolveAppKeyboardAction(modKey('s'), false)).toBe('save');
    expect(resolveAppKeyboardAction(modKey('s', { shift: true }), false)).toBe(
      'saveAs',
    );
    expect(resolveAppKeyboardAction(modKey('w'), false)).toBe('closeTab');
    expect(resolveAppKeyboardAction(modKey(','), false)).toBe('settings');
    expect(resolveAppKeyboardAction(modKey('f'), false)).toBe('findReplace');
  });

  it('returns null without modifier', () => {
    expect(
      resolveAppKeyboardAction(
        { metaKey: false, ctrlKey: false, shiftKey: false, key: 's' },
        false,
      ),
    ).toBeNull();
  });
});

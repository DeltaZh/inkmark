import { describe, expect, it } from 'vitest';
import { filterCodeBlockLanguages } from './codeBlockLanguages';

describe('filterCodeBlockLanguages', () => {
  it('filters by substring', () => {
    const list = filterCodeBlockLanguages('type');
    expect(list.some((l) => l.id === 'typescript')).toBe(true);
    expect(list.every((l) => l.id.includes('type') || l.label.includes('type'))).toBe(
      true,
    );
  });

  it('keeps custom language when unknown', () => {
    const list = filterCodeBlockLanguages('zig');
    expect(list[0]).toEqual({ id: 'zig', label: 'zig' });
  });

  it('returns catalog when query empty', () => {
    expect(filterCodeBlockLanguages('').length).toBeGreaterThan(5);
  });
});

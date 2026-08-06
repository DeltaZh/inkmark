import { describe, expect, it } from 'vitest';
import {
  fileNameFromPath,
  filterQuickOpenEntries,
  mergeQuickOpenSources,
} from './openQuickly';

describe('openQuickly', () => {
  it('extracts file name', () => {
    expect(fileNameFromPath('/a/b/note.md')).toBe('note.md');
  });

  it('filters by query', () => {
    const entries = [
      { path: '/docs/a.md', name: 'a.md' },
      { path: '/docs/readme.md', name: 'readme.md' },
    ];
    expect(filterQuickOpenEntries(entries, 'read')).toEqual([
      { path: '/docs/readme.md', name: 'readme.md' },
    ]);
  });

  it('merges recent before tree and dedupes', () => {
    const merged = mergeQuickOpenSources(
      ['/r/a.md', '/r/b.md'],
      ['/r/b.md', '/t/c.md'],
    );
    expect(merged.map((e) => e.path)).toEqual([
      '/r/a.md',
      '/r/b.md',
      '/t/c.md',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  pushRecentFile,
  recentFileDisplayName,
  RECENT_FILES_MAX,
} from './recentFiles';

describe('recentFiles', () => {
  it('pushes path to front and dedupes', () => {
    expect(pushRecentFile(['/a.md', '/b.md'], '/b.md')).toEqual([
      '/b.md',
      '/a.md',
    ]);
  });

  it('caps list length', () => {
    const seed = Array.from({ length: RECENT_FILES_MAX }, (_, i) => `/${i}.md`);
    const next = pushRecentFile(seed, '/new.md');
    expect(next).toHaveLength(RECENT_FILES_MAX);
    expect(next[0]).toBe('/new.md');
    expect(next).not.toContain(`/${RECENT_FILES_MAX - 1}.md`);
  });

  it('ignores empty path', () => {
    expect(pushRecentFile(['/a.md'], '  ')).toEqual(['/a.md']);
  });

  it('extracts display name from path', () => {
    expect(recentFileDisplayName('/Users/me/notes/hello.md')).toBe('hello.md');
    expect(recentFileDisplayName('C:\\tmp\\x.md')).toBe('x.md');
  });
});

import { describe, expect, it } from 'vitest';
import {
  detectColorScheme,
  patchThemeCss,
  resolveThemeColorScheme,
} from './patches';

describe('patchThemeCss', () => {
  it('detects night bg as dark', () => {
    expect(detectColorScheme(':root { --bg-color: #363B40; }')).toBe('dark');
    expect(detectColorScheme(':root { --bg-color: #ffffff; }')).toBe('light');
  });

  it('forces dark scheme for night name', () => {
    expect(resolveThemeColorScheme('night', ':root { --bg-color: #fff; }')).toBe(
      'dark',
    );
  });

  it('appends shell bridge, color-scheme, and fence language-chip overrides', () => {
    const out = patchThemeCss(
      'night',
      ':root { --bg-color: #363B40; --text-color: #ccc; }',
    );
    expect(out).toContain('color-scheme: dark');
    expect(out).toContain('.app-shell');
    expect(out).toContain('var(--bg-color)');
    expect(out).toContain('.code-tooltip input');
    expect(out).toContain('background: transparent !important');
  });
});


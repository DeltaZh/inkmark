import { describe, expect, it } from 'vitest';
import { shouldPromptExternalChange } from './externalFileChange';

describe('shouldPromptExternalChange', () => {
  it('returns false when no known mtime', () => {
    expect(shouldPromptExternalChange(null, 100)).toBe(false);
  });

  it('returns false when disk mtime is not newer', () => {
    expect(shouldPromptExternalChange(100, 100)).toBe(false);
    expect(shouldPromptExternalChange(100, 99)).toBe(false);
  });

  it('returns true when disk mtime is newer', () => {
    expect(shouldPromptExternalChange(100, 101)).toBe(true);
  });

  it('still prompts when dirty regardless of local edits', () => {
    expect(shouldPromptExternalChange(100, 101, true)).toBe(true);
  });
});

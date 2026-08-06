import { describe, expect, it } from 'vitest';
import { countChars, countWords } from './textStats';

describe('textStats', () => {
  it('countChars counts all characters including whitespace', () => {
    expect(countChars('你好 world')).toBe(8);
    expect(countChars('')).toBe(0);
  });

  it('countWords splits on whitespace for latin and CJK runs', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('你好世界')).toBe(1);
    expect(countWords('  a  b  ')).toBe(2);
    expect(countWords('')).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { findInText, findNext } from './findReplace';

describe('findInText', () => {
  it('finds next occurrence', () => {
    expect(findInText('hello hello', 'hello', 1)).toEqual({ from: 6, to: 11 });
  });

  it('returns null when missing', () => {
    expect(findInText('abc', 'z', 0)).toBeNull();
  });

  it('returns null for empty search', () => {
    expect(findInText('abc', '', 0)).toBeNull();
  });

  it('finds from start when from is 0', () => {
    expect(findInText('hello hello', 'hello', 0)).toEqual({ from: 0, to: 5 });
  });
});

describe('findNext', () => {
  it('delegates to findInText', () => {
    expect(findNext('hello hello', 'hello', 1)).toEqual({ from: 6, to: 11 });
  });
});

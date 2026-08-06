import { afterEach, describe, expect, it } from 'vitest';
import { isTauri } from './isTauri';

describe('isTauri', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  });

  it('returns false in browser / test env without Tauri globals', () => {
    expect(isTauri()).toBe(false);
  });

  it('returns true when __TAURI_INTERNALS__ is present', () => {
    (window as Window & { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ =
      {};
    expect(isTauri()).toBe(true);
  });
});

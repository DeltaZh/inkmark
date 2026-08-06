import { afterEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Editor } from './Editor';

describe('Editor shell', () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
  });

  it('mounts single #write on ProseMirror editable root without split preview', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(
        createElement(Editor, {
          markdown: '# Hello',
          onChangeMarkdown: () => {},
        }),
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });

    const write = document.getElementById('write');
    expect(write).toBeTruthy();
    expect(document.querySelectorAll('#write')).toHaveLength(1);
    // 选择器 `#write > h1` 要求 id 挂在可编辑根上，而非外层包装
    expect(write?.classList.contains('ProseMirror')).toBe(true);
    expect(document.querySelector('#write > h1')?.textContent).toBe('Hello');
    expect(document.querySelector('.split-pane, .markdown-preview')).toBeNull();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';
import {
  setFocusMode,
  setTypewriterMode,
  toggleFocusMode,
  toggleTypewriterMode,
} from './viewModes';

describe('viewModes', () => {
  let editor: Editor;
  let root: HTMLElement;

  afterEach(() => {
    editor?.destroy();
    root?.remove();
    document.body.classList.remove('on-focus-mode');
  });

  function mount(md = '# Hello\n\nParagraph one.\n\nParagraph two.\n') {
    root = document.createElement('div');
    root.className = 'editor-root';
    Object.defineProperty(root, 'getBoundingClientRect', {
      value: () => ({
        top: 0,
        left: 0,
        width: 800,
        height: 600,
        bottom: 600,
        right: 800,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    root.scrollTo = () => {};
    document.body.appendChild(root);
    editor = new Editor({
      element: root,
      extensions: createExtensions(),
      content: md,
      contentType: 'markdown',
    });
    return root;
  }

  it('toggles focus mode on and off', () => {
    mount();
    expect(toggleFocusMode(editor)).toBe(true);
    expect(document.body.classList.contains('on-focus-mode')).toBe(true);
    expect(editor.view.dom.querySelector('.md-focus')).toBeTruthy();

    expect(toggleFocusMode(editor)).toBe(false);
    expect(document.body.classList.contains('on-focus-mode')).toBe(false);
    expect(editor.view.dom.querySelector('.md-focus')).toBeFalsy();
  });

  it('setFocusMode(false) cancels focus mode', () => {
    mount();
    setFocusMode(editor, true);
    setFocusMode(editor, false);
    expect(document.body.classList.contains('on-focus-mode')).toBe(false);
  });

  it('toggles typewriter mode on and off without hanging', async () => {
    mount();
    expect(toggleTypewriterMode(editor)).toBe(true);
    editor.commands.focus();
    editor.commands.insertContent('y');
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(toggleTypewriterMode(editor)).toBe(false);
    setTypewriterMode(editor, false);
  });

  it('keeps focus highlight on the current block after selection moves', () => {
    mount('# A\n\nB paragraph\n\nC paragraph\n');
    toggleFocusMode(editor);
    editor.commands.setTextSelection(editor.state.doc.content.size - 2);
    const focused = editor.view.dom.querySelector('.md-focus');
    expect(focused?.textContent ?? '').toMatch(/C/);
  });

  it('marks list item as focus container', () => {
    mount('- item one\n- item two\n');
    toggleFocusMode(editor);
    editor.commands.setTextSelection(4);
    expect(editor.view.dom.querySelector('.md-focus-container')).toBeTruthy();
  });
});

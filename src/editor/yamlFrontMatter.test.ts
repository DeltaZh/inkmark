import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';
import { looksLikeYamlFrontMatter } from './yamlFrontMatter';

describe('looksLikeYamlFrontMatter', () => {
  it('accepts key: value blocks', () => {
    expect(looksLikeYamlFrontMatter('title: hello\nauthor: delta\n')).toBe(true);
  });

  it('rejects markdown body between thematic breaks', () => {
    expect(
      looksLikeYamlFrontMatter(
        '\n## 0. 业务背景\n\n| 项 | 说明 |\n|---|---|\n| a | b |\n',
      ),
    ).toBe(false);
  });

  it('rejects empty body', () => {
    expect(looksLikeYamlFrontMatter('\n\n')).toBe(false);
  });
});

describe('yamlFrontMatter tokenizer vs thematic breaks', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it('does not swallow sections between --- horizontal rules', () => {
    const md = `# Title

> quote

---

## Section

| a | b |
|---|---|
| 1 | 2 |

---

## Next
`;
    editor = new Editor({
      extensions: createExtensions(),
      content: md,
      contentType: 'markdown',
    });
    const types = (editor.getJSON().content ?? []).map((n) => n.type);
    expect(types).not.toContain('yamlFrontMatter');
    expect(types).toContain('horizontalRule');
    expect(types).toContain('table');
    expect(types.filter((t) => t === 'heading').length).toBeGreaterThanOrEqual(3);
    expect(editor.getHTML()).toMatch(/<h2[^>]*>[\s\S]*Section/);
    expect(editor.getHTML()).toMatch(/<table/i);
  });

  it('still parses real front matter at document start', () => {
    const md = `---
title: hello
draft: false
---

# Body
`;
    editor = new Editor({
      extensions: createExtensions(),
      content: md,
      contentType: 'markdown',
    });
    const types = (editor.getJSON().content ?? []).map((n) => n.type);
    expect(types[0]).toBe('yamlFrontMatter');
    expect(types).toContain('heading');
    expect(editor.getHTML()).toMatch(/md-yaml/);
  });

  it('parses auto-invoice integration doc without false yaml blocks', () => {
    const path =
      '/Users/delta/RiderProjects/lemi.microservice.api/docs/superpowers/specs/2026-08-08-auto-invoice-frontend-integration.md';
    let md: string;
    try {
      md = readFileSync(path, 'utf8');
    } catch {
      return; // 本机无该文件时跳过
    }
    editor = new Editor({
      extensions: createExtensions(),
      content: md,
      contentType: 'markdown',
    });
    const types = (editor.getJSON().content ?? []).map((n) => n.type);
    const yamlCount = types.filter((t) => t === 'yamlFrontMatter').length;
    expect(yamlCount).toBe(0);
    expect(editor.getHTML()).toMatch(/<h3[^>]*>[\s\S]*开票列表/);
    expect(editor.getHTML()).toMatch(/<(strong|b)>修改建议<\/(strong|b)>/);
    expect(editor.getHTML()).toMatch(/SaveInvoiceFileAsync/);
    expect(editor.getHTML()).toMatch(/<h2[^>]*>[\s\S]*状态与来源枚举/);
    expect(editor.getHTML()).toMatch(/GetSysConfigValue/);
    expect(types.filter((t) => t === 'table').length).toBeGreaterThanOrEqual(5);
  });
});

import { describe, expect, it } from 'vitest';
import { marked } from 'marked';
import { adaptHtmlForTipTap } from './adaptHtmlForTipTap';
import { markdownToHtml } from './parse';
import { serializeMarkdown } from './serialize';

marked.setOptions({ gfm: true, breaks: false });

describe('adaptHtmlForTipTap', () => {
  it('converts GFM checkbox lists into TipTap taskList markup', () => {
    const raw = marked.parse('- [ ] todo\n- [x] done\n', {
      async: false,
    }) as string;
    const adapted = adaptHtmlForTipTap(raw);

    expect(adapted).toContain('data-type="taskList"');
    expect(adapted).toContain('data-type="taskItem"');
    expect(adapted).toContain('data-checked="false"');
    expect(adapted).toContain('data-checked="true"');
    expect(adapted).not.toMatch(/<input[^>]*type="checkbox"/i);
    expect(adapted).toMatch(/<p>todo<\/p>/);
    expect(adapted).toMatch(/<p>done<\/p>/);
  });

  it('roundtrips task lists through markdownToHtml + serialize', () => {
    const md = `- [ ] todo\n- [x] done\n`;
    const back = serializeMarkdown(markdownToHtml(md));
    expect(back).toMatch(/\[ \]/);
    expect(back).toMatch(/\[x\]/i);
  });

  it('keeps normal unordered lists untouched', () => {
    const raw = marked.parse('- a\n- b\n', { async: false }) as string;
    const adapted = adaptHtmlForTipTap(raw);
    expect(adapted).not.toContain('taskList');
    expect(adapted).toContain('<li>');
  });
});

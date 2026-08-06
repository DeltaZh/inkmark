import { describe, it, expect } from 'vitest';
import { markdownToHtml } from './parse';
import { serializeMarkdown } from './serialize';

describe('markdown roundtrip', () => {
  it('preserves headings lists and emphasis', () => {
    const md = `# Title

Hello **world** and *it*.

- a
- b

1. one
2. two

> quote

\`\`\`js
const x = 1;
\`\`\`
`;
    const html = markdownToHtml(md);
    const back = serializeMarkdown(html);
    expect(back).toContain('# Title');
    expect(back).toContain('**world**');
    expect(back).toMatch(/- a/);
    expect(back).toContain('```js');
    expect(back).toContain('const x = 1;');
  });

  it('preserves task list items', () => {
    const md = `- [ ] todo\n- [x] done\n`;
    const back = serializeMarkdown(markdownToHtml(md));
    expect(back).toMatch(/\[ \]/);
    expect(back).toMatch(/\[x\]/i);
  });
});

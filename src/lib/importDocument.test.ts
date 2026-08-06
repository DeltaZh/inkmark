import { describe, expect, it } from 'vitest';
import { htmlToMarkdownRough } from './importDocument';

describe('htmlToMarkdownRough', () => {
  it('converts headings paragraphs and emphasis', () => {
    const md = htmlToMarkdownRough(
      '<h1>Title</h1><p>Hello <strong>bold</strong> and <em>italic</em></p>',
    );
    expect(md).toContain('# Title');
    expect(md).toContain('**bold**');
    expect(md).toContain('*italic*');
  });

  it('converts list items and links', () => {
    const md = htmlToMarkdownRough(
      '<ul><li>one</li><li><a href="https://example.com">two</a></li></ul>',
    );
    expect(md).toContain('- one');
    expect(md).toContain('[two](https://example.com)');
  });
});

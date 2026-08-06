import { describe, expect, it } from 'vitest';
import { buildExportHtmlDocument } from './exportDocument';

describe('buildExportHtmlDocument', () => {
  it('embeds title, theme css and write body', () => {
    const html = buildExportHtmlDocument({
      title: '演示 <文档>',
      bodyHtml: '<h1>标题</h1><p>正文</p>',
      themeCss: '#write { color: red; }',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>演示 &lt;文档&gt;</title>');
    expect(html).toContain('#write { color: red; }');
    expect(html).toContain('id="write"');
    expect(html).toContain('<h1>标题</h1><p>正文</p>');
    expect(html).toContain('class="delta-export"');
  });
});

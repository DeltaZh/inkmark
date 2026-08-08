import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';

const md = `### 1.2 开票列表（字段扩展

**修改建议**：

- \`SaveInvoiceFileAsync\`：上传附件

## 5. 状态与来源枚举（前端映射备用）

> 实际 URL 以网关 + Swagger 为准；方法名以本文为准。

| 端 | 方法 | 新旧 | 用途 |
|---|---|---|---|
| WEB | \`SysConfig/GetSysConfigValue\` | **新** | 读 \`AutoInvoiceSwitch\`，人工开票页提醒 |
| WEB | \`InvoiceManage/GetApplyInvoiceList\` | 扩展 | 列表展示自动开票进度 |
| WEB | \`InvoiceManage/SaveInvoiceFile\` | 原有 | 人工上传附件 |
| WEB | \`InvoiceManage/SaveInvoiceState\` | 原有 | 人工设已开票 |
| WEB | \`OrderManage/GetAfterSalesInfo\` | 扩展 | 售后详情红票 |
| WEB | \`OrderManage/SaveAfterSalesRedInvoice\` | **新** | 人工回填红票 |
| 小程序 | 开票申请相关 | 行为收紧 | 仅普票 |
`;

describe('user style-match sample', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it('parses headings, bold, list, code, quote, table', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: md,
      contentType: 'markdown',
    });
    const html = editor.getHTML();
    const types = (editor.getJSON().content ?? []).map((n) => n.type);
    // eslint-disable-next-line no-console
    console.log('TYPES', types);
    // eslint-disable-next-line no-console
    console.log('HTML', html);

    expect(html).toMatch(/<h3[^>]*>[\s\S]*开票列表/);
    expect(html).toMatch(/<h2[^>]*>[\s\S]*状态与来源枚举/);
    expect(html).toMatch(/<(strong|b)>修改建议<\/(strong|b)>/);
    expect(html).toMatch(/<ul[\s\S]*SaveInvoiceFileAsync/);
    expect(html).toMatch(/<blockquote[\s\S]*Swagger/);
    expect(html).toMatch(/<table[\s\S]*GetSysConfigValue[\s\S]*<\/table>/i);
  });
});

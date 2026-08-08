import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';

/** 用户反馈「展示很乱」的样例：含中文与行内 code */
const sampleTable = `| 项 | 说明 |
|---|---|
| 小程序展示红票明细 | 非必须 |
| 前端发起自动开票/红冲 | 由后端 Job/退款流程触发 |
| 展示 \`blueLineMapping\` JSON | 不对运营展示 |
| 整单冲完后的特殊订单态 | 后端尚未收口，前端暂不改 |
`;

describe('GFM table markdown parse', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it('parses pipe table with inline code into table node', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: sampleTable,
      contentType: 'markdown',
    });
    const json = editor.getJSON();
    expect(json.content?.[0]?.type).toBe('table');
    expect(editor.getHTML()).toMatch(/<table[\s\S]*blueLineMapping[\s\S]*<\/table>/i);
    expect(editor.getHTML()).toMatch(/<code>blueLineMapping<\/code>/);
  });
});

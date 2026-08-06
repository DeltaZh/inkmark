import { describe, expect, it, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';

describe('TaskAutoConvert', () => {
  let editor: Editor;

  afterEach(() => editor?.destroy());

  it('converts bullet item starting with [ ] into taskItem (Editor typing path)', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: '- [ ] 待办\n',
      // 故意用 html/json 模拟「先变成普通列表再带字面量 [ ]」的路径：
      // 先插入普通 bullet
      contentType: 'markdown',
    });

    // 重建成「错误」状态：bullet + 字面 [ ]
    editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: '[ ] 待办' }],
                },
              ],
            },
          ],
        },
      ],
    });

    // 触发一次文档变更以跑 appendTransaction
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, '!');

    const json = editor.getJSON();
    const taskList = json.content?.find((n) => n.type === 'taskList');
    expect(taskList).toBeTruthy();
    expect(taskList?.content?.[0]?.type).toBe('taskItem');
    const html = editor.getHTML();
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('待办');
    expect(html.includes('[ ] 待办')).toBe(false);
  });
});

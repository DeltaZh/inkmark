import { describe, expect, it, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';

const SAMPLE = `# Hello

开始用所见即所得方式书写 Markdown。

- 列表项
- 另一项

- [ ] 待办事项
- [x] 已完成

\`\`\`ts
const x = 1;
\`\`\`

~~删除线~~ 与 **粗体** *斜体*
`;


describe('TipTap Markdown task list (parity)', () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it('parses - [ ] / - [x] into taskList with checkboxes', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: `- [ ] todo\n- [x] done\n`,
      contentType: 'markdown',
    });

    const json = editor.getJSON();
    const taskList = json.content?.find((n) => n.type === 'taskList');
    expect(taskList).toBeTruthy();
    const items = taskList?.content ?? [];
    expect(items[0]?.type).toBe('taskItem');
    expect(items[0] && 'attrs' in items[0] ? items[0].attrs?.checked : null).toBe(
      false,
    );
    expect(items[1] && 'attrs' in items[1] ? items[1].attrs?.checked : null).toBe(
      true,
    );

    const html = editor.getHTML();
    expect(html).toContain('md-task-list-item');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toMatch(/>\s*\[ \]/);

    const md = (editor as Editor & { getMarkdown: () => string }).getMarkdown();
    expect(md).toMatch(/\[ \]/);
    expect(md).toMatch(/\[x\]/i);
  });

  it('parses app INITIAL_MARKDOWN sample with mixed lists', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: SAMPLE,
      contentType: 'markdown',
    });

    const json = editor.getJSON();
    const taskList = json.content?.find((n) => n.type === 'taskList');
    expect(taskList, 'expected taskList node in INITIAL sample').toBeTruthy();

    const html = editor.getHTML();
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('待办事项');
    // 字面量 [ ] 不应出现在可见文本里（checkbox 旁）
    expect(html.includes('[ ] 待办') || html.includes('[x] 已完成')).toBe(false);
    expect(html).toMatch(/<(s|del|strike)[\s>]/i);
    expect(html).toContain('删除线');
  });
});


/**
 * 将 marked(GFM) 输出的 HTML 调整为 TipTap 可正确解析的结构。
 * 关键：任务列表 — marked 产出 `<li><input type="checkbox">…</li>`，
 * TipTap TaskList 需要 `ul/li[data-type]` + 段落包裹。
 */
export function adaptHtmlForTipTap(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  for (const ul of Array.from(doc.body.querySelectorAll('ul'))) {
    const items = Array.from(ul.children).filter(
      (el): el is HTMLLIElement => el.tagName === 'LI',
    );
    if (items.length === 0) continue;

    const isTaskList = items.every((li) =>
      Boolean(li.querySelector(':scope > input[type="checkbox"]')),
    );
    if (!isTaskList) continue;

    ul.setAttribute('data-type', 'taskList');

    for (const li of items) {
      const input = li.querySelector(':scope > input[type="checkbox"]');
      if (!input) continue;

      const checked =
        input.hasAttribute('checked') ||
        (input as HTMLInputElement).checked === true;

      li.setAttribute('data-type', 'taskItem');
      li.setAttribute('data-checked', checked ? 'true' : 'false');
      input.remove();

      // TipTap TaskItem 内容模型为 paragraph+
      const hasBlock = Array.from(li.childNodes).some(
        (n) =>
          n.nodeType === Node.ELEMENT_NODE &&
          ['P', 'UL', 'OL', 'PRE', 'BLOCKQUOTE', 'DIV'].includes(
            (n as Element).tagName,
          ),
      );
      if (!hasBlock) {
        const p = doc.createElement('p');
        while (li.firstChild) {
          p.appendChild(li.firstChild);
        }
        // 去掉 marked 在 checkbox 后留下的前导空格
        if (p.firstChild?.nodeType === Node.TEXT_NODE) {
          p.firstChild.textContent =
            p.firstChild.textContent?.replace(/^\s+/, '') ?? '';
        }
        li.appendChild(p);
      }
    }
  }

  return doc.body.innerHTML;
}

/** 通过隐藏 iframe 打印完整 HTML 文档（对齐浏览器打印流程）。 */
export function printHtmlDocument(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', '打印预览');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error('无法创建打印视图');
  }

  doc.open();
  doc.write(html);
  doc.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  win.addEventListener('afterprint', cleanup);
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      cleanup();
      throw e;
    }
    window.setTimeout(cleanup, 60_000);
  }, 200);
}

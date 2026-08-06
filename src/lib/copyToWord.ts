/**
 * 将当前正文以 HTML 放入剪贴板，便于粘贴到 MS Word（对齐常见所见即所得习惯「复制到 MS Word」）。
 */
export async function copyHtmlForWord(html: string): Promise<void> {
  const blobHtml = new Blob([html], { type: 'text/html' });
  const blobText = new Blob([stripTags(html)], { type: 'text/plain' });

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      }),
    ]);
    return;
  }

  await navigator.clipboard.writeText(html);
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

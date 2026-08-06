/** 生成 GFM 表格 Markdown（首行为表头）。 */
export function buildMarkdownTable(rows: number, cols: number): string {
  const r = Math.max(1, rows);
  const c = Math.max(1, cols);
  const header = Array.from({ length: c }, (_, i) => `列${i + 1}`);
  const sep = Array.from({ length: c }, () => '---');
  const body = Array.from({ length: Math.max(0, r - 1) }, () =>
    Array.from({ length: c }, () => ' '),
  );
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...body.map((cells) => `| ${cells.join(' | ')} |`),
  ];
  return `${lines.join('\n')}\n`;
}

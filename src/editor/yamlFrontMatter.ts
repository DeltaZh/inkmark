/**
 * 判断 --- 围栏内文本是否像 YAML front matter（而非两段水平线之间的正文）。
 */
export function looksLikeYamlFrontMatter(body: string): boolean {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return false;

  let keyLines = 0;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('#')) continue;
    if (/^[\w.-]+\s*:/.test(t)) {
      keyLines += 1;
      continue;
    }
    // 缩进续行
    if (/^\s+\S/.test(line) && keyLines > 0) continue;
    return false;
  }
  return keyLines > 0;
}

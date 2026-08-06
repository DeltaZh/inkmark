/** 字符数（含空白） */
export function countChars(text: string): number {
  return text.length;
}

/** 按空白分词；连续非空白为一词（含整段中文） */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

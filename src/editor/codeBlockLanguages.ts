/** 编辑器风格代码块语言列表（可输入筛选） */
export const CODE_BLOCK_LANGUAGES = [
  { id: 'plaintext', label: 'plaintext' },
  { id: 'javascript', label: 'javascript' },
  { id: 'typescript', label: 'typescript' },
  { id: 'json', label: 'json' },
  { id: 'sql', label: 'sql' },
  { id: 'python', label: 'python' },
  { id: 'rust', label: 'rust' },
  { id: 'go', label: 'go' },
  { id: 'java', label: 'java' },
  { id: 'c', label: 'c' },
  { id: 'cpp', label: 'cpp' },
  { id: 'csharp', label: 'csharp' },
  { id: 'bash', label: 'bash' },
  { id: 'shell', label: 'shell' },
  { id: 'html', label: 'html' },
  { id: 'css', label: 'css' },
  { id: 'xml', label: 'xml' },
  { id: 'yaml', label: 'yaml' },
  { id: 'markdown', label: 'markdown' },
  { id: 'mermaid', label: 'mermaid' },
  { id: 'swift', label: 'swift' },
  { id: 'kotlin', label: 'kotlin' },
  { id: 'ruby', label: 'ruby' },
  { id: 'php', label: 'php' },
] as const;

export type CodeBlockLanguageId = (typeof CODE_BLOCK_LANGUAGES)[number]['id'];

export type CodeBlockLanguageOption = {
  id: string;
  label: string;
};

/** 按关键字筛选语言；未知输入保留为自定义项（对齐常见所见即所得习惯）。 */
export function filterCodeBlockLanguages(
  query: string,
  catalog: readonly CodeBlockLanguageOption[] = CODE_BLOCK_LANGUAGES,
): CodeBlockLanguageOption[] {
  const q = query.trim().toLowerCase();
  const list = catalog.filter(
    (l) => !q || l.id.includes(q) || l.label.toLowerCase().includes(q),
  );
  if (q && !list.some((l) => l.id === q)) {
    return [{ id: q, label: q }, ...list];
  }
  return [...list];
}

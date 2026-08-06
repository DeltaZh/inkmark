export type QuickOpenEntry = {
  path: string;
  name: string;
};

export type TreeLikeNode = {
  path: string;
  kind: string;
  children?: TreeLikeNode[];
};

/** 从文件树节点收集 Markdown 文件路径 */
export function collectFilePathsFromTree(nodes: TreeLikeNode[]): string[] {
  const out: string[] = [];
  const walk = (list: TreeLikeNode[]) => {
    for (const n of list) {
      if (n.kind === 'file') out.push(n.path);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** 从绝对路径取文件名 */
export function fileNameFromPath(path: string): string {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(i + 1) : path;
}

/** 按查询过滤快速打开候选（路径或文件名包含关键字，大小写不敏感）。 */
export function filterQuickOpenEntries(
  entries: QuickOpenEntry[],
  query: string,
  limit = 40,
): QuickOpenEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries.slice(0, limit);
  return entries
    .filter(
      (e) =>
        e.name.toLowerCase().includes(q) || e.path.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

/** 合并最近文件与文件树叶子，去重（先最近后树）。 */
export function mergeQuickOpenSources(
  recent: string[],
  treePaths: string[],
): QuickOpenEntry[] {
  const seen = new Set<string>();
  const out: QuickOpenEntry[] = [];
  for (const path of [...recent, ...treePaths]) {
    const t = path.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push({ path: t, name: fileNameFromPath(t) });
  }
  return out;
}

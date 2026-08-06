import { useEffect, useState } from 'react';
import {
  formatFileError,
  listDirMarkdown,
  type MarkdownTreeNode,
} from '../ipc/files';

export type FileTreeSidebarProps = {
  /** 当前打开的文件夹绝对路径 */
  root: string | null;
  activePath?: string | null;
  onOpenFile: (path: string) => void;
  onOpenFolder: () => void;
  /** 变更时重新拉取目录列表 */
  refreshToken?: number;
};

function TreeNode({
  node,
  depth,
  activePath,
  onOpenFile,
}: {
  node: MarkdownTreeNode;
  depth: number;
  activePath?: string | null;
  onOpenFile: (path: string) => void;
}) {
  const isDir = node.kind === 'dir';
  const [open, setOpen] = useState(depth < 1);
  const active = activePath === node.path;
  const pad = 8 + depth * 12;

  if (isDir) {
    return (
      <li className="file-tree__item">
        <button
          type="button"
          className="file-tree__row file-tree__row--dir"
          style={{ paddingInlineStart: `${pad}px` }}
          title={node.path}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="file-tree__twist" aria-hidden>
            {open ? '▼' : '▶'}
          </span>
          <span className="file-tree__name">{node.name}</span>
        </button>
        {open && (node.children?.length ?? 0) > 0 ? (
          <ul className="file-tree__list">
            {node.children!.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                onOpenFile={onOpenFile}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <li className="file-tree__item">
      <button
        type="button"
        className={`file-tree__row file-tree__row--file${active ? ' file-tree__row--active' : ''}`}
        style={{ paddingInlineStart: `${pad + 14}px` }}
        title={node.path}
        onClick={() => onOpenFile(node.path)}
      >
        <span className="file-tree__name">{node.name}</span>
      </button>
    </li>
  );
}

export function FileTreeSidebar({
  root,
  activePath,
  onOpenFile,
  onOpenFolder,
  refreshToken = 0,
}: FileTreeSidebarProps) {
  const [entries, setEntries] = useState<MarkdownTreeNode[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    if (!root) {
      setEntries([]);
      setTruncated(false);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listDirMarkdown(root)
      .then((listing) => {
        if (cancelled) return;
        setEntries(listing.entries);
        setTruncated(listing.truncated);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(formatFileError(e));
        setEntries([]);
        setTruncated(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [root, refreshToken, localRefresh]);

  const rootName = root
    ? root.replace(/\\/g, '/').split('/').filter(Boolean).pop() || root
    : '';

  return (
    <div className="file-tree" aria-label="文件树">
      <div className="file-tree__header">
        <div className="file-tree__title-row">
          <h2 className="file-tree__title" title={root ?? undefined}>
            {root ? rootName : '文件'}
          </h2>
          <div className="file-tree__actions">
            <button
              type="button"
              className="file-tree__action"
              onClick={onOpenFolder}
              title="打开文件夹"
            >
              打开
            </button>
            <button
              type="button"
              className="file-tree__action"
              onClick={() => setLocalRefresh((n) => n + 1)}
              disabled={!root || loading}
              title="刷新文件列表"
            >
              刷新
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="file-tree__empty">正在加载…</p>
      ) : error ? (
        <p className="file-tree__empty file-tree__empty--error">{error}</p>
      ) : !root ? (
        <div className="file-tree__empty-block">
          <p className="file-tree__empty">尚未打开文件夹</p>
          <button
            type="button"
            className="file-tree__cta"
            onClick={onOpenFolder}
          >
            打开文件夹…
          </button>
        </div>
      ) : entries.length === 0 ? (
        <p className="file-tree__empty">此文件夹中没有 Markdown 文件</p>
      ) : (
        <nav className="file-tree__nav">
          {truncated ? (
            <p className="file-tree__hint">列表已截断，仅显示部分文件</p>
          ) : null}
          <ul className="file-tree__list">
            {entries.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                activePath={activePath}
                onOpenFile={onOpenFile}
              />
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

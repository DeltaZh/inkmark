export type HelpDialogProps = {
  open: boolean;
  onClose: () => void;
  onOpenReadme: () => void;
};

export function HelpDialog({ open, onClose, onOpenReadme }: HelpDialogProps) {
  if (!open) return null;

  return (
    <div className="settings-overlay" role="presentation" onClick={onClose}>
      <div
        className="settings-dialog help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-dialog__header">
          <h2 id="help-dialog-title">Inkmark 帮助</h2>
          <button
            type="button"
            className="settings-dialog__close"
            onClick={onClose}
            aria-label="关闭帮助"
          >
            ×
          </button>
        </header>

        <div className="settings-dialog__body help-dialog__body">
          <p>所见即所得 Markdown 编辑器，面向 macOS 写作场景。</p>

          <h3>常用操作</h3>
          <ul>
            <li>文件 → 打开 / 打开文件夹 / 快速打开 / 导入（Markdown、HTML、Word）</li>
            <li>文件 → 导出 HTML（含/无样式）/ PDF / Word，或打印</li>
            <li>编辑 → 拼写检查、复制到 MS Word（也可点状态栏切换拼写）</li>
            <li>视图 → 大纲、文件树、源代码 / 专注 / 打字机模式</li>
            <li>图片：右键 → 缩放图片（写入 <code>style=&quot;zoom:N%&quot;</code>）</li>
          </ul>

          <h3>快捷键（节选）</h3>
          <ul>
            <li>⌘N 新建 · ⌘O 打开 · ⌘⇧P 快速打开 · ⌘S 保存 · ⌘P 打印</li>
            <li>⌘B / ⌘I / ⌘U 加粗 / 斜体 / 下划线</li>
            <li>⌘1–6 标题 · ⌘F 查找 · ⌘/ 源代码模式</li>
          </ul>

          <p className="help-dialog__hint">
            更完整的说明见仓库 README。
          </p>
        </div>

        <footer className="settings-dialog__footer">
          <button type="button" onClick={onClose}>
            关闭
          </button>
          <button
            type="button"
            className="settings-dialog__primary"
            onClick={onOpenReadme}
          >
            打开 README…
          </button>
        </footer>
      </div>
    </div>
  );
}

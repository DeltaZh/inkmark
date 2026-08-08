# Inkmark

本地 Markdown 所见即所得编辑器（Tauri 2 + React + TipTap）。

原名 **delta-ink**，现已重品牌为 **Inkmark**（仓库：https://github.com/DeltaZh/inkmark）。

## 特性

- 真·所见即所得编辑（非左右分栏预览）
- 内置默认主题（`github`），支持导入自定义 CSS 主题
- 可选扫描本机社区主题目录，兼容常见主题结构（`#write`、任务列表、代码块等钩子）
- 多标签、大纲、文件树、图片资源、查找替换、导出 HTML/PDF 等
- 源码 / 所见即所得一键切换；支持 Markdown 文件关联打开

## 要求

- macOS（第一版主推；Windows 可打包）
- Node.js 22+
- Rust stable（Tauri）

## 快速开始

```bash
git clone https://github.com/DeltaZh/inkmark.git
cd inkmark
npm install
npm run tauri dev
```

## 脚本

| 命令 | 说明 |
|------|------|
| `npm install` | 安装前端依赖 |
| `npm run dev` | 仅 Vite 前端 |
| `npm run tauri dev` | 完整桌面应用（开发） |
| `npm test` | Vitest 单测 |
| `npm run build` | TypeScript 检查 + 前端生产构建 |
| `npm run tauri build` | 打包桌面应用（macOS：`Inkmark.app` / DMG） |

建议提交前本地验证：

```bash
npm test && npm run build && (cd src-tauri && cargo test)
```

## 安装与标识

| 项 | 值 |
|----|-----|
| 显示名 | Inkmark |
| Bundle ID | `app.inkmark` |
| 应用数据目录 | `~/Library/Application Support/app.inkmark/` |
| 打包产物 | `src-tauri/target/release/bundle/macos/Inkmark.app` |

从旧版 **delta-ink**（`app.delta.ink`）升级时，请将原应用数据目录复制/合并到 `app.inkmark`（含 `settings.json`、`drafts/`、`themes/` 等）。本机若已装过旧版，可将旧目录备份后迁移，避免设置与草稿丢失。

安装包需自行构建（见 [releases/README.md](releases/README.md)）；正式使用建议复制 `Inkmark.app` 到 `/Applications`。

## 主题

- **内置**：`resources/editor/themes/`（默认 `github`）
- **本应用**：`~/Library/Application Support/app.inkmark/themes`
- **社区目录**：设置中可开启扫描本机常见社区主题文件夹
- **导入**：主题选择器中「导入主题」选择任意 `.css`

切换主题后会写入设置；下次启动自动恢复上次选择。

## 文档

- 设计规格：[docs/superpowers/specs/2026-08-06-delta-ink-design.md](docs/superpowers/specs/2026-08-06-delta-ink-design.md)
- 重品牌说明：[docs/superpowers/specs/2026-08-08-inkmark-rebrand-design.md](docs/superpowers/specs/2026-08-08-inkmark-rebrand-design.md)
- 验收清单：[docs/superpowers/plans/v1-acceptance.md](docs/superpowers/plans/v1-acceptance.md)

## License

[MIT](./LICENSE) © DeltaZh

免费、可商用、可二次开发；再分发时须保留版权与许可声明。

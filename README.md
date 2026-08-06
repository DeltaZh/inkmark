# delta-ink

macOS 所见即所得 Markdown 编辑器（Tauri 2 + React + TipTap）。

## 特性

- 真·所见即所得编辑（非左右分栏预览）
- 内置默认主题（`github`），支持导入自定义 CSS 主题
- 可选扫描本机社区主题目录，兼容常见主题结构（`#write`、任务列表、代码块等钩子）
- 多标签、大纲、文件树、图片资源、查找替换、导出 HTML/PDF 等

## 要求

- macOS
- Node.js 22+
- Rust stable（Tauri）

## 脚本

| Command | Description |
|---------|-------------|
| `npm install` | 安装前端依赖 |
| `npm run dev` | Vite 开发服务器 |
| `npm run tauri dev` | 完整桌面应用 |
| `npm test` | Vitest 单测 |
| `npm run build` | TypeScript 检查 + 生产构建 |
| `npm run tauri build` | 打包 macOS 应用 |

```bash
npm test && npm run build && (cd src-tauri && cargo test)
```

## 开发

```bash
npm install
npm run tauri dev
```

## 主题

- **内置**：`resources/editor/themes/`（默认 `github`）
- **本应用**：`~/Library/Application Support/delta-ink/themes`
- **社区目录**：设置中可开启扫描本机常见社区主题文件夹
- **导入**：主题选择器中「导入主题」选择任意 `.css`

切换主题后会写入设置；下次启动自动恢复上次选择。

## 验收

手工清单：[docs/superpowers/plans/v1-acceptance.md](docs/superpowers/plans/v1-acceptance.md)

## License

[MIT](./LICENSE) © DeltaZh

免费、可商用、可二次开发；再分发时须保留版权与许可声明。

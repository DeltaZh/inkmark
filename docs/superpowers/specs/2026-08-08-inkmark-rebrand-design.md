# Inkmark 重品牌设计

**日期：** 2026-08-08  
**状态：** 已批准（用户选 C）  
**范围：** 显示名、Bundle ID、本地目录、GitHub 仓库、应用图标

## 1. 目标

将原 `delta-ink` 重品牌为 **Inkmark**（一看即懂的 Markdown 写作工具），去掉个人昵称 delta。

## 2. 命名映射

| 项 | 旧 | 新 |
|---|---|---|
| 显示名 / 窗口标题 | delta-ink | Inkmark |
| npm / Cargo 包名 | delta-ink | inkmark |
| Bundle ID | app.delta.ink | app.inkmark |
| macOS 应用包 | delta-ink.app | Inkmark.app |
| 本地目录 | `~/cursorProject/delta-ink` | `~/cursorProject/inkmark` |
| GitHub 仓库 | DeltaZh/delta-ink | DeltaZh/inkmark |

## 3. 图标

- 风格：简洁方标，深墨色底 + 浅色「墨滴/笔尖」剪影
- 产出：`src-tauri/icons/` 全套（png / icns / ico），经 `tauri icon` 生成
- Dock / Finder / 文档关联共用同一套

## 4. 非目标

- 不改编辑器功能与主题兼容策略
- 不迁移旧 Bundle ID 下的用户设置（早期版本可接受重置）
- 不改已发布 Release 资产文件名历史

## 5. 验收

- 窗口标题与 About 显示 Inkmark
- `/Applications/Inkmark.app` 图标为新标
- `defaults read` / 包内 Info.plist 的 CFBundleIdentifier 为 `app.inkmark`
- 仓库远程与本地目录名为 inkmark

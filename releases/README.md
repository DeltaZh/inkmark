# Installers

构建产物放在本目录对应版本子目录（如 `v0.1.0/`），并通过 [GitHub Releases](https://github.com/DeltaZh/delta-ink/releases) 发布。

大体积安装包不会提交进 git 历史；请从 Release 页面下载。

本地构建：

```bash
# macOS
npm run tauri build -- --bundles dmg

# Windows（需在 Windows 环境或 CI）
npm run tauri build -- --bundles nsis,msi
```

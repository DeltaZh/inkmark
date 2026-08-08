# Installers

本仓库**不托管**预编译安装包。请自行在本机或 CI 中打包。

本地构建产物可放在本目录对应版本子目录（如 `v0.1.0/`）；大体积文件已加入 `.gitignore`，不会进入 git 历史。

## 本地构建

```bash
npm ci

# macOS
npm run tauri build -- --bundles dmg

# Windows（需在 Windows 环境）
npm run tauri build -- --bundles nsis,msi
```

也可在 GitHub Actions 手动触发 `.github/workflows/release.yml`，从 Actions Artifacts 下载构建结果（不会自动创建 Release）。

## macOS 安装后

构建目录 `src-tauri/target/release/bundle/macos/Inkmark.app` 会被 Spotlight 搜到。若已复制到 `/Applications`，可运行：

```bash
./scripts/exclude-build-from-spotlight.sh
```

以注销并删除构建目录中的副本，避免出现两个 Inkmark。

# Contributing to Inkmark

Thank you for your interest in contributing!

## Development setup

```bash
npm install
npm run tauri dev
```

Run the test suite:

```bash
npm test
```

For watch mode during development:

```bash
npm run test:watch
```

## Pull requests

- Keep changes focused and well-scoped.
- Include a **Test plan** in your PR description (what you verified manually or automatically).
- Ensure `npm test` passes before requesting review.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) with a **Chinese** description after the type prefix, for example:

```
feat:新增主题加载能力
fix:修复 macOS 深色模式样式
chore:更新依赖版本
```

The prefix may be English (`feat`, `fix`, `chore`, etc.); the summary after the colon must be in Chinese.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

# neuro-forge 🧠🔨

[![npm version](https://img.shields.io/npm/v/@dinakars777/neuro-forge.svg?style=flat-square)](https://www.npmjs.com/package/@dinakars777/neuro-forge)
[![npm downloads](https://img.shields.io/npm/dm/@dinakars777/neuro-forge.svg?style=flat-square)](https://www.npmjs.com/package/@dinakars777/neuro-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> The Ultimate AI Context Compressor. Mind-meld your codebase with LLMs instantly.

When you hit a bug spanning 5 different files, you manually `cat` or copy-paste each one into Claude or ChatGPT. That's tedious, slow, and wastes tokens on boilerplate. **neuro-forge** fixes this — one command compresses your active Git context into a single optimized Markdown block and injects it straight into your clipboard.

## Features

- 🧠 Analyzes your active Git tree to find exactly what you're working on
- ✂️ Strips dead weight (empty lines, massive breaks) to save tokens
- 📋 Injects the result directly into your OS clipboard
- ⚡ Skips `node_modules`, `.gitignore` paths, locks, and binary files
- 🖥️ Works on macOS, Windows, and Linux

## Quick Start

```bash
npx @dinakars777/neuro-forge compress
```

Or install globally:

```bash
npm install -g @dinakars777/neuro-forge
cd my-project
forge compress
```

## How It Works

1. Runs `git diff --name-only` and `git ls-files` to find your active context
2. Strips noise and bundles file contents into a clean Markdown block:
   ````
   ## File: src/components/Button.tsx
   // ...content...
   ````
3. Copies the entire payload to your clipboard — just `Cmd+V` into your LLM

## Tech Stack

| Package | Purpose |
|---|---|
| `execa` | Fast Git command execution |
| `clipboardy` | Cross-platform clipboard access |
| TypeScript | Type-safe implementation |

## License

MIT

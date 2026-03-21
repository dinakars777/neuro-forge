# neuro-forge 🧠🔨

[![npm version](https://img.shields.io/npm/v/@dinakars777/neuro-forge.svg?style=flat-square)](https://www.npmjs.com/package/@dinakars777/neuro-forge)
[![npm downloads](https://img.shields.io/npm/dm/@dinakars777/neuro-forge.svg?style=flat-square)](https://www.npmjs.com/package/@dinakars777/neuro-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> The Ultimate AI Context Compressor. Mind-meld your codebase with LLMs instantly.

When you hit a bug spanning 5 different files, you manually `cat` or copy-paste each one into Claude or ChatGPT. That's tedious, slow, and wastes tokens on boilerplate. **neuro-forge** fixes this — one command compresses your active Git context into a single optimized Markdown block and injects it straight into your clipboard.

## Features

- 🧠 Analyzes your active Git tree to find exactly what you're working on
- 📊 **Real token counting** — shows exact token count using GPT-4 tokenizer
- ⚠️ **Context limit warnings** — alerts when you exceed GPT-4 or Claude limits
- ✂️ Strips dead weight (empty lines, massive breaks) to save tokens
- 📋 Injects the result directly into your OS clipboard
- 🎯 **Target specific files/folders** — bypass Git and pack exactly what you want
- 🕐 **Time-based selection** — grab files changed since "2 days ago" or "last Monday"
- 💬 **Append custom prompts** — include your question in the same payload
- 📁 **Output to file** — write to a file instead of clipboard
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

## Advanced Usage

### Target specific files or folders

```bash
forge compress --files src/components/Auth src/api/users.ts
```

### Get files changed in the last few days

```bash
forge compress --since "2 days ago"
forge compress --since "last Monday"
```

### Include a custom prompt

```bash
forge compress --prompt "Find the bug causing the null pointer exception"
```

The prompt will be appended to the context, so you can paste everything in one shot.

### Write to a file instead of clipboard

```bash
forge compress --out context.md
```

### Combine options

```bash
forge compress --since "3 days ago" --prompt "Review this feature" --out review.md
```

## How It Works

1. Runs `git diff --name-only` and `git ls-files` to find your active context (or uses `--since`/`--files` if specified)
2. Strips noise and bundles file contents into a clean Markdown block:
   ````
   ## File: src/components/Button.tsx
   // ...content...
   ````
3. Calculates exact token count using GPT-4 tokenizer
4. Warns you if you're exceeding context limits (32K for GPT-4 Turbo, 128K for Claude)
5. Copies the entire payload to your clipboard — just `Cmd+V` into your LLM

## Options

| Flag | Description | Example |
|---|---|---|
| `--since <time>` | Get files changed since a specific time | `--since "2 days ago"` |
| `--files <paths...>` | Target specific files or folders | `--files src/auth src/db/schema.ts` |
| `--prompt <text>` | Append a custom prompt to the context | `--prompt "Explain this code"` |
| `--out <file>` | Write output to a file instead of clipboard | `--out context.md` |

## Tech Stack

| Package | Purpose |
|---|---|
| `execa` | Fast Git command execution |
| `clipboardy` | Cross-platform clipboard access |
| `js-tiktoken` | Accurate GPT-4 token counting |
| `@clack/prompts` | Beautiful CLI UI |
| TypeScript | Type-safe implementation |

## Why neuro-forge?

Unlike generic repo packers, neuro-forge is laser-focused on the **active development workflow**:

- **Zero config** — just run `forge compress` and it figures out what's relevant
- **Token awareness** — shows exact counts and warns about context limits
- **Workflow integration** — clipboard-first, prompt appending, time-based selection
- **Smart defaults** — targets what you're working on right now, not the entire repo

## License

MIT

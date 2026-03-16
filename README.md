# neuro-forge 🧠🔨

> The Ultimate AI Context Compressor. Mind-meld your codebase with LLMs instantly.

When you hit a bug that spans across 5 different files, you usually have to manually `cat` or copy-paste each file into Claude, ChatGPT, or Cursor. This is tedious, wastes your time, and wastes LLM tokens on massive boilerplate comments.

`neuro-forge` is a blazingly fast CLI that fixes this. You simply run `forge compress`, and it instantly:
1. Analyzes your active Git tree.
2. Extracts exactly the files you are currently modifying, staging, or creating (untracked).
3. Strips dead weight (purely empty lines, massive breaks) to save tokens.
4. Bundles it perfectly into a single, highly-optimized Markdown block.
5. Injects it natively straight into your OS clipboard.

You just Alt-Tab to ChatGPT and hit `Command+V`. It's that magical.

![neuro-forge demo](https://img.shields.io/badge/Status-Beta-brightgreen.svg)
[![npm version](https://img.shields.io/npm/v/@dinakars777/neuro-forge.svg?style=flat-square)](https://www.npmjs.com/package/@dinakars777/neuro-forge)

## Installation & Usage

You can run it instantly inside any Git repository:

```bash
npx @dinakars777/neuro-forge compress
```

*(Or install it globally for native speed)*:
```bash
npm install -g @dinakars777/neuro-forge
cd my-nextjs-project
forge compress
```

## How It Works
- Uses `execa` to run lightning-fast `git diff --name-only` and `git ls-files` queries to triangulate your active context.
- Skips `.gitignore` paths, locks, binary files, and `node_modules`.
- Bundles the contents gracefully into:
    \`\`\`markdown
    ## File: src/components/Button.tsx
    // ...content...
    \`\`\`
- Utilizes `clipboardy` to natively syringe the payload directly into your MacOS/Windows/Linux clipboard.

## License
MIT

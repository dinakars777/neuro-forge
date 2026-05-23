# neuro-forge Roadmap

This roadmap is based on the current repository state after the May 2026 audit and the fixes merged in PR #1 and PR #2.

## Current Baseline

- Published npm package: `@dinakars777/neuro-forge@1.1.0`.
- Core CLI commands: `compress`, `--since`, `--files`, `--prompt`, and `--out`.
- Quality gates now available: `npm run typecheck`, `npm test`, `npm audit --audit-level=high`, and GitHub Actions CI.
- Repository hygiene now corrected: `node_modules/` is ignored and no longer tracked, and the MIT license is present at the repo root.

## Recently Completed

- Fixed context packing crash caused by an unsupported tokenizer cleanup call.
- Added CLI integration tests for text output, outside-root file selection, and binary-file skipping.
- Constrained explicit `--files` selections to the Git root.
- Skips binary payloads before tokenization.
- Updated vulnerable transitive dependencies and synced package-lock metadata.

## Near-Term Priorities

### 1. Release And Package Confidence

- Add a release workflow that builds `dist/index.js`, runs CI, and publishes to npm from tags.
- Add npm provenance for published releases.
- Add a `files` allowlist in `package.json` so npm packages contain only runtime assets, docs, and metadata.
- Add a `prepublishOnly` script that runs typecheck, tests, audit, and build.
- Add a changelog or Changesets flow for versioned release notes.

### 2. File Selection UX

- Add `--dry-run` or `--list` to show selected files without packing them.
- Add glob support for `--files` while preserving Git-root boundaries.
- Add explicit `--all`, `--staged`, and `--unstaged` modes so users can choose the source of context.
- Show why files were skipped, grouped by `.gitignore`, binary detection, outside-root, or standard blacklist.
- Add a configurable max-file-size guard for oversized text files.

### 3. Token Budget Control

- Add `--max-tokens` to fail or truncate predictably before producing unusable payloads.
- Add `--model` or `--encoding` so users can choose token accounting for their target model.
- Add per-file token counts in dry-run output.
- Add ordering strategies, such as changed-first, staged-first, or smallest-first.

### 4. Privacy And Safety

- Add optional secret scanning before writing to clipboard or disk.
- Add a `--redact` mode for common token, key, and credential patterns.
- Add tests for symlinks, broken links, unreadable files, and very large files.
- Add a clear error boundary around the packing step so unexpected file errors do not appear as generic CLI failures.

### 5. Developer And Community Surface

- Add `CONTRIBUTING.md` with local setup, test, release, and PR expectations.
- Add GitHub issue templates for bugs and feature requests.
- Add badges for CI, license, and package version to the landing page or README.
- Decide whether GitHub Pages should be the canonical docs site and automate deployment if so.

## Longer-Term Product Direction

- Split reusable packing logic from the CLI entrypoint so other tools can import neuro-forge as a library.
- Add a config file, such as `.neuro-forge.json`, for default ignores, token budgets, output style, and preferred model.
- Support structured output modes, such as Markdown, XML-like file blocks, and JSON manifests.
- Add project presets for common workflows: review, debugging, handoff, and architecture summary.
- Explore a watch mode that refreshes context as files change.

## Suggested Execution Order

1. Package confidence: npm allowlist, `prepublishOnly`, release workflow, and changelog.
2. Selection transparency: `--dry-run`, skipped-file reasons, and per-file token counts.
3. Token budget controls: `--max-tokens`, model selection, and deterministic ordering.
4. Privacy: secret scanning, redaction, and stronger file edge-case coverage.
5. Library/config split once the CLI behavior is stable enough to expose as an API.

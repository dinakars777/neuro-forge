#!/usr/bin/env node

// src/index.ts
import { intro, outro, spinner } from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";
import clipboardy from "clipboardy";
import path3 from "path";
import fs3 from "fs";

// src/git.ts
import { execa } from "execa";
import fs from "fs";
import path from "path";
function isWithinDirectory(parent, child) {
  const relativePath = path.relative(parent, child);
  return relativePath === "" || !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}
async function getGitRoot(cwd) {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"], { cwd });
    return stdout.trim();
  } catch {
    throw new Error("Not inside a Git repository. neuro-forge relies on Git to track context.");
  }
}
async function getModifiedAndUntrackedFiles(cwd) {
  const root = await getGitRoot(cwd);
  const { stdout: modifiedOut } = await execa("git", ["diff", "--name-only"], { cwd });
  const { stdout: stagedOut } = await execa("git", ["diff", "--name-only", "--cached"], { cwd });
  const { stdout: untrackedOut } = await execa("git", ["ls-files", "--others", "--exclude-standard"], { cwd });
  const allFiles = /* @__PURE__ */ new Set([
    ...modifiedOut.split("\n"),
    ...stagedOut.split("\n"),
    ...untrackedOut.split("\n")
  ]);
  return Array.from(allFiles).filter((f) => f.trim().length > 0).map((f) => path.resolve(root, f)).filter((f) => fs.existsSync(f) && fs.statSync(f).isFile());
}
async function getFilesSince(cwd, since) {
  const root = await getGitRoot(cwd);
  try {
    const { stdout } = await execa("git", ["log", `--since=${since}`, "--name-only", "--pretty=format:", "--diff-filter=ACMR"], { cwd });
    const allFiles = new Set(
      stdout.split("\n").filter((f) => f.trim().length > 0)
    );
    return Array.from(allFiles).map((f) => path.resolve(root, f)).filter((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  } catch {
    throw new Error(`Failed to get files since "${since}". Make sure the time format is valid (e.g., "2 days ago", "last Monday").`);
  }
}
async function getSpecificFiles(cwd, patterns) {
  const root = await getGitRoot(cwd);
  const rootRealPath = fs.realpathSync(root);
  const resolvedFiles = [];
  for (const pattern of patterns) {
    const absPath = path.resolve(cwd, pattern);
    if (fs.existsSync(absPath)) {
      const realPath = fs.realpathSync(absPath);
      if (!isWithinDirectory(rootRealPath, realPath)) continue;
      const stat = fs.statSync(absPath);
      if (stat.isFile()) {
        resolvedFiles.push(absPath);
      } else if (stat.isDirectory()) {
        const walkDir = (dir) => {
          const files = [];
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const fullRealPath = fs.realpathSync(fullPath);
            if (!isWithinDirectory(rootRealPath, fullRealPath)) continue;
            if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
              files.push(...walkDir(fullPath));
            } else if (entry.isFile()) {
              files.push(fullPath);
            }
          }
          return files;
        };
        resolvedFiles.push(...walkDir(absPath));
      }
    }
  }
  return resolvedFiles.filter((f) => fs.existsSync(f) && fs.statSync(f).isFile());
}

// src/packer.ts
import fs2 from "fs";
import path2 from "path";
import ignore from "ignore";
import { encodingForModel } from "js-tiktoken";
var ALWAYS_IGNORE = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.svg",
  "*.ico",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.mp4",
  "*.pdf",
  ".DS_Store",
  "node_modules/**/*",
  "dist/**/*",
  "build/**/*",
  ".next/**/*"
];
function toIgnorePath(filePath) {
  return filePath.split(path2.sep).join("/");
}
function isWithinDirectory2(parent, child) {
  const relativePath = path2.relative(parent, child);
  return relativePath === "" || !relativePath.startsWith("..") && !path2.isAbsolute(relativePath);
}
function isProbablyBinary(buffer) {
  const bytesToCheck = Math.min(buffer.length, 8e3);
  if (bytesToCheck === 0) return false;
  let suspiciousBytes = 0;
  for (let i = 0; i < bytesToCheck; i++) {
    const byte = buffer[i];
    if (byte === 0) return true;
    const isAllowedControl = byte === 7 || byte === 8 || byte === 9 || byte === 10 || byte === 12 || byte === 13 || byte === 27;
    if (byte < 32 && !isAllowedControl) {
      suspiciousBytes++;
    }
  }
  return suspiciousBytes / bytesToCheck > 0.3;
}
async function packFiles(filePaths, gitRoot, customPrompt) {
  let bundledText = "# Context Array\n\n";
  let packedFileCount = 0;
  const rootRealPath = fs2.realpathSync(gitRoot);
  const ig = ignore().add(ALWAYS_IGNORE);
  const gitignorePath = path2.join(gitRoot, ".gitignore");
  if (fs2.existsSync(gitignorePath)) {
    ig.add(fs2.readFileSync(gitignorePath, "utf8"));
  }
  for (const absPath of filePaths) {
    const relPath = path2.relative(gitRoot, absPath);
    const realPath = fs2.realpathSync(absPath);
    if (!isWithinDirectory2(rootRealPath, realPath)) continue;
    if (ig.ignores(toIgnorePath(relPath))) continue;
    const ext = path2.extname(absPath);
    const buffer = fs2.readFileSync(absPath);
    if (isProbablyBinary(buffer)) continue;
    const content = buffer.toString("utf-8");
    let strippedContent = content.replace(/\n\s*\n/g, "\n");
    bundledText += `## File: ${relPath}
`;
    bundledText += `\`\`\`${ext.replace(".", "")}
`;
    bundledText += `${strippedContent}
`;
    bundledText += `\`\`\`

`;
    packedFileCount++;
  }
  if (customPrompt) {
    bundledText += `---

# Question

${customPrompt}
`;
  }
  const enc = encodingForModel("gpt-4");
  const tokens = enc.encode(bundledText);
  const tokenCount = tokens.length;
  return { text: bundledText.trim(), fileCount: packedFileCount, tokenCount };
}

// src/index.ts
var program = new Command();
var CONTEXT_WARNINGS = [
  { limit: 2e5, label: "common 200K context windows" },
  { limit: 128e3, label: "common 128K context windows" },
  { limit: 32e3, label: "common 32K context windows" }
];
program.name("neuro-forge").description("The ultimate AI Dev Context Compressor.").version("1.1.0");
program.command("compress").description("Instantly gather, compress, and copy your working files to the clipboard.").option("--since <time>", 'Get files changed since a specific time (e.g., "2 days ago", "last Monday")').option("--files <paths...>", "Target specific files or folders (space-separated)").option("--prompt <text>", "Append a custom prompt/question to the context").option("--out <file>", "Write output to a file instead of clipboard").action(async (options) => {
  console.log();
  intro(pc.inverse(pc.bold(" \u{1F9E0}\u{1F528} neuro-forge: context compressor ")));
  const cwd = process.cwd();
  const s = spinner();
  let gitRoot;
  let files;
  try {
    gitRoot = await getGitRoot(cwd);
    if (options.files) {
      s.start("\u{1F3AF} Targeting specific files/folders...");
      files = await getSpecificFiles(cwd, options.files);
    } else if (options.since) {
      s.start(`\u{1F550} Scanning files changed since "${options.since}"...`);
      files = await getFilesSince(cwd, options.since);
    } else {
      s.start("\u{1F50D} Scanning Git for active, uncommitted context files...");
      files = await getModifiedAndUntrackedFiles(cwd);
    }
  } catch (err) {
    s.stop(pc.red("\u2716 Failed to analyze Git tracking."));
    console.error(pc.red(err.message));
    process.exit(1);
  }
  if (files.length === 0) {
    s.stop(pc.yellow("\u2713 No active context found."));
    console.log(pc.gray("No files matched your criteria."));
    outro("Done.");
    process.exit(0);
  }
  s.stop(pc.green(`\u2713 Found ${files.length} context files.`));
  console.log(pc.gray("Files staged for compression:"));
  const displayLimit = 10;
  files.slice(0, displayLimit).forEach((f) => console.log(pc.cyan(`  - ${path3.relative(gitRoot, f)}`)));
  if (files.length > displayLimit) {
    console.log(pc.gray(`  ... and ${files.length - displayLimit} more`));
  }
  console.log();
  s.start("\u{1F4E6} Bundling and compressing source syntax...");
  const { text, fileCount, tokenCount } = await packFiles(files, gitRoot, options.prompt);
  if (fileCount === 0) {
    s.stop(pc.yellow("\u2713 No valid files packed."));
    console.log(pc.gray("All targeted files were ignored by .gitignore or standard blacklist."));
    outro("Done.");
    process.exit(0);
  }
  s.stop(pc.green(`\u2713 Successfully packed ${fileCount} files into a single context payload.`));
  console.log(pc.gray(`| Token count: `) + pc.magenta(`${tokenCount.toLocaleString()} tokens`));
  const contextWarning = CONTEXT_WARNINGS.find(({ limit }) => tokenCount > limit);
  if (contextWarning) {
    console.log(pc.yellow(`\u26A0 Warning: Exceeds ${contextWarning.label}`));
  }
  console.log();
  if (options.out) {
    const outPath = path3.resolve(cwd, options.out);
    try {
      fs3.writeFileSync(outPath, text, "utf-8");
      console.log(pc.green(`\u2713 Context written to ${pc.bold(options.out)}`));
    } catch (err) {
      console.error(pc.red(`\u2716 Failed to write file: ${err.message}`));
      process.exit(1);
    }
  } else {
    s.start("\u{1F4CB} Syringing directly into system clipboard...");
    try {
      clipboardy.writeSync(text);
      s.stop(pc.green("\u2713 Context completely injected into Clipboard."));
    } catch (err) {
      s.stop(pc.red("\u2716 Clipboard write failed."));
      console.error(pc.red(err.message));
      console.log("You can use --out <file> to write to a file instead.");
      process.exit(1);
    }
    console.log();
    console.log(pc.bold(pc.green("\u2728 Mind Meld Ready!")));
    console.log(pc.gray("Go to ChatGPT, Claude, or Cursor and simply hit ") + pc.bold("Cmd+V"));
  }
  outro("Done.");
});
program.parse(process.argv);
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

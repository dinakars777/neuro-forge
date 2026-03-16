#!/usr/bin/env node

// src/index.ts
import { intro, outro, spinner } from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";
import clipboardy from "clipboardy";
import path3 from "path";

// src/git.ts
import { execa } from "execa";
import fs from "fs";
import path from "path";
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
    ...modifiedOut.split("\\n"),
    ...stagedOut.split("\\n"),
    ...untrackedOut.split("\\n")
  ]);
  return Array.from(allFiles).filter((f) => f.trim().length > 0).map((f) => path.resolve(root, f)).filter((f) => fs.existsSync(f) && fs.statSync(f).isFile());
}

// src/packer.ts
import fs2 from "fs";
import path2 from "path";
import ignore from "ignore";
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
async function packFiles(filePaths, gitRoot) {
  let bundledText = "# Context Array\\n\\n";
  let packedFileCount = 0;
  let tokensSaved = 0;
  const ig = ignore().add(ALWAYS_IGNORE);
  const gitignorePath = path2.join(gitRoot, ".gitignore");
  if (fs2.existsSync(gitignorePath)) {
    ig.add(fs2.readFileSync(gitignorePath, "utf8"));
  }
  for (const absPath of filePaths) {
    const relPath = path2.relative(gitRoot, absPath);
    if (ig.ignores(relPath)) continue;
    const ext = path2.extname(absPath);
    const content = fs2.readFileSync(absPath, "utf-8");
    const originalLength = content.length;
    let strippedContent = content.replace(/\\n\\s*\\n/g, "\\n");
    tokensSaved += Math.floor((originalLength - strippedContent.length) / 4);
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
  return { text: bundledText.trim(), fileCount: packedFileCount, tokensSaved };
}

// src/index.ts
var program = new Command();
program.name("neuro-forge").description("The ultimate AI Dev Context Compressor.").version("1.0.0");
program.command("compress").description("Instantly gather, compress, and copy your working files to the clipboard.").action(async () => {
  console.log();
  intro(pc.inverse(pc.bold(" \u{1F9E0}\u{1F528} neuro-forge: context compressor ")));
  const cwd = process.cwd();
  const s = spinner();
  s.start("\u{1F50D} Scanning Git for active, uncommitted context files...");
  let gitRoot;
  let files;
  try {
    gitRoot = await getGitRoot(cwd);
    files = await getModifiedAndUntrackedFiles(cwd);
  } catch (err) {
    s.stop(pc.red("\u2716 Failed to analyze Git tracking."));
    console.error(pc.red(err.message));
    process.exit(1);
  }
  if (files.length === 0) {
    s.stop(pc.yellow("\u2713 No active context found."));
    console.log(pc.gray("You have no modified, staged, or untracked files in this repository."));
    outro("Done.");
    process.exit(0);
  }
  s.stop(pc.green(`\u2713 Found ${files.length} active context files.`));
  console.log(pc.gray("Files staged for compression:"));
  files.forEach((f) => console.log(pc.cyan(`  - ${path3.relative(gitRoot, f)}`)));
  console.log();
  s.start("\u{1F4E6} Bundling and compressing source syntax...");
  const { text, fileCount, tokensSaved } = await packFiles(files, gitRoot);
  if (fileCount === 0) {
    s.stop(pc.yellow("\u2713 No valid files packed."));
    console.log(pc.gray("All targeted files were ignored by .gitignore or standard blacklist."));
    outro("Done.");
    process.exit(0);
  }
  s.stop(pc.green(`\u2713 Successfully packed ${fileCount} files into a single context payload.`));
  console.log(pc.gray(`| Tokens saved via compression: ` + pc.magenta(`~${tokensSaved} tokens`)));
  console.log();
  s.start("\u{1F4CB} Syringing directly into system clipboard...");
  try {
    clipboardy.writeSync(text);
    s.stop(pc.green("\u2713 Context completely injected into Clipboard."));
  } catch (err) {
    s.stop(pc.red("\u2716 Clipboard write failed."));
    console.error(pc.red(err.message));
    console.log("You can pipe this output instead if in an SSH session.");
    process.exit(1);
  }
  console.log();
  console.log(pc.bold(pc.green("\u2728 Mind Meld Ready!")));
  console.log(pc.gray("Go to ChatGPT, Claude, or Cursor and simply hit ") + pc.bold("Cmd+V"));
  outro("Done.");
});
program.parse(process.argv);
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

#!/usr/bin/env node
import { intro, outro, spinner } from '@clack/prompts';
import { Command } from 'commander';
import pc from 'picocolors';
import clipboardy from 'clipboardy';
import path from 'path';
import fs from 'fs';
import { getModifiedAndUntrackedFiles, getGitRoot, getFilesSince, getSpecificFiles } from './git';
import { packFiles } from './packer';

const program = new Command();

program
  .name('neuro-forge')
  .description('The ultimate AI Dev Context Compressor.')
  .version('1.1.0');

program
  .command('compress')
  .description('Instantly gather, compress, and copy your working files to the clipboard.')
  .option('--since <time>', 'Get files changed since a specific time (e.g., "2 days ago", "last Monday")')
  .option('--files <paths...>', 'Target specific files or folders (space-separated)')
  .option('--prompt <text>', 'Append a custom prompt/question to the context')
  .option('--out <file>', 'Write output to a file instead of clipboard')
  .action(async (options) => {
    console.log();
    intro(pc.inverse(pc.bold(' 🧠🔨 neuro-forge: context compressor ')));

    const cwd = process.cwd();
    const s = spinner();

    let gitRoot: string;
    let files: string[];

    try {
      gitRoot = await getGitRoot(cwd);

      if (options.files) {
        s.start('🎯 Targeting specific files/folders...');
        files = await getSpecificFiles(cwd, options.files);
      } else if (options.since) {
        s.start(`🕐 Scanning files changed since "${options.since}"...`);
        files = await getFilesSince(cwd, options.since);
      } else {
        s.start('🔍 Scanning Git for active, uncommitted context files...');
        files = await getModifiedAndUntrackedFiles(cwd);
      }
    } catch (err: any) {
      s.stop(pc.red('✖ Failed to analyze Git tracking.'));
      console.error(pc.red(err.message));
      process.exit(1);
    }

    if (files.length === 0) {
      s.stop(pc.yellow('✓ No active context found.'));
      console.log(pc.gray('No files matched your criteria.'));
      outro('Done.');
      process.exit(0);
    }

    s.stop(pc.green(`✓ Found ${files.length} context files.`));

    // Show a quick summary of what we found
    console.log(pc.gray('Files staged for compression:'));
    const displayLimit = 10;
    files.slice(0, displayLimit).forEach(f => console.log(pc.cyan(`  - ${path.relative(gitRoot, f)}`)));
    if (files.length > displayLimit) {
      console.log(pc.gray(`  ... and ${files.length - displayLimit} more`));
    }
    console.log();

    s.start('📦 Bundling and compressing source syntax...');

    const { text, fileCount, tokenCount } = await packFiles(files, gitRoot, options.prompt);

    if (fileCount === 0) {
      s.stop(pc.yellow('✓ No valid files packed.'));
      console.log(pc.gray('All targeted files were ignored by .gitignore or standard blacklist.'));
      outro('Done.');
      process.exit(0);
    }

    s.stop(pc.green(`✓ Successfully packed ${fileCount} files into a single context payload.`));
    console.log(pc.gray(`| Token count: `) + pc.magenta(`${tokenCount.toLocaleString()} tokens`));
    
    // Token limit warnings
    if (tokenCount > 128000) {
      console.log(pc.yellow(`⚠ Warning: Exceeds Claude 3.5 Sonnet context limit (200K tokens)`));
    } else if (tokenCount > 32000) {
      console.log(pc.yellow(`⚠ Warning: Exceeds GPT-4 Turbo context limit (128K tokens)`));
    }
    console.log();

    if (options.out) {
      // Write to file
      const outPath = path.resolve(cwd, options.out);
      try {
        fs.writeFileSync(outPath, text, 'utf-8');
        console.log(pc.green(`✓ Context written to ${pc.bold(options.out)}`));
      } catch (err: any) {
        console.error(pc.red(`✖ Failed to write file: ${err.message}`));
        process.exit(1);
      }
    } else {
      // Copy to clipboard
      s.start('📋 Syringing directly into system clipboard...');
      
      try {
        clipboardy.writeSync(text);
        s.stop(pc.green('✓ Context completely injected into Clipboard.'));
      } catch (err: any) {
        s.stop(pc.red('✖ Clipboard write failed.'));
        console.error(pc.red(err.message));
        console.log('You can use --out <file> to write to a file instead.');
        process.exit(1);
      }

      console.log();
      console.log(pc.bold(pc.green('✨ Mind Meld Ready!')));
      console.log(pc.gray('Go to ChatGPT, Claude, or Cursor and simply hit ') + pc.bold('Cmd+V'));
    }
    
    outro('Done.');
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

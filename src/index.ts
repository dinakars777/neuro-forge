#!/usr/bin/env node
import { intro, outro, spinner, select, confirm, isCancel } from '@clack/prompts';
import { Command } from 'commander';
import pc from 'picocolors';
import clipboardy from 'clipboardy';
import path from 'path';
import { getModifiedAndUntrackedFiles, getGitRoot } from './git';
import { packFiles } from './packer';

const program = new Command();

program
  .name('neuro-forge')
  .description('The ultimate AI Dev Context Compressor.')
  .version('1.0.0');

program
  .command('compress')
  .description('Instantly gather, compress, and copy your working files to the clipboard.')
  .action(async () => {
    console.log();
    intro(pc.inverse(pc.bold(' 🧠🔨 neuro-forge: context compressor ')));

    const cwd = process.cwd();
    const s = spinner();
    s.start('🔍 Scanning Git for active, uncommitted context files...');

    let gitRoot: string;
    let files: string[];

    try {
      gitRoot = await getGitRoot(cwd);
      files = await getModifiedAndUntrackedFiles(cwd);
    } catch (err: any) {
      s.stop(pc.red('✖ Failed to analyze Git tracking.'));
      console.error(pc.red(err.message));
      process.exit(1);
    }

    if (files.length === 0) {
      s.stop(pc.yellow('✓ No active context found.'));
      console.log(pc.gray('You have no modified, staged, or untracked files in this repository.'));
      outro('Done.');
      process.exit(0);
    }

    s.stop(pc.green(`✓ Found ${files.length} active context files.`));

    // Show a quick summary of what we found
    console.log(pc.gray('Files staged for compression:'));
    files.forEach(f => console.log(pc.cyan(`  - ${path.relative(gitRoot, f)}`)));
    console.log();

    s.start('📦 Bundling and compressing source syntax...');

    const { text, fileCount, tokensSaved } = await packFiles(files, gitRoot);

    if (fileCount === 0) {
      s.stop(pc.yellow('✓ No valid files packed.'));
      console.log(pc.gray('All targeted files were ignored by .gitignore or standard blacklist.'));
      outro('Done.');
      process.exit(0);
    }

    s.stop(pc.green(`✓ Successfully packed ${fileCount} files into a single context payload.`));
    console.log(pc.gray(`| Tokens saved via compression: ` + pc.magenta(`~${tokensSaved} tokens`)));
    console.log();

    s.start('📋 Syringing directly into system clipboard...');
    
    try {
      clipboardy.writeSync(text);
      s.stop(pc.green('✓ Context completely injected into Clipboard.'));
    } catch (err: any) {
      s.stop(pc.red('✖ Clipboard write failed.'));
      console.error(pc.red(err.message));
      console.log('You can pipe this output instead if in an SSH session.');
      process.exit(1);
    }

    console.log();
    console.log(pc.bold(pc.green('✨ Mind Meld Ready!')));
    console.log(pc.gray('Go to ChatGPT, Claude, or Cursor and simply hit ') + pc.bold('Cmd+V'));
    outro('Done.');
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

import { execa } from 'execa';
import fs from 'fs';
import path from 'path';

export async function getGitRoot(cwd: string): Promise<string> {
  try {
    const { stdout } = await execa('git', ['rev-parse', '--show-toplevel'], { cwd });
    return stdout.trim();
  } catch {
    throw new Error('Not inside a Git repository. neuro-forge relies on Git to track context.');
  }
}

export async function getModifiedAndUntrackedFiles(cwd: string): Promise<string[]> {
  const root = await getGitRoot(cwd);
  
  // Get tracked modified files
  const { stdout: modifiedOut } = await execa('git', ['diff', '--name-only'], { cwd });
  
  // Get tracked staged files
  const { stdout: stagedOut } = await execa('git', ['diff', '--name-only', '--cached'], { cwd });

  // Get untracked files
  const { stdout: untrackedOut } = await execa('git', ['ls-files', '--others', '--exclude-standard'], { cwd });

  const allFiles = new Set([
    ...modifiedOut.split('\\n'),
    ...stagedOut.split('\\n'),
    ...untrackedOut.split('\\n')
  ]);

  // Clean empty strings and return absolute paths
  return Array.from(allFiles)
    .filter(f => f.trim().length > 0)
    .map(f => path.resolve(root, f))
    .filter(f => fs.existsSync(f) && fs.statSync(f).isFile()); // ensure they still exist and aren't deleted
}

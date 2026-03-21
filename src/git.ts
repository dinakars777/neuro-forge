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
    ...modifiedOut.split('\n'),
    ...stagedOut.split('\n'),
    ...untrackedOut.split('\n')
  ]);

  // Clean empty strings and return absolute paths
  return Array.from(allFiles)
    .filter(f => f.trim().length > 0)
    .map(f => path.resolve(root, f))
    .filter(f => fs.existsSync(f) && fs.statSync(f).isFile()); // ensure they still exist and aren't deleted
}

export async function getFilesSince(cwd: string, since: string): Promise<string[]> {
  const root = await getGitRoot(cwd);
  
  try {
    const { stdout } = await execa('git', ['log', `--since=${since}`, '--name-only', '--pretty=format:', '--diff-filter=ACMR'], { cwd });
    
    const allFiles = new Set(
      stdout.split('\n').filter(f => f.trim().length > 0)
    );

    return Array.from(allFiles)
      .map(f => path.resolve(root, f))
      .filter(f => fs.existsSync(f) && fs.statSync(f).isFile());
  } catch {
    throw new Error(`Failed to get files since "${since}". Make sure the time format is valid (e.g., "2 days ago", "last Monday").`);
  }
}

export async function getSpecificFiles(cwd: string, patterns: string[]): Promise<string[]> {
  const root = await getGitRoot(cwd);
  const resolvedFiles: string[] = [];

  for (const pattern of patterns) {
    const absPath = path.resolve(cwd, pattern);
    
    if (fs.existsSync(absPath)) {
      const stat = fs.statSync(absPath);
      
      if (stat.isFile()) {
        resolvedFiles.push(absPath);
      } else if (stat.isDirectory()) {
        // Recursively get all files in directory
        const walkDir = (dir: string): string[] => {
          const files: string[] = [];
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
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

  return resolvedFiles.filter(f => fs.existsSync(f) && fs.statSync(f).isFile());
}

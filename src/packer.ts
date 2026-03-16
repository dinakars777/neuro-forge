import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import minimatch from 'minimatch';

const ALWAYS_IGNORE = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.svg',
  '*.ico',
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.mp4',
  '*.pdf',
  '.DS_Store',
  'node_modules/**/*',
  'dist/**/*',
  'build/**/*',
  '.next/**/*'
];

export async function packFiles(filePaths: string[], gitRoot: string): Promise<{ text: string, fileCount: number, tokensSaved: number }> {
  let bundledText = '# Context Array\\n\\n';
  let packedFileCount = 0;
  let tokensSaved = 0; // rough estimate based on stripped empty lines and comments

  const ig = ignore().add(ALWAYS_IGNORE);

  // If there's a gitignore, add it
  const gitignorePath = path.join(gitRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, 'utf8'));
  }

  for (const absPath of filePaths) {
    const relPath = path.relative(gitRoot, absPath);
    
    // Ignore binaries, locks, and standard gitignored files
    if (ig.ignores(relPath)) continue;

    const ext = path.extname(absPath);
    const content = fs.readFileSync(absPath, 'utf-8');
    
    // Naive Compression: Strip purely empty lines (consecutive \n) to save tokens
    const originalLength = content.length;
    let strippedContent = content.replace(/\\n\\s*\\n/g, '\\n');

    tokensSaved += Math.floor((originalLength - strippedContent.length) / 4); // 4 chars per token roughly
    
    bundledText += `## File: ${relPath}\n`
    bundledText += `\`\`\`${ext.replace('.', '')}\n`
    bundledText += `${strippedContent}\n`
    bundledText += `\`\`\`\n\n`
    
    packedFileCount++;
  }

  return { text: bundledText.trim(), fileCount: packedFileCount, tokensSaved };
}

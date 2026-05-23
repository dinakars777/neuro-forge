import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import { encodingForModel } from 'js-tiktoken';

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

function toIgnorePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function isWithinDirectory(parent: string, child: string): boolean {
  const relativePath = path.relative(parent, child);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function isProbablyBinary(buffer: Buffer): boolean {
  const bytesToCheck = Math.min(buffer.length, 8000);
  if (bytesToCheck === 0) return false;

  let suspiciousBytes = 0;

  for (let i = 0; i < bytesToCheck; i++) {
    const byte = buffer[i];

    if (byte === 0) return true;

    const isAllowedControl =
      byte === 7 ||
      byte === 8 ||
      byte === 9 ||
      byte === 10 ||
      byte === 12 ||
      byte === 13 ||
      byte === 27;

    if (byte < 32 && !isAllowedControl) {
      suspiciousBytes++;
    }
  }

  return suspiciousBytes / bytesToCheck > 0.3;
}

export async function packFiles(
  filePaths: string[], 
  gitRoot: string,
  customPrompt?: string
): Promise<{ text: string, fileCount: number, tokenCount: number }> {
  let bundledText = '# Context Array\n\n';
  let packedFileCount = 0;
  const rootRealPath = fs.realpathSync(gitRoot);

  const ig = ignore().add(ALWAYS_IGNORE);

  // If there's a gitignore, add it
  const gitignorePath = path.join(gitRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, 'utf8'));
  }

  for (const absPath of filePaths) {
    const relPath = path.relative(gitRoot, absPath);
    const realPath = fs.realpathSync(absPath);

    if (!isWithinDirectory(rootRealPath, realPath)) continue;
    
    // Ignore binaries, locks, and standard gitignored files
    if (ig.ignores(toIgnorePath(relPath))) continue;

    const ext = path.extname(absPath);
    const buffer = fs.readFileSync(absPath);
    if (isProbablyBinary(buffer)) continue;

    const content = buffer.toString('utf-8');
    
    // Naive Compression: Strip purely empty lines (consecutive \n) to save tokens
    let strippedContent = content.replace(/\n\s*\n/g, '\n');
    
    bundledText += `## File: ${relPath}\n`
    bundledText += `\`\`\`${ext.replace('.', '')}\n`
    bundledText += `${strippedContent}\n`
    bundledText += `\`\`\`\n\n`
    
    packedFileCount++;
  }

  // Append custom prompt if provided
  if (customPrompt) {
    bundledText += `---\n\n# Question\n\n${customPrompt}\n`;
  }

  // Calculate token count using tiktoken (GPT-4 encoding)
  const enc = encodingForModel('gpt-4');
  const tokens = enc.encode(bundledText);
  const tokenCount = tokens.length;

  return { text: bundledText.trim(), fileCount: packedFileCount, tokenCount };
}

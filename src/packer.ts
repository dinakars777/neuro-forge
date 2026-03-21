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

export async function packFiles(
  filePaths: string[], 
  gitRoot: string,
  customPrompt?: string
): Promise<{ text: string, fileCount: number, tokenCount: number }> {
  let bundledText = '# Context Array\n\n';
  let packedFileCount = 0;

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
  enc.free();

  return { text: bundledText.trim(), fileCount: packedFileCount, tokenCount };
}

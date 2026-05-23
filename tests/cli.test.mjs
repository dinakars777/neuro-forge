import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(repoRoot, 'dist', 'index.js');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'neuro-forge-test-'));
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: '1',
      FORCE_COLOR: '0',
      NO_COLOR: '1'
    }
  });

  return {
    ...result,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`
  };
}

function initGitRepo(cwd) {
  const result = run('git', ['init', '-q'], cwd);
  assert.equal(result.status, 0, result.output);
}

function runCli(cwd, args) {
  return run(process.execPath, [cliPath, 'compress', ...args], cwd);
}

test('writes selected text files to an output file', () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, 'ok.txt'), 'hello\n');

  const result = runCli(cwd, ['--files', 'ok.txt', '--out', 'context.md']);

  assert.equal(result.status, 0, result.output);
  assert.doesNotMatch(result.output, /Something went wrong/);

  const context = fs.readFileSync(path.join(cwd, 'context.md'), 'utf8');
  assert.match(context, /## File: ok\.txt/);
  assert.match(context, /hello/);
});

test('does not pack paths outside the git root', () => {
  const parent = makeTempDir();
  const cwd = path.join(parent, 'repo');
  fs.mkdirSync(cwd);
  fs.writeFileSync(path.join(parent, 'secret.txt'), 'outside secret\n');
  initGitRepo(cwd);

  const result = runCli(cwd, ['--files', '../secret.txt', '--out', 'context.md']);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /No files matched your criteria/);
  assert.equal(fs.existsSync(path.join(cwd, 'context.md')), false);
});

test('skips binary files while packing text files', () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, 'ok.txt'), 'hello\n');
  fs.writeFileSync(path.join(cwd, 'blob.bin'), Buffer.from([0x61, 0x62, 0x00, 0x63]));

  const result = runCli(cwd, ['--files', 'ok.txt', 'blob.bin', '--out', 'context.md']);

  assert.equal(result.status, 0, result.output);

  const context = fs.readFileSync(path.join(cwd, 'context.md'), 'utf8');
  assert.match(context, /## File: ok\.txt/);
  assert.doesNotMatch(context, /blob\.bin/);
});

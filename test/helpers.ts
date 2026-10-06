import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, vi } from 'vitest';

export class ExitError extends Error {
  constructor(readonly code: string | number | null | undefined) {
    super(`process.exit(${code})`);
  }
}

export function setupScriptTest() {
  const originalCwd = process.cwd();
  const originalArgv = process.argv;
  let dir = '';

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nft-ipfs-grabber-'));
    process.chdir(dir);
    vi.resetModules();
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ExitError(code);
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.argv = originalArgv;
    fs.rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });
}

// scripts run on import and fire an async `run()` without awaiting it
export async function runScript(load: () => Promise<unknown>, args: string[]) {
  process.argv = ['node', 'script', ...args];
  await load();
  await new Promise((resolve) => setTimeout(resolve));
}

export const readLines = (file: string) =>
  fs.readFileSync(file, 'utf8').split('\n');

export const CID_V0 = 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o';
export const CID_V0_B = 'QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o';
export const CID_V1 =
  'bafybeie5gq4jxvzmsym6hjlwxej4rwdoxt7wadqvmmwbqi7r27fclha2va';

import fs from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CID_V0,
  CID_V0_B,
  CID_V1,
  ExitError,
  readLines,
  runScript,
  setupScriptTest,
} from './helpers.js';

const mocks = vi.hoisted(() => ({
  Atomic: vi.fn(),
  getAssetsForAccount: vi.fn(),
}));

vi.mock('../src/lib/atomicassets.js', () => ({ default: mocks.Atomic }));

const asset = (collection: string, data: Record<string, unknown>) => ({
  collection: { collection_name: collection },
  data,
});

const run = (...args: string[]) =>
  runScript(() => import('../src/account.js'), args);

const outDir = 'hashes/accounts/myaccount';

describe('account script', () => {
  setupScriptTest();

  beforeEach(() => {
    mocks.getAssetsForAccount.mockReset().mockResolvedValue([]);
    mocks.Atomic.mockReset().mockImplementation(function () {
      return { getAssetsForAccount: mocks.getAssetsForAccount };
    });
  });

  describe('argument validation', () => {
    it.each([
      ['no arguments are given', [], 'No arguments provided'],
      ['--account is missing', ['--api=https://x.io'], 'No account provided'],
      ['the account has invalid chars', ['--account=Bad!'], 'Invalid account'],
      [
        'the account is too long',
        ['--account=waytoolongaccount'],
        'Invalid account',
      ],
      [
        'the API is not http(s)',
        ['--account=myaccount', '--api=ftp://x.io'],
        'Invalid API URL',
      ],
    ])('exits when %s', async (_, args, message) => {
      await expect(run(...args)).rejects.toThrow(ExitError);
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(message)
      );
      expect(mocks.Atomic).not.toHaveBeenCalled();
    });

    it.each(['ab', 'myaccount', 'a.b.c', 'abcdefghij12', 'abcdefghijkl'])(
      'accepts the valid account name %s',
      async (account) => {
        await run(`--account=${account}`);
        expect(process.exit).not.toHaveBeenCalled();
      }
    );
  });

  it('uses the default WAX AtomicAssets API', async () => {
    await run('--account=myaccount');
    expect(mocks.Atomic).toHaveBeenCalledWith(
      'https://wax.api.atomicassets.io/'
    );
  });

  it('uses a custom API when given', async () => {
    await run('--account=myaccount', '--api=https://aa.example.com');
    expect(mocks.Atomic).toHaveBeenCalledWith('https://aa.example.com/');
  });

  it('passes collection and asset filters', async () => {
    await run('--account=myaccount', '--collections=c1,c2', '--assets=1,2,3');
    expect(mocks.getAssetsForAccount).toHaveBeenCalledWith(
      'myaccount',
      ['c1', 'c2'],
      ['1', '2', '3']
    );
  });

  it('defaults to no filters', async () => {
    await run('--account=myaccount');
    expect(mocks.getAssetsForAccount).toHaveBeenCalledWith('myaccount', [], []);
  });

  it('writes deduplicated hashes per account, per collection and to pinning.csv', async () => {
    mocks.getAssetsForAccount.mockResolvedValue([
      asset('col1', {
        name: 'Sword',
        img: CID_V0,
        video: `https://ipfs.io/ipfs/${CID_V1}`,
      }),
      asset('col1', { img: CID_V0 }),
      asset('col2', { img: `/ipfs/${CID_V0}`, backimg: CID_V0_B }),
    ]);

    await run('--account=myaccount');

    expect(readLines(`${outDir}/myaccount.csv`)).toEqual([
      CID_V0,
      CID_V1,
      CID_V0_B,
    ]);
    expect(readLines(`${outDir}/collections/col1.csv`)).toEqual([
      CID_V0,
      CID_V1,
    ]);
    expect(readLines(`${outDir}/collections/col2.csv`)).toEqual([
      CID_V0,
      CID_V0_B,
    ]);
    expect(readLines('hashes/pinning.csv')).toEqual([CID_V0, CID_V1, CID_V0_B]);
    expect(console.log).toHaveBeenCalledWith('Total Assets: 3');
    expect(console.log).toHaveBeenCalledWith('Total IPFS Hashes: 3');
  });

  it('logs strings that look like IPFS hashes but are invalid', async () => {
    mocks.getAssetsForAccount.mockResolvedValue([
      asset('col1', { img: 'QmBroken', other: 'bafnope', name: 'fine' }),
    ]);

    await run('--account=myaccount');

    expect(console.log).toHaveBeenCalledWith('Invalid IPFS hash: QmBroken');
    expect(console.log).toHaveBeenCalledWith('Invalid IPFS hash: bafnope');
    expect(console.log).not.toHaveBeenCalledWith('Invalid IPFS hash: fine');
  });

  it('replaces previous output for the account', async () => {
    fs.mkdirSync(`${outDir}/collections`, { recursive: true });
    fs.writeFileSync(`${outDir}/collections/stale.csv`, 'old');
    mocks.getAssetsForAccount.mockResolvedValue([
      asset('col1', { img: CID_V0 }),
    ]);

    await run('--account=myaccount');

    expect(fs.existsSync(`${outDir}/collections/stale.csv`)).toBe(false);
    expect(fs.existsSync(`${outDir}/collections/col1.csv`)).toBe(true);
  });

  it('prepends only new hashes to an existing pinning.csv', async () => {
    fs.mkdirSync('hashes');
    fs.writeFileSync('hashes/pinning.csv', [CID_V0_B, CID_V0].join('\n'));
    mocks.getAssetsForAccount.mockResolvedValue([
      asset('col1', { img: CID_V0, video: CID_V1 }),
    ]);

    await run('--account=myaccount');

    expect(readLines('hashes/pinning.csv')).toEqual([CID_V1, CID_V0_B, CID_V0]);
  });

  it('writes empty files when no assets are found', async () => {
    await run('--account=myaccount');

    expect(fs.readFileSync(`${outDir}/myaccount.csv`, 'utf8')).toBe('');
    expect(fs.existsSync(`${outDir}/collections`)).toBe(false);
    expect(fs.readFileSync('hashes/pinning.csv', 'utf8')).toBe('');
  });
});

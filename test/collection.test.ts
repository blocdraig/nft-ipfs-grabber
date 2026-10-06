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
  getAssetsForCollection: vi.fn(),
}));

vi.mock('../src/lib/atomicassets.js', () => ({ default: mocks.Atomic }));

const asset = (schema: string, data: Record<string, unknown>) => ({
  schema: { schema_name: schema },
  data,
});

const run = (...args: string[]) =>
  runScript(() => import('../src/collection.js'), args);

const outDir = 'hashes/collections/mycollection';

describe('collection script', () => {
  setupScriptTest();

  beforeEach(() => {
    mocks.getAssetsForCollection.mockReset().mockResolvedValue([]);
    mocks.Atomic.mockReset().mockImplementation(function () {
      return { getAssetsForCollection: mocks.getAssetsForCollection };
    });
  });

  describe('argument validation', () => {
    it.each([
      ['no arguments are given', [], 'No arguments provided'],
      [
        '--collection is missing',
        ['--api=https://x.io'],
        'No collection provided',
      ],
      ['the collection name is invalid', ['--collection=Bad!'], 'Invalid'],
      [
        'the API is not http(s)',
        ['--collection=mycollection', '--api=ftp://x.io'],
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
  });

  it('uses the default WAX AtomicAssets API', async () => {
    await run('--collection=mycollection');
    expect(mocks.Atomic).toHaveBeenCalledWith(
      'https://wax.api.atomicassets.io/'
    );
  });

  it('uses a custom API when given', async () => {
    await run('--collection=mycollection', '--api=https://aa.example.com');
    expect(mocks.Atomic).toHaveBeenCalledWith('https://aa.example.com/');
  });

  it('passes schema, template and asset filters', async () => {
    await run(
      '--collection=mycollection',
      '--schemas=s1,s2',
      '--templates=10,20',
      '--assets=1'
    );
    expect(mocks.getAssetsForCollection).toHaveBeenCalledWith(
      'mycollection',
      ['s1', 's2'],
      ['10', '20'],
      ['1']
    );
  });

  it('defaults to no filters', async () => {
    await run('--collection=mycollection');
    expect(mocks.getAssetsForCollection).toHaveBeenCalledWith(
      'mycollection',
      [],
      [],
      []
    );
  });

  it('writes deduplicated hashes per collection, per schema and to pinning.csv', async () => {
    mocks.getAssetsForCollection.mockResolvedValue([
      asset('heroes', { img: CID_V0, video: `${CID_V1}/clip.mp4` }),
      asset('heroes', { img: CID_V0 }),
      asset('items', { img: `https://ipfs.io/ipfs/${CID_V0}`, x: CID_V0_B }),
    ]);

    await run('--collection=mycollection');

    expect(readLines(`${outDir}/mycollection.csv`)).toEqual([
      CID_V0,
      CID_V1,
      CID_V0_B,
    ]);
    expect(readLines(`${outDir}/schemas/heroes.csv`)).toEqual([CID_V0, CID_V1]);
    expect(readLines(`${outDir}/schemas/items.csv`)).toEqual([
      CID_V0,
      CID_V0_B,
    ]);
    expect(readLines('hashes/pinning.csv')).toEqual([CID_V0, CID_V1, CID_V0_B]);
    expect(console.log).toHaveBeenCalledWith('Total Assets: 3');
    expect(console.log).toHaveBeenCalledWith('Total IPFS Hashes: 3');
  });

  it('logs strings that look like IPFS hashes but are invalid', async () => {
    mocks.getAssetsForCollection.mockResolvedValue([
      asset('heroes', { img: 'QmBroken', name: 'fine' }),
    ]);

    await run('--collection=mycollection');

    expect(console.log).toHaveBeenCalledWith('Invalid IPFS hash: QmBroken');
    expect(console.log).not.toHaveBeenCalledWith('Invalid IPFS hash: fine');
  });

  it('replaces previous output for the collection', async () => {
    fs.mkdirSync(`${outDir}/schemas`, { recursive: true });
    fs.writeFileSync(`${outDir}/schemas/stale.csv`, 'old');
    mocks.getAssetsForCollection.mockResolvedValue([
      asset('heroes', { img: CID_V0 }),
    ]);

    await run('--collection=mycollection');

    expect(fs.existsSync(`${outDir}/schemas/stale.csv`)).toBe(false);
    expect(fs.existsSync(`${outDir}/schemas/heroes.csv`)).toBe(true);
  });

  it('prepends only new hashes to an existing pinning.csv', async () => {
    fs.mkdirSync('hashes');
    fs.writeFileSync('hashes/pinning.csv', [CID_V0_B, CID_V0].join('\n'));
    mocks.getAssetsForCollection.mockResolvedValue([
      asset('heroes', { img: CID_V0, video: CID_V1 }),
    ]);

    await run('--collection=mycollection');

    expect(readLines('hashes/pinning.csv')).toEqual([CID_V1, CID_V0_B, CID_V0]);
  });
});

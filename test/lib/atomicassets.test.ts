import { AtomicAssetsAPIClient } from '@wharfkit/atomicassets';
import { describe, expect, it, vi } from 'vitest';
import Atomic from '../../src/lib/atomicassets.js';

const setup = (count: number, pages: unknown[][]) => {
  const atomic = new Atomic('https://example.com');
  const get_assets_count = vi
    .fn()
    .mockResolvedValue({ data: { toNumber: () => count } });
  const get_assets = vi.fn();
  for (const page of pages) {
    get_assets.mockResolvedValueOnce({ data: page });
  }
  atomic.client = {
    atomicassets: { v1: { get_assets_count, get_assets } },
  } as unknown as AtomicAssetsAPIClient;
  return { atomic, get_assets_count, get_assets };
};

describe('Atomic', () => {
  it('creates an AtomicAssets client', () => {
    expect(new Atomic('https://example.com').client).toBeInstanceOf(
      AtomicAssetsAPIClient
    );
  });

  describe('getAssets', () => {
    it('returns no assets without fetching when the count is 0', async () => {
      const { atomic, get_assets } = setup(0, []);

      await expect(atomic.getAssets({ owner: ['foo'] })).resolves.toEqual([]);
      expect(get_assets).not.toHaveBeenCalled();
    });

    it('fetches every page of 1000 and concatenates the results', async () => {
      const { atomic, get_assets_count, get_assets } = setup(2500, [
        ['a'],
        ['b'],
        ['c'],
      ]);
      const options = { owner: ['foo'] };

      await expect(atomic.getAssets(options)).resolves.toEqual(['a', 'b', 'c']);
      expect(get_assets_count).toHaveBeenCalledWith(options);
      expect(get_assets).toHaveBeenCalledTimes(3);
      for (const page of [1, 2, 3]) {
        expect(get_assets).toHaveBeenCalledWith({
          ...options,
          limit: 1000,
          page,
        });
      }
    });

    it('stops early when a page comes back empty', async () => {
      const { atomic, get_assets } = setup(3000, [['a'], []]);

      await expect(atomic.getAssets({})).resolves.toEqual(['a']);
      expect(get_assets).toHaveBeenCalledTimes(2);
    });
  });

  it('getAssetsForAccount filters by owner, collections and asset ids', async () => {
    const atomic = new Atomic('https://example.com');
    const getAssets = vi.spyOn(atomic, 'getAssets').mockResolvedValue([]);

    await atomic.getAssetsForAccount('foo', ['col1'], ['1', '2']);

    expect(getAssets).toHaveBeenCalledWith({
      owner: ['foo'],
      collection_name: ['col1'],
      ids: ['1', '2'],
    });
  });

  it('getAssetsForCollection filters by collection, schemas, templates and asset ids', async () => {
    const atomic = new Atomic('https://example.com');
    const getAssets = vi.spyOn(atomic, 'getAssets').mockResolvedValue([]);

    await atomic.getAssetsForCollection('col1', ['s1'], ['10'], ['1']);

    expect(getAssets).toHaveBeenCalledWith({
      collection_name: ['col1'],
      schema_name: ['s1'],
      template_id: ['10'],
      ids: ['1'],
    });
  });
});

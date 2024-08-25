import { AtomicAssetsAPIClient, Types } from '@wharfkit/atomicassets';
import { APIClient } from '@wharfkit/antelope';

class Atomic {
  client: AtomicAssetsAPIClient;

  constructor(url: string) {
    this.client = new AtomicAssetsAPIClient(new APIClient({ url }));
  }

  async getAssets(options: any) {
    let assets: Types.AssetObject[] = [];
    let limit = 1000;
    let page = 1;

    const countRes =
      await this.client.atomicassets.v1.get_assets_count(options);
    const count = countRes.data.toNumber() || 0;
    if (count === 0) {
      return assets;
    }

    const pages = Math.ceil(count / limit);

    do {
      const res = await this.client.atomicassets.v1.get_assets({
        ...options,
        limit,
        page,
      });
      if (res.data.length === 0) {
        break;
      }
      assets = assets.concat(res.data);
      page++;
    } while (page <= pages);

    return assets;
  }

  async getAssetsForAccount(
    account: string,
    collections: string[],
    assetIds: string[]
  ) {
    return this.getAssets({
      owner: [account],
      collection_name: collections,
      ids: assetIds,
    });
  }

  async getAssetsForCollection(
    collection: string,
    schemas: string[],
    templates: string[],
    assetIds: string[]
  ) {
    return this.getAssets({
      collection_name: collection,
      templates: templates,
      schemas: schemas,
      ids: assetIds,
    });
  }
}

export default Atomic;

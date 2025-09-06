# Atomic Assets IPFS Grabber

This script will grab all the IPFS hashes from Atomic Assets NFTs owned by a account or within a collection and output them to csv files.

## Usage

First install the required packages with `yarn install` or `npm install`.

### Grabbing all IPFS hashes for an account

To grab all IPFS hashes for an account, run one of the following commands depending on your package manager:

```bash
yarn run account --account=<account_name>
```

```bash
npm run account -- --account=<account_name>
```

Optionally, you can specify collections, and asset IDs to filter the results:

```bash
yarn run account --account=<account_name> --collections=<collection_name1>,<collection_name2> --assets=<asset_id1>,<asset_id2>,...
```

```bash
npm run account -- --account=<account_name> --collections=<collection_name1>,<collection_name2> --assets=<asset_id1>,<asset_id2>,...
```

### Grabbing all IPFS hashes for a collection

To grab all IPFS hashes for a collection, run one of the following commands depending on your package manager:

```bash
yarn run collection --collection=<collection_name>
```

```bash
npm run collection -- --collection=<collection_name>
```

Optionally, you can specify schemas, templates, and asset IDs to filter the results:

```bash
yarn run collection --collection=<collection_name> --schemas=<schema_name1>,<schema_name2> --templates=<template_id1>,<template_id2> --assets=<asset_id1>,<asset_id2>,...
```

```bash
npm run collection -- --collection=<collection_name> --schemas=<schema_name1>,<schema_name2> --templates=<template_id1>,<template_id2> --assets=<asset_id1>,<asset_id2>,...
```

### Output

The script will output the IPFS hashes into csv files in the `hashes` directory. Account output will be saves to `hashes/account`, and collection output will be saved to `hashes/collection`.

Individual files will be created for each collection when grabbing all IPFS hashes for an account, and for each schema when grabbing all IPFS hashes for a collection.

## Pinning

### Kubo

The pinning functionality allows you to pin IPFS hashes to your local Kubo node. This ensures the content remains available and cached locally.

1. Reads IPFS hashes from `hashes/pinning.csv`
2. Attempts to pin each hash to your Kubo node
3. Removes successfully pinned hashes from the CSV
4. Keeps failed hashes in the CSV for retry

```bash
yarn run kubo --url=http://localhost:5001
```

```bash
npm run kubo -- --url=http://localhost:5001
```

### Other Pinning Services

Currently only Kubo is supported nativeley, all hashes to be pinned are stored in `hashes/pinning.csv` which could be used in custom scripts to pin.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

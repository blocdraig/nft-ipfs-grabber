import fs from 'fs';
import { getIPFSHash } from './lib/ipfs.js';
import Atomic from './lib/atomicassets.js';

interface IArgs {
  api?: string;
  collection?: string;
  schemas?: string;
  templates?: string;
  assets?: string;
}

// get and check script arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('No arguments provided');
  process.exit(1);
}

const scriptArgs: IArgs = args.reduce((acc: any, arg) => {
  const [key, value] = arg.split('=');
  acc[key.slice(2)] = value;
  return acc;
}, {});

if (!scriptArgs.collection) {
  console.error('No collection provided');
  process.exit(1);
}

if (!scriptArgs.api) {
  scriptArgs.api = 'https://wax.api.atomicassets.io';
}

let schemas: string[] = [];
if (scriptArgs.schemas) {
  schemas = scriptArgs.schemas.split(',');
}

let templates: string[] = [];
if (scriptArgs.templates) {
  templates = scriptArgs.templates.split(',');
}

let assetIds: string[] = [];
if (scriptArgs.assets) {
  assetIds = scriptArgs.assets.split(',');
}

// validate account
const collectionName = scriptArgs.collection;
if (
  !collectionName.match(/(^[a-z1-5.]{1,11}[a-z1-5]$)|(^[a-z1-5.]{12}[a-j1-5]$)/)
) {
  console.error('Invalid account name');
  process.exit(1);
}

// validate url
const atomicUrl = new URL(scriptArgs.api);
if (!atomicUrl.protocol.startsWith('http')) {
  console.error('Invalid API URL');
  process.exit(1);
}

const run = async () => {
  const atomic = new Atomic(atomicUrl.href);

  const ipfsHashes: string[] = [];
  const ipfsHashesPerSchema: { [key: string]: string[] } = {};

  const assets = await atomic.getAssetsForCollection(
    collectionName,
    schemas,
    templates,
    assetIds
  );
  for (const asset of assets) {
    for (const key in asset.data) {
      const ipfsHash = getIPFSHash(asset.data[key]);
      if (ipfsHash) {
        if (!ipfsHashes.includes(ipfsHash)) {
          ipfsHashes.push(ipfsHash);
        }

        const schemaName = asset.schema.schema_name.toString();
        if (!ipfsHashesPerSchema[schemaName]) {
          ipfsHashesPerSchema[schemaName] = [];
        }
        if (!ipfsHashesPerSchema[schemaName].includes(ipfsHash)) {
          ipfsHashesPerSchema[schemaName].push(ipfsHash);
        }
      } else {
        // debug: if asset.data[key] includes 'Qm' or 'bafy' but is not a valid IPFS hash, log it
        if (typeof asset.data[key] == 'string') {
          if (
            asset.data[key].includes('Qm') ||
            asset.data[key].includes('bafy')
          ) {
            console.log(`Invalid IPFS hash: ${asset.data[key]}`);
          }
        }
      }
    }
  }

  console.log(`Total Assets: ${assets.length}`);
  console.log(`Total IPFS Hashes: ${ipfsHashes.length}`);

  const basePath = './hashes';
  if (!fs.existsSync(`${basePath}`)) {
    fs.mkdirSync(`${basePath}`);
  }

  const savePath = `${basePath}/collections`;
  if (!fs.existsSync(`${basePath}`)) {
    fs.mkdirSync(`${basePath}`);
  }

  if (fs.existsSync(`${savePath}`)) {
    fs.rmSync(`${savePath}`, { recursive: true });
  }
  if (!fs.existsSync(`${savePath}`)) {
    fs.mkdirSync(`${savePath}`);
  }

  if (fs.existsSync(`${savePath}/${collectionName}`)) {
    fs.rmSync(`${savePath}/${collectionName}`, { recursive: true });
  }
  if (!fs.existsSync(`${savePath}/${collectionName}`)) {
    fs.mkdirSync(`${savePath}/${collectionName}`);
  }

  for (const schemaName in ipfsHashesPerSchema) {
    const hashes = ipfsHashesPerSchema[schemaName];
    const fileName = `${savePath}/${collectionName}/schemas/${schemaName}.csv`;
    if (!fs.existsSync(`${savePath}/${collectionName}/schemas`)) {
      fs.mkdirSync(`${savePath}/${collectionName}/schemas`);
    }
    // write one per line
    fs.writeFileSync(fileName, hashes.join('\n'));
  }

  // save all IPFS hashes to a file
  const fileName = `${savePath}/${collectionName}/${collectionName}.csv`;
  fs.writeFileSync(fileName, ipfsHashes.join('\n'));
};

run().then();

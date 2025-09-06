import fs from 'fs';
import { CID, create, KuboRPCClient } from 'kubo-rpc-client';

interface IArgs {
  url?: string;
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

let url: string = '';
if (scriptArgs.url) {
  url = scriptArgs.url;
}

let ipfsClient: KuboRPCClient | undefined = undefined;
if (url) {
  ipfsClient = create(new URL(url));
  if (!ipfsClient) {
    console.error('Failed to create IPFS client');
    process.exit(1);
  }
}

const run = async () => {
  const basePath = './hashes';
  if (!fs.existsSync(`${basePath}`)) {
    fs.mkdirSync(`${basePath}`);
  }

  const pinningCsv = `${basePath}/pinning.csv`;

  // read hashes from `pinning.csv`, pin them to Kubo, and remove them from the csv. Keep any hashes that fail to pin.
  const ipfsHashes = fs.readFileSync(pinningCsv, 'utf8').split('\n');
  if (ipfsHashes.length === 0) {
    console.log('No hashes to pin');
    return;
  }

  if (ipfsClient) {
    console.log(`Pinning ${ipfsHashes.length} hashes to Kubo`);
    let successHashes: string[] = [];
    let failedHashes: string[] = [];
    let count = 0;
    for (const hash of ipfsHashes) {
      count++;
      console.log(`${count}/${ipfsHashes.length} - Pinning ${hash}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 seconds
      try {
        const res = await ipfsClient.pin.add(CID.parse(hash), { recursive: true, signal: controller.signal });
        if (res) {
          successHashes.push(hash.toString());
          // remove successHashes from ipfsHashes
          const remainingHashes = ipfsHashes.filter((h) => !successHashes.includes(h));
          fs.writeFileSync(pinningCsv, remainingHashes.join('\n'));
          continue;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn(`Pinning timed out for ${hash}, skipping...`);
        } else {
          console.error(`Error pinning ${hash}:`, err);
        }
      } finally {
        clearTimeout(timeout);
      }
      failedHashes.push(hash);
    }

    if (failedHashes.length > 0) {
      const ipfsHashesNew: string[] = failedHashes;
      console.log(`\n\nPinning ${ipfsHashesNew.length} hashes to Kubo (retry)`);
      failedHashes = [];
      count = 0;
      for (const hash of ipfsHashesNew) {
        count++;
        console.log(`${count}/${ipfsHashesNew.length} - Pinning ${hash}`);
        try {
          const res = await ipfsClient.pin.add(CID.parse(hash), { recursive: true });
          if (res) {
            successHashes.push(hash.toString());
            // remove successHashes from ipfsHashes
            const remainingHashes = ipfsHashesNew.filter((h) => !successHashes.includes(h));
            fs.writeFileSync(pinningCsv, remainingHashes.join('\n'));
            continue;
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.warn(`Pinning timed out for ${hash}, skipping...`);
          } else {
            console.error(`Error pinning ${hash}:`, err);
          }
        }
        failedHashes.push(hash);
      }
    }

    fs.writeFileSync(pinningCsv, failedHashes.join('\n'));
  }
};

run().then();

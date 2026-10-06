import { describe, expect, it } from 'vitest';
import { getIPFSHash } from '../../src/lib/ipfs.js';
import { CID_V0, CID_V1 } from '../helpers.js';

describe('getIPFSHash', () => {
  it.each([
    ['bare CIDv0', CID_V0, CID_V0],
    ['bare CIDv1', CID_V1, CID_V1],
    ['CID path', `${CID_V0}/path/to/file.png`, CID_V0],
    ['/ipfs/ path', `/ipfs/${CID_V0}`, CID_V0],
    ['/ipfs/ path with file', `/ipfs/${CID_V1}/1.png`, CID_V1],
    ['subdomain gateway', `https://${CID_V1}.ipfs.dweb.link`, CID_V1],
    [
      'subdomain gateway with path',
      `https://${CID_V1}.ipfs.dweb.link/img.png`,
      CID_V1,
    ],
    ['path gateway', `https://ipfs.io/ipfs/${CID_V0}`, CID_V0],
    [
      'path gateway with file and query',
      `https://gateway.pinata.cloud/ipfs/${CID_V1}/1.png?filename=a`,
      CID_V1,
    ],
  ])('extracts the hash from a %s', (_, input, expected) => {
    expect(getIPFSHash(input)).toBe(expected);
  });

  it.each([
    ['empty string', ''],
    ['plain text', 'Legendary Sword'],
    ['non-IPFS URL', 'https://example.com/image.png'],
    ['truncated CID', CID_V0.slice(0, 20)],
    ['CID with junk', `${CID_V0}xyz`],
  ])('returns undefined for %s', (_, input) => {
    expect(getIPFSHash(input)).toBeUndefined();
  });
});

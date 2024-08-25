import * as isIPFS from 'is-ipfs';

export const getIPFSHash = (path: string): string | void => {
  // QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o
  if (isIPFS.cid(path)) return path;

  // QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o/path/to/file
  if (isIPFS.cidPath(path)) return path.split(/[/?#&]/)[0];

  // /ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o
  if (isIPFS.ipfsPath(path)) return path.split('/')[2];

  // http://bafybeie5gq4jxvzmsym6hjlwxej4rwdoxt7wadqvmmwbqi7r27fclha2va.ipfs.dweb.link
  if (isIPFS.ipfsSubdomain(path)) return new URL(path).hostname.split('.')[0];

  // https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o
  if (isIPFS.url(path))
    return path.replace(/.*?(Qm|bafy)/, '$1').split(/[/?#&]/)[0];
};

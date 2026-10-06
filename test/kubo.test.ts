import fs from 'fs';
import { CID } from 'kubo-rpc-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CID_V0,
  CID_V0_B,
  CID_V1,
  ExitError,
  runScript,
  setupScriptTest,
} from './helpers.js';

const mocks = vi.hoisted(() => ({ create: vi.fn(), pinAdd: vi.fn() }));

vi.mock('kubo-rpc-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('kubo-rpc-client')>()),
  create: mocks.create,
}));

const pinningCsv = 'hashes/pinning.csv';

const writePinning = (...hashes: string[]) => {
  fs.mkdirSync('hashes', { recursive: true });
  fs.writeFileSync(pinningCsv, hashes.join('\n'));
};

const readPinning = () => fs.readFileSync(pinningCsv, 'utf8');

const abortError = () => {
  const err = new Error('aborted');
  err.name = 'AbortError';
  return err;
};

const run = (...args: string[]) =>
  runScript(() => import('../src/kubo.js'), args);

describe('kubo script', () => {
  setupScriptTest();

  beforeEach(() => {
    mocks.pinAdd.mockReset().mockImplementation(async (cid: CID) => cid);
    mocks.create.mockReset().mockReturnValue({ pin: { add: mocks.pinAdd } });
  });

  it('exits when no arguments are given', async () => {
    await expect(run()).rejects.toThrow(ExitError);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('No arguments provided');
  });

  it('does not pin or touch pinning.csv without --url', async () => {
    writePinning(CID_V0);

    await run('--foo=bar');

    expect(mocks.create).not.toHaveBeenCalled();
    expect(readPinning()).toBe(CID_V0);
  });

  it('creates a Kubo client for the given url', async () => {
    writePinning(CID_V0);

    await run('--url=http://localhost:5001');

    expect(mocks.create).toHaveBeenCalledWith(new URL('http://localhost:5001'));
  });

  it('recursively pins every hash and empties pinning.csv', async () => {
    writePinning(CID_V0, CID_V1);

    await run('--url=http://localhost:5001');

    expect(mocks.pinAdd).toHaveBeenCalledTimes(2);
    expect(mocks.pinAdd).toHaveBeenNthCalledWith(
      1,
      CID.parse(CID_V0),
      expect.objectContaining({
        recursive: true,
        signal: expect.any(AbortSignal),
      })
    );
    expect(mocks.pinAdd).toHaveBeenNthCalledWith(
      2,
      CID.parse(CID_V1),
      expect.objectContaining({ recursive: true })
    );
    expect(readPinning()).toBe('');
  });

  it('retries failed hashes once and keeps the ones that still fail', async () => {
    writePinning(CID_V0, CID_V1, CID_V0_B);
    let v1Attempts = 0;
    mocks.pinAdd.mockImplementation(async (cid: CID) => {
      const hash = cid.toString();
      const fails =
        hash === CID_V0_B || (hash === CID_V1 && v1Attempts++ === 0);
      if (fails) throw new Error('not found');
      return cid;
    });

    await run('--url=http://localhost:5001');

    // 3 first attempts + 2 retries
    expect(mocks.pinAdd).toHaveBeenCalledTimes(5);
    expect(mocks.pinAdd).toHaveBeenLastCalledWith(CID.parse(CID_V0_B), {
      recursive: true,
    });
    expect(readPinning()).toBe(CID_V0_B);
  });

  it('warns on timeouts and keeps the hash', async () => {
    writePinning(CID_V0);
    mocks.pinAdd.mockRejectedValue(abortError());

    await run('--url=http://localhost:5001');

    expect(console.warn).toHaveBeenCalledWith(
      `Pinning timed out for ${CID_V0}, skipping...`
    );
    expect(readPinning()).toBe(CID_V0);
  });

  it('logs and keeps hashes that are not valid CIDs', async () => {
    writePinning('not-a-cid', CID_V0);

    await run('--url=http://localhost:5001');

    expect(console.error).toHaveBeenCalledWith(
      'Error pinning not-a-cid:',
      expect.any(Error)
    );
    expect(mocks.pinAdd).toHaveBeenCalledTimes(1);
    expect(readPinning()).toBe('not-a-cid');
  });
});

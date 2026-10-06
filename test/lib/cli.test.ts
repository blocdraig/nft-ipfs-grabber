import { describe, expect, it } from 'vitest';
import { isAbortError, parseCliArgs } from '../../src/lib/cli.js';

describe('parseCliArgs', () => {
  it('parses --key=value pairs', () => {
    expect(
      parseCliArgs(['--account=foo', '--api=https://example.com'])
    ).toEqual({ account: 'foo', api: 'https://example.com' });
  });

  it('keeps everything after the first = as the value', () => {
    expect(parseCliArgs(['--api=https://x.io/?a=b'])).toEqual({
      api: 'https://x.io/?a=b',
    });
  });

  it('allows empty values', () => {
    expect(parseCliArgs(['--assets='])).toEqual({ assets: '' });
  });

  it('ignores args without = or without a -- prefix', () => {
    expect(parseCliArgs(['--flag', 'account=foo', '-a=b', 'plain'])).toEqual(
      {}
    );
  });

  it('lets later args override earlier ones', () => {
    expect(parseCliArgs(['--account=a', '--account=b'])).toEqual({
      account: 'b',
    });
  });

  it('returns an empty object for no args', () => {
    expect(parseCliArgs([])).toEqual({});
  });
});

describe('isAbortError', () => {
  it('detects errors named AbortError', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    expect(isAbortError(err)).toBe(true);
  });

  it('detects the reason of an aborted AbortController', () => {
    const controller = new AbortController();
    controller.abort();
    expect(isAbortError(controller.signal.reason)).toBe(true);
  });

  it('rejects other errors and non-errors', () => {
    expect(isAbortError(new Error('boom'))).toBe(false);
    expect(isAbortError({ name: 'AbortError' })).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });
});

export function parseCliArgs<T extends object>(args: string[]) {
  return args.reduce(
    (acc, arg) => {
      const eq = arg.indexOf('=');
      if (eq === -1) {
        return acc;
      }

      const key = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      if (!key.startsWith('--')) {
        return acc;
      }

      return {
        ...acc,
        [key.slice(2)]: value,
      };
    },
    {} as T
  );
}

export function isAbortError(err: unknown) {
  return err instanceof Error && err.name === 'AbortError';
}

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // script tests rely on process.chdir, which is unavailable in worker threads
    pool: 'forks',
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Disable file-level parallelism to prevent concurrent seeding race conditions on the shared MongoDB test database
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000
  }
});

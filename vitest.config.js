import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js', 'src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/**/__tests__/**']
    },
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    setupFiles: ['./tests/setup.js'],
    // 完全に順次実行
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1,
        minForks: 1
      }
    },
    // 並行実行を無効化
    maxWorkers: 1,
    maxConcurrency: 1,
    // ファイルごとに分離
    isolate: true,
    // タイムアウトを増やす
    testTimeout: 30000
  }
});
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    reporters: ['default', ['html', { singleFile: true }]]
  },
  resolve: {
    tsconfigPaths: true
  }
});

// Tests de los scripts de tooling del repo (scripts/**). Cada workspace tiene su propia config.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.spec.mjs'],
    coverage: {
      provider: 'v8',
      include: ['scripts/lib/**/*.mjs'],
      exclude: ['**/*.spec.mjs'],
      thresholds: { perFile: true, lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});

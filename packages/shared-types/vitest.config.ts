import { defineConfig } from 'vitest/config';
import { COVERAGE_EXCLUDE, DEFAULT_FLOOR } from '../../vitest.shared.ts';

export default defineConfig({
  test: {
    name: 'shared-types',
    include: ['src/**/*.spec.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: COVERAGE_EXCLUDE,
      thresholds: { perFile: true, ...DEFAULT_FLOOR },
    },
  },
});

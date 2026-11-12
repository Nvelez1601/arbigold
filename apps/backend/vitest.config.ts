// Unit: domain, application y adaptadores sin DB. La persistencia y HTTP se miden en vitest.int.config.ts.
import { defineConfig } from 'vitest/config';
import { COVERAGE_EXCLUDE, DEFAULT_FLOOR, DOMAIN_FLOOR } from '../../vitest.shared.ts';

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: {
    name: 'backend:unit',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['src/**/*.int.spec.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/unit',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        ...COVERAGE_EXCLUDE,
        'src/infrastructure/persistence/**',
        'src/infrastructure/entrypoints/http/**',
        'src/infrastructure/app.ts',
      ],
      thresholds: { perFile: true, ...DEFAULT_FLOOR, 'src/domain/**': DOMAIN_FLOOR },
    },
  },
});

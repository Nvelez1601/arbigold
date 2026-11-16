// Integración: repositories contra Postgres real (proyecto Supabase de test, ADR-005) y HTTP con Supertest.
// Prohibido mockear la DB aquí (instructions/testing.md, Regla 3).
import { defineConfig } from 'vitest/config';
import { COVERAGE_EXCLUDE, DEFAULT_FLOOR } from '../../vitest.shared.ts';

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: {
    name: 'backend:int',
    environment: 'node',
    include: ['src/**/*.int.spec.ts'],
    passWithNoTests: true,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/int',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: [
        'src/infrastructure/persistence/**/*.ts',
        'src/infrastructure/entrypoints/http/**/*.ts',
        'src/infrastructure/app.ts',
      ],
      exclude: COVERAGE_EXCLUDE,
      thresholds: { perFile: true, ...DEFAULT_FLOOR },
    },
  },
});

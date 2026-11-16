import { defineConfig, mergeConfig } from 'vitest/config';
import { COVERAGE_EXCLUDE, DEFAULT_FLOOR } from '../../vitest.shared.ts';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'frontend',
      environment: 'jsdom',
      include: ['src/**/*.spec.ts'],
      passWithNoTests: true,
      // Procesa CSS para que `import x from './styles.css?raw'` traiga el texto (palette.spec.ts).
      css: { include: [/styles\.css/] },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'json-summary', 'html'],
        include: ['src/**/*.{ts,vue}'],
        exclude: COVERAGE_EXCLUDE,
        thresholds: { perFile: true, ...DEFAULT_FLOOR },
      },
    },
  }),
);

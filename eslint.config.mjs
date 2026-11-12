// ESLint flat config — ArbiGold.
// Hace cumplir: instructions/clean-code.md, instructions/architecture.md (regla de dependencia
// hexagonal + aislamiento de módulos) e instructions/testing.md (sin tests focalizados/saltados).
import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const SPEC_FILES = ['**/*.spec.ts', '**/*.int.spec.ts', '**/*.contract.ts', '**/*.spec.mjs'];
const TS_PROJECTS = [
  'apps/backend/tsconfig.json',
  'apps/frontend/tsconfig.json',
  'packages/shared-types/tsconfig.json',
];

// ---------- Clean code: límites verificables (instructions/clean-code.md) ----------
const cleanCodeRules = {
  'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
  'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
  'max-params': ['error', 3],
  'max-depth': ['error', 2],
  complexity: ['error', 8],
  'no-else-return': ['error', { allowElseIf: false }],
  'no-nested-ternary': 'error',
  'no-console': 'error',
  'no-magic-numbers': 'off',
  eqeqeq: ['error', 'always'],
  'no-throw-literal': 'error',
  'prefer-const': 'error',
  'no-var': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  'no-empty': ['error', { allowEmptyCatch: false }],
};

// ---------- Arquitectura hexagonal (instructions/architecture.md) ----------
// El orden importa: gana el primer descriptor que coincide.
const B = 'apps/backend/src';
const boundaryElements = [
  { type: 'domain-shared', pattern: `${B}/domain/shared`, partialMatch: false },
  { type: 'domain', pattern: `${B}/domain/*`, capture: ['module'], partialMatch: false },
  { type: 'application-shared', pattern: `${B}/application/shared`, partialMatch: false },
  {
    type: 'application',
    pattern: `${B}/application/*`,
    capture: ['module'],
    partialMatch: false,
  },
  { type: 'infrastructure', pattern: `${B}/infrastructure`, partialMatch: false },
  { type: 'backend-root', pattern: B, partialMatch: false },
  { type: 'backend-test', pattern: 'apps/backend/test', partialMatch: false },
  { type: 'shared-types', pattern: 'packages/shared-types/src', partialMatch: false },
  {
    type: 'frontend-module',
    pattern: 'apps/frontend/src/modules/*',
    capture: ['module'],
    partialMatch: false,
  },
  { type: 'frontend', pattern: 'apps/frontend', partialMatch: false },
  { type: 'scripts', pattern: 'scripts', partialMatch: false },
];

const SAME_MODULE = { captured: { module: '{{ from.element.captured.module }}' } };
const allowTo = (types) => ({ to: { element: { types } } });
const allowExternal = (source = '**') => ({
  to: { module: { origin: ['external', 'core'], source } },
});

const boundaryPolicies = [
  // DOMAIN: solo su propio módulo + shared kernel + decimal.js. Nada de frameworks, DB ni Node core.
  {
    from: { element: { type: 'domain-shared' } },
    allow: [allowTo(['domain-shared']), allowExternal('decimal.js')],
  },
  {
    from: { element: { type: 'domain' } },
    allow: [
      allowTo(['domain-shared']),
      { to: { element: { type: 'domain', ...SAME_MODULE } } },
      allowExternal('decimal.js'),
    ],
  },
  // APPLICATION: domain + sus puertos. Sin infraestructura ni frameworks.
  {
    from: { element: { type: 'application-shared' } },
    allow: [allowTo(['domain-shared', 'application-shared']), allowExternal('decimal.js')],
  },
  {
    from: { element: { type: 'application' } },
    allow: [
      allowTo(['domain-shared', 'application-shared', 'shared-types']),
      { to: { element: { type: 'domain', ...SAME_MODULE } } },
      { to: { element: { type: 'application', ...SAME_MODULE } } },
      allowExternal('decimal.js'),
    ],
  },
  // INFRASTRUCTURE: adaptadores; único lugar con frameworks.
  {
    from: { element: { type: 'infrastructure' } },
    allow: [
      allowTo([
        'domain-shared',
        'domain',
        'application-shared',
        'application',
        'infrastructure',
        'shared-types',
      ]),
      allowExternal(),
    ],
  },
  {
    from: { element: { type: 'backend-root' } },
    allow: [allowTo(['infrastructure']), allowExternal()],
  },
  {
    from: { element: { type: 'backend-test' } },
    allow: [
      allowTo([
        'domain-shared',
        'domain',
        'application-shared',
        'application',
        'infrastructure',
        'backend-test',
        'shared-types',
      ]),
      allowExternal(),
    ],
  },
  // CONTRATOS compartidos: solo se importan a sí mismos + zod.
  {
    from: { element: { type: 'shared-types' } },
    allow: [allowTo(['shared-types']), allowExternal('zod')],
  },
  // FRONTEND: un módulo no importa el interior de otro módulo.
  {
    from: { element: { type: 'frontend-module' } },
    allow: [
      allowTo(['frontend', 'shared-types']),
      { to: { element: { type: 'frontend-module', ...SAME_MODULE } } },
      allowExternal(),
    ],
  },
  {
    from: { element: { type: 'frontend' } },
    allow: [allowTo(['frontend', 'frontend-module', 'shared-types']), allowExternal()],
  },
  { from: { element: { type: 'scripts' } }, allow: [allowTo(['scripts']), allowExternal()] },
  // Los specs pueden usar el soporte de test (builders, withDatabase, fakes).
  {
    from: { file: { categories: 'test' } },
    allow: [allowTo(['backend-test']), allowExternal()],
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'supabase/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strict,
  ...vue.configs['flat/recommended'],

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: cleanCodeRules,
  },

  // Vue SFC con parser de TypeScript
  {
    files: ['apps/frontend/**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
    rules: {
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/no-v-html': 'error',
    },
  },

  // Fronteras hexagonales
  {
    files: ['apps/**/*.{ts,vue}', 'packages/**/*.ts', 'scripts/**/*.mjs'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': boundaryElements,
      'boundaries/files': [{ pattern: SPEC_FILES, category: 'test' }],
      'boundaries/include': ['apps/**', 'packages/**', 'scripts/**'],
      'import/resolver': {
        typescript: {
          project: TS_PROJECTS,
          conditionNames: ['development', 'types', 'import'],
          noWarnOnMultipleProjects: true,
        },
        node: true,
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // Evalúa también paquetes externos y core de Node (express en domain = error).
          checkAllOrigins: true,
          policies: boundaryPolicies,
          message:
            'Arquitectura: "{{ from.element.types.[0] }}" no puede depender de "{{ to.element.types.[0] }}{{ to.module.source }}". Ver instructions/architecture.md',
        },
      ],
    },
  },

  // Domain y application: sin process.env, sin reloj, sin números flotantes "mágicos" de I/O
  {
    files: [`${B}/domain/**/*.ts`, `${B}/application/**/*.ts`],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Config solo en infrastructure/config.' },
        { object: 'Date', property: 'now', message: 'El tiempo entra por el puerto Clock.' },
        { object: 'Math', property: 'random', message: 'La aleatoriedad entra por un puerto.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'NewExpression[callee.name="Date"][arguments.length=0]',
          message: 'El tiempo entra por el puerto Clock.',
        },
        {
          selector: 'CallExpression[callee.property.name="toFixed"]',
          message: 'Redondeo centralizado en RoundingPolicy (Decimal), nunca toFixed().',
        },
        {
          selector: 'CallExpression[callee.name="parseFloat"]',
          message: 'Dinero/pesos/tasas son Decimal, nunca float.',
        },
      ],
    },
  },

  // process.env solo en infrastructure/config
  {
    files: ['apps/backend/src/**/*.ts'],
    ignores: [`${B}/infrastructure/config/**`, `${B}/domain/**`, `${B}/application/**`],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Config solo en infrastructure/config.' },
      ],
    },
  },

  // Specs: sin focus/skip, límites de tamaño relajados
  {
    files: [...SPEC_FILES, 'apps/frontend/e2e/**/*.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'max-lines-per-function': 'off',
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },

  // Archivos de configuración del tooling
  {
    files: ['*.config.{js,mjs,ts}', '**/*.config.{js,mjs,ts}', '.lintstagedrc.mjs'],
    rules: { 'max-lines': 'off' },
  },

  // Siempre al final: desactiva reglas de estilo que pelean con Prettier
  prettier,
);

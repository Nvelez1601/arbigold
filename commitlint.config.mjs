// Formato de commit (AGENTS.md): tipo(scope): descripción [| ARB-123]
// Ej: feat(arbitrage): calcula margen neto | ARB-12
const MODULES = ['treasury', 'sourcing', 'arbitrage', 'exports', 'compliance', 'identity', 'audit'];
const AREAS = [
  'backend',
  'frontend',
  'shared-types',
  'db',
  'tooling',
  'ci',
  'deps',
  'norms',
  'docs',
  'structure',
  'security',
  'skills',
  'reviews',
];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'test',
        'docs',
        'chore',
        'ci',
        'build',
        'revert',
        'style',
      ],
    ],
    'scope-enum': [2, 'always', [...MODULES, ...AREAS]],
    'scope-empty': [2, 'never'],
    'subject-case': [0],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 100],
  },
};

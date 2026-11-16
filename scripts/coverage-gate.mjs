#!/usr/bin/env node
// Regla 2 de instructions/testing.md: toda línea agregada desde <base> se ejecuta en algún test.
// Requiere los coverage-final.json frescos (npm run test:cov). Uso:
//   node scripts/coverage-gate.mjs [base]
// base por defecto: merge-base con origin/main (lo que aún no se pusheó). Sin remoto: todo el repo.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { evaluateDiffCoverage, parseAddedLines, relativizeReport } from './lib/diff-coverage.mjs';
import { isSourceFile } from './lib/spec-presence.mjs';

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const REPORTS = [
  'coverage/coverage-final.json',
  'apps/backend/coverage/unit/coverage-final.json',
  'apps/backend/coverage/int/coverage-final.json',
  'apps/frontend/coverage/coverage-final.json',
  'packages/shared-types/coverage/coverage-final.json',
];

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return '';
  }
};

const resolveBase = (explicit) => {
  if (explicit) return git('rev-parse', '--verify', explicit);
  return tryGit('merge-base', 'HEAD', 'origin/main') || EMPTY_TREE;
};

const root = git('rev-parse', '--show-toplevel');
const base = resolveBase(process.argv[2]);
const diff = git('diff', '--unified=0', '--no-color', '--diff-filter=AMR', base, 'HEAD');
const reports = REPORTS.filter((path) => existsSync(`${root}/${path}`)).map((path) =>
  relativizeReport(JSON.parse(readFileSync(`${root}/${path}`, 'utf8')), root),
);
const isSubject = (path) => isSourceFile(path) && !path.endsWith('/index.ts');
const result = evaluateDiffCoverage(parseAddedLines(diff), reports, { isSubject });

const label = base === EMPTY_TREE ? 'todo el repo' : base.slice(0, 8);
if (result.ok) {
  process.stdout.write(
    `✓ diff-coverage: todo lo agregado desde ${label} se ejecuta en algún test.\n`,
  );
  process.exit(0);
}
const lines = [
  ...result.unmeasured.map(
    (file) =>
      `  ✗ ${file}\n      → ningún reporte de cobertura lo midió (¿corriste npm run test:cov?)`,
  ),
  ...result.violations.map(
    ({ file, uncovered }) =>
      `  ✗ ${file}\n${uncovered.map((i) => `      línea ${i.line}: ${i.kind}${i.name ? ` ${i.name}` : ''}${i.arm === undefined ? '' : ` (brazo ${i.arm})`} nunca se ejecutó`).join('\n')}`,
  ),
];
process.stderr.write(
  `\nRegla 2 (instructions/testing.md): lo agregado desde ${label} tiene que ejecutarse.\n\n${lines.join('\n')}\n\nEscribe el test que entre ahí. No bajes pisos ni excluyas archivos.\n\n`,
);
process.exit(1);

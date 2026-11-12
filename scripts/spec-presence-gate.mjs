#!/usr/bin/env node
// CLI del gate de specs. Uso:
//   node scripts/spec-presence-gate.mjs --staged   (pre-commit: archivos en stage)
//   node scripts/spec-presence-gate.mjs --all      (CI / auditoría: todo el repo)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { findMissingSpecs } from './lib/spec-presence.mjs';

const GIT_FILE_LISTS = {
  '--staged': ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
  '--all': ['ls-files', '--cached', '--others', '--exclude-standard'],
};

const mode = process.argv[2] ?? '--staged';
const gitArgs = GIT_FILE_LISTS[mode];
if (!gitArgs) {
  process.stderr.write(`Modo desconocido: ${mode}. Usa --staged o --all.\n`);
  process.exit(2);
}

const paths = execFileSync('git', gitArgs, { encoding: 'utf8' }).split('\n').filter(Boolean);
const missing = findMissingSpecs(paths, {
  exists: existsSync,
  read: (path) => readFileSync(path, 'utf8'),
});

if (missing.length > 0) {
  const lines = missing.map(
    ({ file, expected }) => `  ✗ ${file}\n      → crea ${expected.join(' o ')}`,
  );
  process.stderr.write(
    `\nPrincipio de specs: ${missing.length} archivo(s) sin spec (instructions/testing.md, Regla 0)\n\n${lines.join('\n')}\n\n`,
  );
  process.exit(1);
}
process.stdout.write(`✓ spec-presence: ${paths.length} archivo(s) revisados, todos con spec.\n`);

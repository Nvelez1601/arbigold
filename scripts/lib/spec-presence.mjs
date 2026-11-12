// Lógica pura del gate "todo archivo tiene su spec" (instructions/testing.md, Regla 0).
import {
  EXEMPT_PATTERNS,
  INTEGRATION_ONLY_PATTERNS,
  SOURCE_EXTENSIONS,
  SOURCE_ROOTS,
  SPEC_SUFFIXES,
} from '../spec-gate.config.mjs';

const BARREL_LINE =
  /^(export\s+(\*|\{[^}]*\}|type\s+\{[^}]*\})(\s+as\s+\w+)?\s+from\s+['"][^'"]+['"];?|\/\/.*)$/;

const matchesAny = (patterns, path) => patterns.some((pattern) => pattern.test(path));
const extensionOf = (path) => SOURCE_EXTENSIONS.find((ext) => path.endsWith(ext));

/** true si el contenido es un barrel: solo re-exports (y comentarios). */
export const isBarrel = (content) =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .every((line) => BARREL_LINE.test(line));

/** true si el path es un archivo ejecutable sujeto al principio de specs. */
export const isSourceFile = (path) =>
  matchesAny(SOURCE_ROOTS, path) &&
  extensionOf(path) !== undefined &&
  !SPEC_SUFFIXES.some((suffix) => path.endsWith(suffix)) &&
  !matchesAny(EXEMPT_PATTERNS, path);

const SPEC_CANDIDATES_BY_EXTENSION = {
  '.ts': (base) => [`${base}.spec.ts`, `${base}.int.spec.ts`],
  '.vue': (base) => [`${base}.spec.ts`],
  '.mjs': (base) => [`${base}.spec.mjs`],
};

/** Specs aceptados para un archivo fuente, en orden de preferencia. */
export const expectedSpecs = (path) => {
  const extension = extensionOf(path) ?? '';
  const base = path.slice(0, -extension.length);
  if (matchesAny(INTEGRATION_ONLY_PATTERNS, path)) return [`${base}.int.spec.ts`];
  return SPEC_CANDIDATES_BY_EXTENSION[extension]?.(base) ?? [];
};

/**
 * Devuelve los archivos fuente sin spec.
 * @param {string[]} paths paths relativos a la raíz del repo
 * @param {{ exists: (p: string) => boolean, read: (p: string) => string }} fs
 * @returns {{ file: string, expected: string[] }[]}
 */
export const findMissingSpecs = (paths, fs) =>
  paths
    .filter(isSourceFile)
    .filter((path) => !(path.endsWith('/index.ts') && isBarrel(fs.read(path))))
    .map((file) => ({ file, expected: expectedSpecs(file) }))
    .filter(({ expected }) => !expected.some((spec) => fs.exists(spec)));

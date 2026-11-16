// Lógica pura de la Regla 2 de instructions/testing.md:
// "lo que agregaste tiene que ejecutarse". Cruza las líneas agregadas del diff con los
// reportes istanbul (coverage-final.json) y devuelve lo nuevo que ningún test ejecutó.

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
const NEW_FILE_HEADER = /^\+\+\+ (?:b\/)?(.+)$/;

/**
 * Líneas agregadas por archivo a partir de un `git diff --unified=0`.
 * @param {string} diff
 * @returns {Map<string, Set<number>>}
 */
export const parseAddedLines = (diff) => {
  const added = new Map();
  let file = null;
  let line = 0;
  for (const text of diff.split('\n')) {
    const header = NEW_FILE_HEADER.exec(text);
    if (header) {
      file = header[1] === '/dev/null' ? null : header[1];
      continue;
    }
    const hunk = HUNK_HEADER.exec(text);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (!file || !text.startsWith('+')) continue;
    added.set(file, (added.get(file) ?? new Set()).add(line));
    line += 1;
  }
  return added;
};

const startLine = (location) => location?.start?.line;

/** Statements, funciones y branches que empiezan en una línea agregada y no se ejecutaron. */
export const uncoveredAddedItems = (fileCoverage, addedLines) => {
  const isAdded = (location) => addedLines.has(startLine(location));
  const statements = Object.entries(fileCoverage.statementMap)
    .filter(([id, loc]) => isAdded(loc) && fileCoverage.s[id] === 0)
    .map(([, loc]) => ({ kind: 'statement', line: startLine(loc) }));
  const functions = Object.entries(fileCoverage.fnMap)
    .filter(([id, fn]) => isAdded(fn.decl ?? fn.loc) && fileCoverage.f[id] === 0)
    .map(([, fn]) => ({ kind: 'function', line: startLine(fn.decl ?? fn.loc), name: fn.name }));
  const branches = Object.entries(fileCoverage.branchMap).flatMap(([id, branch]) =>
    branch.locations
      .map((location, arm) => ({ location: startLine(location) ? location : branch.loc, arm }))
      .filter(({ location, arm }) => isAdded(location) && fileCoverage.b[id][arm] === 0)
      .map(({ location, arm }) => ({ kind: 'branch', line: startLine(location), arm })),
  );
  return [...statements, ...functions, ...branches];
};

const itemKey = ({ kind, line, name, arm }) => `${kind}:${line}:${name ?? ''}:${arm ?? ''}`;

/** Un ítem cuenta como cubierto si CUALQUIER reporte (unit o int) lo ejecutó. */
const intersectUncovered = (lists) =>
  lists.reduce((acc, list) => {
    const keys = new Set(list.map(itemKey));
    return acc.filter((item) => keys.has(itemKey(item)));
  });

/**
 * @param {Map<string, Set<number>>} addedByFile  paths relativos al repo
 * @param {Array<Record<string, object>>} reports  coverage-final.json ya relativizados
 * @param {{ isSubject: (path: string) => boolean }} rules  qué archivos exige el gate
 */
export const evaluateDiffCoverage = (addedByFile, reports, rules) => {
  const violations = [];
  const unmeasured = [];
  for (const [file, lines] of addedByFile) {
    if (!rules.isSubject(file)) continue;
    const measured = reports.map((report) => report[file]).filter(Boolean);
    if (measured.length === 0) {
      unmeasured.push(file);
      continue;
    }
    const uncovered = intersectUncovered(measured.map((cov) => uncoveredAddedItems(cov, lines)));
    if (uncovered.length > 0) violations.push({ file, uncovered });
  }
  return { violations, unmeasured, ok: violations.length === 0 && unmeasured.length === 0 };
};

/** Convierte las claves absolutas de un coverage-final.json en paths relativos al repo. */
export const relativizeReport = (report, repoRoot) =>
  Object.fromEntries(
    Object.entries(report).map(([path, cov]) => [path.replace(`${repoRoot}/`, ''), cov]),
  );

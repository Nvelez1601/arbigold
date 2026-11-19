import { describe, expect, it } from 'vitest';
import {
  MIN_NEW_STATEMENTS_PCT,
  evaluateDiffCoverage,
  parseAddedLines,
  relativizeReport,
  uncoveredAddedItems,
} from './diff-coverage.mjs';

const DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -2,0 +3,2 @@ export const x = 1;',
  '+export const nueva = () => 1;',
  '+export const otra = () => 2;',
  '@@ -10 +12 @@',
  '-viejo',
  '+nuevo',
  'diff --git a/src/borrado.ts b/src/borrado.ts',
  '--- a/src/borrado.ts',
  '+++ /dev/null',
  '@@ -1 +0,0 @@',
  '-adiós',
].join('\n');

/** Cobertura istanbul mínima: una función en la línea 3 y otra en la 4. */
const coverage = ({ s = {}, f = {}, b = {} } = {}) => ({
  statementMap: {
    0: { start: { line: 3 }, end: { line: 3 } },
    1: { start: { line: 4 }, end: { line: 4 } },
  },
  fnMap: {
    0: { name: 'nueva', decl: { start: { line: 3 } }, loc: { start: { line: 3 } } },
    1: { name: 'otra', decl: { start: { line: 4 } }, loc: { start: { line: 4 } } },
  },
  branchMap: {
    0: { loc: { start: { line: 12 } }, locations: [{ start: { line: 12 } }, {}] },
  },
  s: { 0: 1, 1: 1, ...s },
  f: { 0: 1, 1: 1, ...f },
  b: { 0: [1, 1], ...b },
});

describe('parseAddedLines', () => {
  it('extrae las líneas agregadas por archivo con su número en el archivo nuevo', () => {
    const added = parseAddedLines(DIFF);
    expect([...added.get('src/a.ts')]).toEqual([3, 4, 12]);
  });

  it('ignora los archivos borrados', () => {
    expect(parseAddedLines(DIFF).has('src/borrado.ts')).toBe(false);
  });
});

describe('uncoveredAddedItems', () => {
  it('no reporta nada si todo lo agregado se ejecutó', () => {
    expect(uncoveredAddedItems(coverage(), new Set([3, 4, 12]))).toEqual([]);
  });

  it('reporta la función nueva que ningún test llamó, aunque el archivo pase el piso', () => {
    const items = uncoveredAddedItems(coverage({ s: { 1: 0 }, f: { 1: 0 } }), new Set([3, 4]));
    expect(items).toEqual([
      { kind: 'statement', line: 4 },
      { kind: 'function', line: 4, name: 'otra' },
    ]);
  });

  it('reporta el brazo de branch agregado que nunca se tomó (usa la línea del branch si falta la del brazo)', () => {
    const items = uncoveredAddedItems(coverage({ b: { 0: [1, 0] } }), new Set([12]));
    expect(items).toEqual([{ kind: 'branch', line: 12, arm: 1 }]);
  });

  it('ubica por su loc una función sin declaración (p. ej. una flecha anónima)', () => {
    const cov = coverage({ f: { 1: 0 } });
    cov.fnMap[1] = { name: '(anonymous_1)', loc: { start: { line: 4 } } };
    expect(uncoveredAddedItems(cov, new Set([4]))).toEqual([
      { kind: 'function', line: 4, name: '(anonymous_1)' },
    ]);
  });

  it('ignora lo no ejecutado que NO es parte del diff (código viejo)', () => {
    expect(uncoveredAddedItems(coverage({ s: { 0: 0 }, f: { 0: 0 } }), new Set([4]))).toEqual([]);
  });
});

describe('evaluateDiffCoverage', () => {
  const rules = { isSubject: (path) => path.startsWith('src/') };
  const added = new Map([
    ['src/a.ts', new Set([4])],
    ['README.md', new Set([1])],
  ]);

  it('aprueba cuando lo nuevo se ejecutó en algún reporte', () => {
    const result = evaluateDiffCoverage(added, [{ 'src/a.ts': coverage() }], rules);
    expect(result).toEqual({ violations: [], unmeasured: [], ok: true });
  });

  it('cuenta como cubierto lo que ejecutó la suite de integración aunque unit no', () => {
    const unit = { 'src/a.ts': coverage({ s: { 1: 0 }, f: { 1: 0 } }) };
    const integration = { 'src/a.ts': coverage() };
    expect(evaluateDiffCoverage(added, [unit, integration], rules).ok).toBe(true);
  });

  it('rechaza con el detalle de lo no ejecutado', () => {
    const unit = { 'src/a.ts': coverage({ s: { 1: 0 }, f: { 1: 0 } }) };
    const result = evaluateDiffCoverage(added, [unit], rules);
    expect(result.ok).toBe(false);
    expect(result.violations[0]?.file).toBe('src/a.ts');
  });

  it('una rama o función sin ejecutar ya no bloquea si las sentencias nuevas se ejecutaron', () => {
    const report = { 'src/a.ts': coverage({ b: { 0: [1, 0] } }) };
    const branchOnly = new Map([['src/a.ts', new Set([12])]]);
    expect(evaluateDiffCoverage(branchOnly, [report], rules).ok).toBe(true);
  });

  it(`exige al menos ${MIN_NEW_STATEMENTS_PCT} % de las sentencias nuevas por archivo`, () => {
    const half = { 'src/a.ts': coverage({ s: { 1: 0 } }) };
    const both = new Map([['src/a.ts', new Set([3, 4])]]);
    const result = evaluateDiffCoverage(both, [half], rules);
    expect(result.ok).toBe(false);
    expect(result.violations[0]).toMatchObject({ pct: 50, total: 2 });
    expect(evaluateDiffCoverage(both, [half], { ...rules, minPct: 50 }).ok).toBe(true);
  });

  it('rechaza un archivo sujeto al gate que ningún reporte midió', () => {
    const result = evaluateDiffCoverage(added, [{}], rules);
    expect(result.unmeasured).toEqual(['src/a.ts']);
    expect(result.ok).toBe(false);
  });
});

describe('relativizeReport', () => {
  it('convierte las rutas absolutas del reporte en rutas del repo', () => {
    expect(relativizeReport({ '/repo/src/a.ts': 1 }, '/repo')).toEqual({ 'src/a.ts': 1 });
  });
});

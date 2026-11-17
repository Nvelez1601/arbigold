import { describe, expect, it } from 'vitest';
import { expectedSpecs, findMissingSpecs, isBarrel, isSourceFile } from './spec-presence.mjs';

const fakeFs = (files) => ({
  exists: (path) => path in files,
  read: (path) => files[path] ?? '',
});

describe('isSourceFile', () => {
  it('considera fuente un archivo TS del backend', () => {
    expect(isSourceFile('apps/backend/src/domain/shared/money.vo.ts')).toBe(true);
  });

  it('considera fuente un componente Vue', () => {
    expect(isSourceFile('apps/frontend/src/app/App.vue')).toBe(true);
  });

  it('ignora los propios specs', () => {
    expect(isSourceFile('apps/backend/src/domain/shared/money.vo.spec.ts')).toBe(false);
    expect(isSourceFile('apps/backend/src/x/a.repository.int.spec.ts')).toBe(false);
    expect(isSourceFile('scripts/lib/spec-presence.spec.mjs')).toBe(false);
  });

  it('ignora archivos fuera de las raíces de código', () => {
    expect(isSourceFile('eslint.config.mjs')).toBe(false);
    expect(isSourceFile('apps/backend/vitest.config.ts')).toBe(false);
  });

  it('respeta la lista cerrada de exenciones', () => {
    expect(isSourceFile('apps/backend/src/main.ts')).toBe(false);
    expect(isSourceFile('apps/backend/src/application/arbitrage/ports/outbound/x.port.ts')).toBe(
      false,
    );
    expect(isSourceFile('apps/frontend/src/env.d.ts')).toBe(false);
  });

  it('ignora extensiones no ejecutables', () => {
    expect(isSourceFile('apps/frontend/src/app/styles.css')).toBe(false);
  });
});

describe('expectedSpecs', () => {
  it('acepta unit o integración para un archivo TS común', () => {
    expect(expectedSpecs('apps/backend/src/domain/a/b.service.ts')).toEqual([
      'apps/backend/src/domain/a/b.service.spec.ts',
      'apps/backend/src/domain/a/b.service.int.spec.ts',
    ]);
  });

  it('exige integración para un repository (DB real)', () => {
    expect(expectedSpecs('apps/backend/src/infrastructure/persistence/a/op.repository.ts')).toEqual(
      ['apps/backend/src/infrastructure/persistence/a/op.repository.int.spec.ts'],
    );
  });

  it('las rutas de Vue Router del frontend aceptan un spec unitario', () => {
    expect(expectedSpecs('apps/frontend/src/modules/sourcing/clients.routes.ts')).toEqual([
      'apps/frontend/src/modules/sourcing/clients.routes.spec.ts',
      'apps/frontend/src/modules/sourcing/clients.routes.int.spec.ts',
    ]);
  });

  it('pide Nombre.spec.ts para un componente Vue', () => {
    expect(expectedSpecs('apps/frontend/src/app/App.vue')).toEqual([
      'apps/frontend/src/app/App.spec.ts',
    ]);
  });

  it('no pide spec para un archivo que no es código ejecutable', () => {
    expect(expectedSpecs('docs/domain/glossary.md')).toEqual([]);
  });

  it('pide .spec.mjs para un script', () => {
    expect(expectedSpecs('scripts/lib/x.mjs')).toEqual(['scripts/lib/x.spec.mjs']);
  });
});

describe('isBarrel', () => {
  it('reconoce un archivo de solo re-exports', () => {
    expect(isBarrel("// contratos\nexport * from './a.js';\nexport { b } from './b.js';\n")).toBe(
      true,
    );
    expect(isBarrel("export type { C } from './c.js';")).toBe(true);
  });

  it('detecta lógica dentro de un index', () => {
    expect(isBarrel("export * from './a.js';\nexport const x = 1;")).toBe(false);
  });
});

describe('findMissingSpecs', () => {
  it('reporta el archivo fuente sin spec y los specs aceptados', () => {
    const file = 'apps/backend/src/domain/a/b.service.ts';
    expect(findMissingSpecs([file], fakeFs({}))).toEqual([{ file, expected: expectedSpecs(file) }]);
  });

  it('acepta el archivo cuando su spec existe', () => {
    const file = 'apps/backend/src/domain/a/b.service.ts';
    const fs = fakeFs({ 'apps/backend/src/domain/a/b.service.spec.ts': '' });
    expect(findMissingSpecs([file], fs)).toEqual([]);
  });

  it('exime un index que solo re-exporta, pero no uno con lógica', () => {
    const barrel = 'packages/shared-types/src/index.ts';
    const logic = 'apps/backend/src/domain/a/index.ts';
    const fs = fakeFs({ [barrel]: "export * from './x.js';", [logic]: 'export const y = 2;' });
    expect(findMissingSpecs([barrel, logic], fs).map(({ file }) => file)).toEqual([logic]);
  });
});

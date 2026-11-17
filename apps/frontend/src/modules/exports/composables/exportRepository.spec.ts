import type { Export, PackingList } from '@arbigold/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportsRepository, packingListsRepository } from '../../../shared/data/repositories.ts';
import {
  ExportOperationError,
  advanceExport,
  describeSaveFailure,
  registerExport,
} from './exportRepository.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Node 26 trae su propio localStorage vacío: los tests instalan uno en memoria y parten de cero. */
beforeEach(async () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    },
  });
  for (const repository of [exportsRepository, packingListsRepository]) {
    for (const record of await repository.list()) await repository.remove(record.id);
  }
});

const repositories = { exports: exportsRepository, packingLists: packingListsRepository };

const CREATED = '2026-11-17T12:00:00.000Z';
const receivedList = async (): Promise<PackingList> => {
  const list = await packingListsRepository.create({
    clientId: 'c-1',
    issuedOn: '2026-11-10',
    pieces: [{ number: 1, grossWeight: '1000', fineness: '900' }],
  });
  return packingListsRepository.update(list.id, { status: 'RECIBIDO' });
};

const anExport = (overrides: Partial<Export> = {}): Export =>
  ({
    id: 'ex-1',
    supplierId: 's-1',
    shippedOn: '2026-11-17',
    destination: 'Refinería',
    packingListIds: [],
    status: 'PREPARACION',
    createdAt: CREATED,
    ...overrides,
  }) as Export;

describe('describeSaveFailure', () => {
  it('traduce los fallos propios y deja un texto genérico para el resto', () => {
    expect(describeSaveFailure(new Error('cualquier cosa'))).toEqual({
      summary: 'No se pudo registrar la exportación',
      detail: 'Tus datos siguen en el formulario: vuelve a intentarlo.',
    });
    const own = new ExportOperationError(
      'UNAVAILABLE_PACKING_LISTS',
      'Uno de los packing lists ya no está disponible.',
    );
    expect(describeSaveFailure(own).detail).toBe('Uno de los packing lists ya no está disponible.');
  });
});

describe('registerExport', () => {
  it('revalida que los packing lists sigan recibidos y libres antes de crear', async () => {
    const list = await receivedList();
    await packingListsRepository.update(list.id, { exportId: 'ex-0' });
    await expect(
      registerExport(
        { supplierId: 's-1', shippedOn: '2026-11-17', packingListIds: [list.id] },
        repositories,
      ),
    ).rejects.toBeInstanceOf(ExportOperationError);
    expect((await exportsRepository.list()).length).toBe(0);
  });

  it('si marcar los packing lists falla por completo, la exportación no queda creada', async () => {
    const list = await receivedList();
    vi.spyOn(packingListsRepository, 'update').mockRejectedValue(new Error('sin conexión'));
    await expect(
      registerExport(
        { supplierId: 's-1', shippedOn: '2026-11-17', packingListIds: [list.id] },
        repositories,
      ),
    ).rejects.toThrow('sin conexión');
    expect((await exportsRepository.list()).length).toBe(0);
  });
});

describe('advanceExport', () => {
  it('un estado terminal no toca el repositorio: devuelve el registro tal cual', async () => {
    const liquidated = anExport({ status: 'LIQUIDADA' });
    expect(await advanceExport(liquidated, repositories)).toBe(liquidated);
  });

  it('rechaza avanzar una exportación que ya no existe', async () => {
    await expect(advanceExport(anExport(), repositories)).rejects.toMatchObject({
      name: 'ExportOperationError',
      message: 'La exportación ya no existe. Actualiza la página y vuelve a intentarlo.',
    });
  });

  it('rechaza avanzar una exportación que cambió mientras se miraba', async () => {
    const list = await receivedList();
    const created = await exportsRepository.create({
      supplierId: 's-1',
      shippedOn: '2026-11-17',
      destination: 'Refinería',
      packingListIds: [list.id],
    });
    const stale = anExport({ id: created.id, status: 'DOCUMENTACION' });
    await expect(advanceExport(stale, repositories)).rejects.toMatchObject({
      name: 'ExportOperationError',
      code: 'STALE_EXPORT',
    });
  });

  it('si el rollback del estado falla, avisa que hace falta recargar', async () => {
    const list = await receivedList();
    const created = await registerExport(
      { supplierId: 's-1', shippedOn: '2026-11-17', packingListIds: [list.id] },
      repositories,
    );
    const documented = await advanceExport(created, repositories);
    vi.spyOn(packingListsRepository, 'update').mockRejectedValue(new Error('sin conexión'));
    const realUpdate = exportsRepository.update.bind(exportsRepository);
    let calls = 0;
    vi.spyOn(exportsRepository, 'update').mockImplementation((id, patch) => {
      calls += 1;
      // El avance (1ª llamada) funciona; el rollback del estado (2ª) es el que falla.
      return calls === 1
        ? realUpdate(id, patch)
        : Promise.reject(new Error('también sin conexión'));
    });
    await expect(advanceExport(documented, repositories)).rejects.toMatchObject({
      name: 'ExportOperationError',
      code: 'PARTIAL_ROLLBACK',
    });
  });
});

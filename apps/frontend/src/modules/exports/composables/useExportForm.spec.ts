import type { Export, PackingList, Supplier } from '@arbigold/shared-types';
import { Decimal } from 'decimal.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportsRepository, packingListsRepository } from '../../../shared/data/repositories.ts';
import {
  advanceExport,
  availablePackingLists,
  describeAdvance,
  nextExportStatus,
  nextExportStatusLabel,
  packingListFine,
  pickEmptyState,
  previewExportProfit,
  registerExport,
  toExportRow,
  toExportRows,
  toPackingListOptions,
  useExportForm,
  validateExportForm,
} from './useExportForm.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Node 26 trae su propio localStorage vacío: los tests instalan uno en memoria. */
beforeEach(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    },
  });
});

const CREATED = '2026-11-17T12:00:00.000Z';
/** 8000 g a 900 ‰ (7200 g) + 3500 g a 800 ‰ (2800 g) = 10 000 g finos. Datos ficticios. */
const TEN_KILO_PIECES = [
  { number: 1, grossWeight: '8000', fineness: '900' },
  { number: 2, grossWeight: '3500', fineness: '0.8' },
];

const aPackingList = (overrides: Partial<PackingList> = {}): PackingList => ({
  id: 'pl-1',
  clientId: 'c-1',
  issuedOn: '2026-11-10',
  pieces: TEN_KILO_PIECES,
  residues: [],
  notes: undefined,
  status: 'RECIBIDO',
  createdAt: CREATED,
  ...overrides,
});

const aSupplier = (overrides: Partial<Supplier> = {}): Supplier => ({
  id: 's-1',
  name: 'Comprador Ficticio',
  kind: 'TERCEROS',
  country: undefined,
  currency: 'USDT',
  defaultPercentage: '2',
  notes: undefined,
  active: true,
  createdAt: CREATED,
  ...overrides,
});

const anExport = (overrides: Partial<Export> = {}): Export => ({
  id: 'e-1',
  supplierId: 's-1',
  shippedOn: '2026-11-17',
  destination: 'Refinería ficticia',
  packingListIds: ['pl-1'],
  grossProfitPercentage: '2',
  notes: undefined,
  status: 'PREPARACION',
  createdAt: CREATED,
  ...overrides,
});

describe('utilidad de la exportación (vista previa)', () => {
  it('10 000 g al 2 %: bruta 200 g, CVM 100 g, exportación 30 g, neta 70 g (0,7 %)', () => {
    const preview = previewExportProfit(new Decimal(10000), '2');
    expect(preview?.grossProfit.toString()).toBe('200');
    expect(preview?.cvm.toString()).toBe('100');
    expect(preview?.exportDuty.toString()).toBe('30');
    expect(preview?.netProfit.toString()).toBe('70');
    expect(preview?.netPercentage.toString()).toBe('0.7');
  });

  it('10 000 g al 1 %: el trato no cubre las deducciones y la neta queda en −30 g', () => {
    expect(previewExportProfit(new Decimal(10000), '1')?.netProfit.toString()).toBe('-30');
  });

  it('sin % negociado válido no hay lectura de utilidad', () => {
    expect(previewExportProfit(new Decimal(10000), '')).toBeNull();
    expect(previewExportProfit(new Decimal(10000), 'abc')).toBeNull();
    expect(previewExportProfit(new Decimal(10000), '150')).toBeNull();
  });

  it('sin fino seleccionado el % neto es 0', () => {
    expect(previewExportProfit(new Decimal(0), '2')?.netPercentage.toString()).toBe('0');
  });
});

describe('packing lists exportables', () => {
  it('el fino del packing list suma bruto × ley de cada pieza, con la ley en cualquier escala', () => {
    expect(packingListFine(aPackingList()).toString()).toBe('10000');
  });

  it('solo ofrece los RECIBIDOS que no van ya en otra exportación', () => {
    const lists = [
      aPackingList({ id: 'recibido' }),
      aPackingList({ id: 'borrador', status: 'BORRADOR' }),
      aPackingList({ id: 'asignado', exportId: 'e-9' }),
      aPackingList({ id: 'exportado', status: 'EXPORTADO' }),
    ];
    expect(availablePackingLists(lists).map((list) => list.id)).toEqual(['recibido']);
  });

  it('cada opción muestra cliente, fecha, piezas y fino', () => {
    const clients = [{ id: 'c-1', name: 'Cliente Ficticio' }] as never;
    const [option] = toPackingListOptions([aPackingList()], clients);
    expect(option).toMatchObject({ clientName: 'Cliente Ficticio', pieceCount: 2 });
    expect(option?.fine.toString()).toBe('10000');
    const [orphan] = toPackingListOptions([aPackingList()], []);
    expect(orphan?.clientName).toBe('Cliente sin registrar');
  });
});

describe('estados de la exportación', () => {
  it('avanza en orden Preparación, Documentación, Enviada, Con resultado y Liquidada', () => {
    expect(nextExportStatus('PREPARACION')).toBe('DOCUMENTACION');
    expect(nextExportStatus('CON_RESULTADO')).toBe('LIQUIDADA');
    expect(nextExportStatus('LIQUIDADA')).toBeNull();
    expect(nextExportStatusLabel('DOCUMENTACION')).toBe('Enviada');
    expect(nextExportStatusLabel('LIQUIDADA')).toBeNull();
  });

  it('la confirmación nombra el estado destino y avisa que al enviar los packing lists se exportan', () => {
    const sending = describeAdvance({
      record: anExport({ status: 'DOCUMENTACION' }),
      supplierName: 'Comprador Ficticio',
    });
    expect(sending.target).toBe('Enviada');
    expect(sending.message).toContain('quedarán como exportados');
    const liquidated = describeAdvance({
      record: anExport({ status: 'LIQUIDADA' }),
      supplierName: 'X',
    });
    expect(liquidated.target).toBe('');
  });
});

describe('fila de la tabla', () => {
  it('resume proveedor, packing lists, piezas, fino y utilidad neta', () => {
    const row = toExportRow(anExport(), {
      suppliers: [aSupplier()],
      packingLists: [aPackingList(), aPackingList({ id: 'otro' })],
    });
    expect(row).toMatchObject({
      supplierName: 'Comprador Ficticio',
      packingListCount: 1,
      pieceCount: 2,
    });
    expect(row.fine.toString()).toBe('10000');
    expect(row.profit?.netProfit.toString()).toBe('70');
  });

  it('nombra al proveedor faltante en vez de romper', () => {
    const row = toExportRow(anExport(), { suppliers: [], packingLists: [] });
    expect(row.supplierName).toBe('Proveedor sin registrar');
  });
});

describe('formulario de exportación', () => {
  const suppliers = [
    aSupplier(),
    aSupplier({ id: 's-2', kind: 'FONDEO', defaultPercentage: '97' }),
  ];
  const newForm = () => useExportForm({ today: '2026-11-17', suppliers: () => suppliers });

  it('arranca con la fecha de hoy', () => {
    expect(newForm().form.shippedOn).toBe('2026-11-17');
  });

  it('con un proveedor de TERCEROS precarga su % habitual y el modo Utilidad', () => {
    const { form, isThirdParty, selectSupplier } = newForm();
    selectSupplier('s-1');
    expect(isThirdParty.value).toBe(true);
    expect(form.grossProfitPercentage).toBe('2');
    expect(form.settlementMode).toBe('UTILIDAD');
  });

  it('con un proveedor de FONDEO no hay modo de liquidación ni precarga del % de cierre', () => {
    const { form, isThirdParty, selectSupplier } = newForm();
    selectSupplier('s-1');
    selectSupplier('s-2');
    expect(isThirdParty.value).toBe(false);
    expect(form.settlementMode).toBeUndefined();
    // Cambiar de TERCEROS a FONDEO limpia el %: en FONDEO es el % del cierre, no la utilidad.
    expect(form.grossProfitPercentage).toBe('');
  });

  it('señala el primer error y explica cómo corregirlo', () => {
    const { validate, errors, firstError } = newForm();
    expect(validate()).toBeNull();
    expect(firstError.value).toBe('supplierId');
    expect(errors.value.supplierId).toBe('Elige el proveedor que recibe el oro');
    expect(errors.value.packingListIds).toBe('Selecciona al menos un packing list');
  });

  it('entrega el contrato limpio cuando todo es válido', () => {
    const { form, validate, selectSupplier, errors } = newForm();
    selectSupplier('s-2');
    form.packingListIds = ['pl-1'];
    form.grossProfitPercentage = '2,5';
    expect(validate()).toMatchObject({ supplierId: 's-2', grossProfitPercentage: '2.5' });
    expect(errors.value).toEqual({});
  });

  it('un % vacío viaja como ausente y el modo solo viaja con TERCEROS', () => {
    const base = { supplierId: 's-1', shippedOn: '2026-11-17', destination: '', notes: '' };
    const form = { ...base, packingListIds: ['pl-1'], grossProfitPercentage: ' ' };
    const result = validateExportForm({ ...form, settlementMode: 'COBRO_TOTAL' }, false);
    expect(result.input?.grossProfitPercentage).toBeUndefined();
    expect(result.input?.settlementMode).toBeUndefined();
  });
});

describe('registrar y avanzar exportaciones', () => {
  const repositories = { exports: exportsRepository, packingLists: packingListsRepository };

  const receivedList = async () => {
    const list = await packingListsRepository.create({
      clientId: 'c-1',
      issuedOn: '2026-11-10',
      pieces: TEN_KILO_PIECES,
    });
    return packingListsRepository.update(list.id, { status: 'RECIBIDO' });
  };

  it('al registrar, cada packing list elegido queda EN_EXPORTACION con la exportación', async () => {
    const [first, second] = [await receivedList(), await receivedList()];
    const created = await registerExport(
      { supplierId: 's-1', shippedOn: '2026-11-17', packingListIds: [first.id, second.id] },
      repositories,
    );
    expect(created.status).toBe('PREPARACION');
    const lists = [
      await packingListsRepository.get(first.id),
      await packingListsRepository.get(second.id),
    ];
    expect(lists.map((list) => [list?.status, list?.exportId])).toEqual([
      ['EN_EXPORTACION', created.id],
      ['EN_EXPORTACION', created.id],
    ]);
  });

  it('al pasar a Enviada sus packing lists quedan EXPORTADOS; antes no cambian', async () => {
    const list = await receivedList();
    const created = await registerExport(
      { supplierId: 's-1', shippedOn: '2026-11-17', packingListIds: [list.id] },
      repositories,
    );
    const documented = await advanceExport(created, repositories);
    expect(documented.status).toBe('DOCUMENTACION');
    expect((await packingListsRepository.get(list.id))?.status).toBe('EN_EXPORTACION');
    const sent = await advanceExport(documented, repositories);
    expect(sent.status).toBe('ENVIADA');
    expect((await packingListsRepository.get(list.id))?.status).toBe('EXPORTADO');
  });

  it('una exportación liquidada ya no avanza', async () => {
    const liquidated = anExport({ status: 'LIQUIDADA' });
    expect(await advanceExport(liquidated, repositories)).toBe(liquidated);
  });

  it('si un packing list no se puede marcar, no deja la exportación a medias', async () => {
    const [first, second] = [await receivedList(), await receivedList()];
    const exportsBefore = (await exportsRepository.list()).length;
    const realUpdate = packingListsRepository.update.bind(packingListsRepository);
    vi.spyOn(packingListsRepository, 'update').mockImplementation((id, patch) =>
      id === second.id && patch.status === 'EN_EXPORTACION'
        ? Promise.reject(new Error('sin conexión'))
        : realUpdate(id, patch),
    );
    await expect(
      registerExport(
        { supplierId: 's-1', shippedOn: '2026-11-17', packingListIds: [first.id, second.id] },
        repositories,
      ),
    ).rejects.toThrow('sin conexión');
    expect(await exportsRepository.list()).toHaveLength(exportsBefore);
    const restored = await packingListsRepository.get(first.id);
    expect(restored?.status).toBe('RECIBIDO');
    expect(restored?.exportId).toBeUndefined();
  });

  it('si al enviar falla un packing list, la exportación vuelve a su estado anterior', async () => {
    const list = await receivedList();
    const created = await registerExport(
      { supplierId: 's-1', shippedOn: '2026-11-17', packingListIds: [list.id] },
      repositories,
    );
    const documented = await advanceExport(created, repositories);
    vi.spyOn(packingListsRepository, 'update').mockRejectedValueOnce(new Error('sin conexión'));
    await expect(advanceExport(documented, repositories)).rejects.toThrow('sin conexión');
    expect((await exportsRepository.get(created.id))?.status).toBe('DOCUMENTACION');
    expect((await packingListsRepository.get(list.id))?.status).toBe('EN_EXPORTACION');
  });
});

const linkOf = (state: ReturnType<typeof pickEmptyState>) =>
  state && 'link' in state ? state.link.to : undefined;

describe('qué mostrar cuando falta algo', () => {
  it('pide primero un proveedor, luego packing lists recibidos y al final la primera exportación', () => {
    const has = { suppliers: true, exports: false, available: true };
    expect(linkOf(pickEmptyState({ ...has, suppliers: false }))).toBe('/proveedores');
    expect(linkOf(pickEmptyState({ ...has, available: false }))).toBe('/packing-lists');
    expect(pickEmptyState(has)?.title).toBe('Aún no hay exportaciones');
    expect(pickEmptyState({ ...has, exports: true })).toBeNull();
  });

  it('las filas se filtran por estado y van de la más reciente a la más antigua', () => {
    const records = [
      anExport({ id: 'vieja', shippedOn: '2026-10-01' }),
      anExport({ id: 'nueva', shippedOn: '2026-11-15' }),
      anExport({ id: 'enviada', status: 'ENVIADA' }),
    ];
    const context = { suppliers: [], packingLists: [] };
    const all = toExportRows(records, { ...context, status: '' });
    expect(all.map((row) => row.record.id)).toEqual(['enviada', 'nueva', 'vieja']);
    const sent = toExportRows(records, { ...context, status: 'ENVIADA' });
    expect(sent.map((row) => row.record.id)).toEqual(['enviada']);
  });

  it('el formulario sabe si tiene datos sin registrar', () => {
    const { form, isDirty } = useExportForm({ today: '2026-11-17', suppliers: () => [] });
    expect(isDirty.value).toBe(false);
    form.destination = 'Refinería ficticia';
    expect(isDirty.value).toBe(true);
  });
});

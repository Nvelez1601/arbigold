import type { Client, Export, PackingList, Supplier } from '@arbigold/shared-types';
import { Decimal } from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  availablePackingLists,
  packingListFine,
  previewExportProfit,
  toExportRow,
  toExportRows,
  toPackingListOptions,
} from './exportTable.ts';

/** 8000 g a 900 ‰ (7200 g finos) + 3500 g a 800 ‰ (2800 g finos) = 10 000 g finos. Ficticios. */
const PIECES = [
  { number: 1, grossWeight: '8000', fineness: '900' },
  { number: 2, grossWeight: '3500', fineness: '0.8' },
];

const CREATED = '2026-11-17T12:00:00.000Z';

const aList = (overrides: Partial<PackingList> = {}): PackingList => ({
  id: 'pl-1',
  clientId: 'c-1',
  issuedOn: '2026-11-10',
  pieces: PIECES,
  residues: [],
  notes: undefined,
  status: 'RECIBIDO',
  createdAt: CREATED,
  ...overrides,
});

const aClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'c-1',
  name: 'Cliente Uno',
  kind: 'PERSONA',
  documentId: undefined,
  location: undefined,
  phone: undefined,
  defaultPercentage: undefined,
  notes: undefined,
  active: true,
  createdAt: CREATED,
  ...overrides,
});

const aSupplier = (overrides: Partial<Supplier> = {}): Supplier => ({
  id: 's-1',
  name: 'Fondo Ficticio',
  kind: 'FONDEO',
  country: undefined,
  currency: 'USDT',
  defaultPercentage: undefined,
  notes: undefined,
  active: true,
  createdAt: CREATED,
  ...overrides,
});

const aExport = (overrides: Partial<Export> = {}): Export => ({
  id: 'ex-1',
  supplierId: 's-1',
  shippedOn: '2026-11-17',
  destination: 'Refinería',
  packingListIds: ['pl-1'],
  grossProfitPercentage: '2',
  settlementMode: undefined,
  notes: undefined,
  status: 'DOCUMENTACION',
  createdAt: CREATED,
  ...overrides,
});

describe('packingListFine y availablePackingLists', () => {
  it('el fino es la suma de bruto × ley ‰ / 1000 de cada pieza', () => {
    expect(packingListFine(aList()).toString()).toBe('10000');
  });

  it('solo las recibidas sin exportación están disponibles', () => {
    expect(
      availablePackingLists([
        aList({ status: 'RECIBIDO' }),
        aList({ id: 'pl-2', status: 'EN_EXPORTACION' }),
        aList({ id: 'pl-3', exportId: 'ex-1' }),
      ]).map((list) => list.id),
    ).toEqual(['pl-1']);
  });

  it('las opciones llevan el nombre del cliente y el fino del list', () => {
    const [option] = toPackingListOptions([aList()], [aClient()]);
    expect(option).toMatchObject({ id: 'pl-1', clientName: 'Cliente Uno', pieceCount: 2 });
    expect(option?.fine.toString()).toBe('10000');
  });
});

describe('previewExportProfit', () => {
  const fine = new Decimal('10000');

  it('aplica el % negociado sobre el fino y descuenta CVM (1 %) y exportación (0.3 %)', () => {
    const preview = previewExportProfit(fine, '2');
    expect(preview?.grossProfit.toString()).toBe('200');
    expect(preview?.cvm.toString()).toBe('100');
    expect(preview?.exportDuty.toString()).toBe('30');
    expect(preview?.netProfit.toString()).toBe('70');
    expect(preview?.netPercentage.toString()).toBe('0.7');
  });

  it('sin % válido (vacío, cero o más de 100) no hay vista previa', () => {
    expect(previewExportProfit(fine, '')).toBeNull();
    expect(previewExportProfit(fine, '0')).toBeNull();
    expect(previewExportProfit(fine, '150')).toBeNull();
  });
});

describe('filas de la tabla', () => {
  const context = { suppliers: [aSupplier()], packingLists: [aList()] };

  it('une proveedor, conteos y fino de sus packing lists', () => {
    const row = toExportRow(aExport(), context);
    expect(row.supplierName).toBe('Fondo Ficticio');
    expect(row.packingListCount).toBe(1);
    expect(row.pieceCount).toBe(2);
    expect(row.fine.toString()).toBe('10000');
    expect(row.profit?.netProfit.toString()).toBe('70');
  });

  it('un cliente sin registrar aparece como tal, no con un error', () => {
    expect(toExportRow(aExport({ supplierId: 's-x' }), context).supplierName).toBe(
      'Proveedor sin registrar',
    );
  });

  it('filtra por estado y ordena de la más reciente a la más antigua', () => {
    const rows = toExportRows(
      [aExport(), aExport({ id: 'ex-2', status: 'LIQUIDADA', shippedOn: '2026-11-18' })],
      { ...context, status: '' },
    );
    expect(rows.map((row) => row.record.id)).toEqual(['ex-2', 'ex-1']);
    expect(toExportRows([aExport()], { ...context, status: 'ENVIADA' })).toEqual([]);
  });
});

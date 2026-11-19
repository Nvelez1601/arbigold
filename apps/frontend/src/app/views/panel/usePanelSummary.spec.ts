import type { Client, Export, Operation, PackingList, Supplier } from '@arbigold/shared-types';
import { describe, expect, it } from 'vitest';
import { buildPanelSummary } from './usePanelSummary.ts';

const client = (overrides: Partial<Client> = {}): Client => ({
  id: 'c-1',
  name: 'Compradora Ejemplo',
  kind: 'EMPRESA',
  documentId: 'J-00000000-1',
  phone: undefined,
  defaultPercentage: '96.5',
  location: 'Ciudad Bolívar',
  notes: undefined,
  active: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

const supplier = (overrides: Partial<Supplier> = {}): Supplier => ({
  id: 's-1',
  name: 'Fondos Ejemplo',
  kind: 'FONDEO',
  country: 'Panamá',
  currency: 'USD',
  defaultPercentage: '93.5',
  notes: undefined,
  active: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

const operation = (overrides: Partial<Operation> = {}): Operation => ({
  id: 'o-1',
  supplierId: 's-1',
  clientId: 'c-1',
  closedOn: '2026-11-10',
  amount: '1000',
  currency: 'USD',
  internationalPricePerOunce: '2000',
  clientPercentage: '97',
  supplierPercentage: '93',
  notes: undefined,
  status: 'ABIERTA',
  createdAt: '2026-11-10T12:00:00.000Z',
  ...overrides,
});

const packingList = (overrides: Partial<PackingList> = {}): PackingList => ({
  id: 'p-1',
  clientId: 'c-1',
  issuedOn: '2026-11-11',
  pieces: [
    { number: 1, grossWeight: '100', fineness: '995' },
    { number: 2, grossWeight: '50', fineness: '990' },
  ],
  residues: [],
  notes: undefined,
  status: 'RECIBIDO',
  createdAt: '2026-11-11T12:00:00.000Z',
  ...overrides,
});

const exportRecord = (overrides: Partial<Export> = {}): Export => ({
  id: 'e-1',
  supplierId: 's-1',
  shippedOn: '2026-11-12',
  destination: 'Dubái',
  packingListIds: ['p-1'],
  grossProfitPercentage: '3',
  settlementMode: 'UTILIDAD',
  notes: undefined,
  status: 'PREPARACION',
  createdAt: '2026-11-12T12:00:00.000Z',
  ...overrides,
});

const sources = (overrides: Partial<Parameters<typeof buildPanelSummary>[0]> = {}) => ({
  clients: [client()],
  suppliers: [supplier()],
  operations: [operation()],
  packingLists: [packingList()],
  exports: [exportRecord()],
  ...overrides,
});

describe('resumen del panel', () => {
  it('sin registros deja todo en cero y sin movimientos', () => {
    const summary = buildPanelSummary({
      clients: [],
      suppliers: [],
      operations: [],
      packingLists: [],
      exports: [],
    });
    expect(summary).toMatchObject({
      activeClients: 0,
      activeSuppliers: 0,
      openOperations: 0,
      packingLists: 0,
      activeExports: 0,
      chart: [],
      movements: [],
      hasActivity: false,
    });
    expect(summary.clientGrams).toBe('0');
    expect(summary.margin).toBe('0');
  });

  it('cuenta solo lo activo y lo que sigue vivo', () => {
    const summary = buildPanelSummary(
      sources({
        clients: [client(), client({ id: 'c-2', active: false })],
        suppliers: [supplier(), supplier({ id: 's-2', active: false })],
        operations: [
          operation(),
          operation({ id: 'o-2', status: 'CUMPLIDA' }),
          operation({ id: 'o-3', status: 'CANCELADA' }),
        ],
        packingLists: [
          packingList(),
          packingList({ id: 'p-2', status: 'EXPORTADO' }),
          packingList({ id: 'p-3', status: 'BORRADOR' }),
        ],
        exports: [exportRecord(), exportRecord({ id: 'e-2', status: 'LIQUIDADA' })],
      }),
    );
    expect(summary.activeClients).toBe(1);
    expect(summary.activeSuppliers).toBe(1);
    expect(summary.openOperations).toBe(1);
    expect(summary.packingLists).toBe(2);
    expect(summary.activeExports).toBe(1);
    expect(Number(summary.clientGrams)).toBeGreaterThan(0);
    expect(summary.margin).not.toBe('0');
  });

  it('suma el oro fino de los packing lists pendientes, sin contar la viruta', () => {
    const summary = buildPanelSummary(
      sources({ packingLists: [packingList({ status: 'BORRADOR' })] }),
    );
    // 100 × 0.995 + 50 × 0.990 = 149.0 g finos.
    expect(Number(summary.packingFine)).toBeCloseTo(149, 1);
  });

  it('grafica las últimas siete operaciones y deja las más recientes al final', () => {
    const operations = Array.from({ length: 9 }, (_, index) =>
      operation({ id: `o-${index}`, closedOn: `2026-11-${String(index + 1).padStart(2, '0')}` }),
    );
    const summary = buildPanelSummary(sources({ operations }));
    expect(summary.chart).toHaveLength(7);
    expect(summary.chart.at(-1)?.label).toBe('11/09');
  });

  it('nombra cliente y proveedor en los últimos cinco movimientos', () => {
    const operations = Array.from({ length: 7 }, (_, index) =>
      operation({ id: `o-${index}`, closedOn: `2026-11-${String(index + 1).padStart(2, '0')}` }),
    );
    const summary = buildPanelSummary(sources({ operations }));
    expect(summary.movements).toHaveLength(5);
    expect(summary.movements[0]).toMatchObject({
      client: 'Compradora Ejemplo',
      supplier: 'Fondos Ejemplo',
      status: 'ABIERTA',
    });
    expect(summary.movements[0]?.date).toBe('2026-11-07');
  });

  it('avisa de proveedores sin %, packing lists en borrador, exportaciones y clientes inactivos', () => {
    const summary = buildPanelSummary(
      sources({
        suppliers: [supplier({ defaultPercentage: undefined })],
        clients: [client({ active: false })],
        packingLists: [packingList({ status: 'BORRADOR' })],
        exports: [exportRecord({ status: 'DOCUMENTACION' })],
      }),
    );
    expect(summary.alerts.map((alert) => alert.tone)).toEqual([
      'warning',
      'warning',
      'info',
      'danger',
    ]);
    expect(summary.alerts.map((alert) => alert.title)).toEqual([
      'Proveedores sin % de cierre',
      'Packing lists sin recibir',
      'Exportaciones en preparación',
      'Clientes inactivos',
    ]);
  });

  it('sin pendientes no inventa alertas', () => {
    const summary = buildPanelSummary(
      sources({
        packingLists: [packingList({ status: 'EXPORTADO' })],
        exports: [exportRecord({ status: 'ENVIADA' })],
      }),
    );
    expect(summary.alerts).toEqual([]);
  });

  it('marca actividad si existe cualquier colección, aunque no haya operaciones', () => {
    const summary = buildPanelSummary(
      sources({ operations: [], packingLists: [], exports: [], suppliers: [] }),
    );
    expect(summary.hasActivity).toBe(true);
    expect(summary.chart).toEqual([]);
    expect(summary.movements).toEqual([]);
  });
});

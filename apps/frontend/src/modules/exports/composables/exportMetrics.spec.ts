import type { Export, PackingList } from '@arbigold/shared-types';
import { describe, expect, it } from 'vitest';
import { toExportRow } from './exportTable.ts';
import { exportMetrics } from './exportMetrics.ts';

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

const packingList: PackingList = {
  id: 'p-1',
  clientId: 'c-1',
  issuedOn: '2026-11-11',
  pieces: [
    { number: 1, grossWeight: '100', fineness: '995' },
    { number: 2, grossWeight: '50', fineness: '990' },
  ],
  residues: [],
  notes: undefined,
  status: 'EXPORTADO',
  exportId: 'e-1',
  createdAt: '2026-11-11T12:00:00.000Z',
};

const row = (record: Export) =>
  toExportRow(record, {
    suppliers: [{ id: 's-1', name: 'Fondos Ejemplo' }],
    packingLists: [packingList],
  });

describe('métricas de exportaciones', () => {
  it('resume en preparación, tránsito, fino y piezas', () => {
    const metrics = exportMetrics([
      row(exportRecord()),
      row(exportRecord({ id: 'e-2', status: 'DOCUMENTACION' })),
      row(exportRecord({ id: 'e-3', status: 'ENVIADA' })),
      row(exportRecord({ id: 'e-4', status: 'LIQUIDADA' })),
    ]);
    expect(metrics.map((metric) => [metric.label, metric.value, metric.detail])).toEqual([
      ['Exportaciones', '4', '2 en preparación'],
      ['En tránsito', '1', 'Enviadas al proveedor'],
      ['Peso fino', '596,00 g', 'En todas las exportaciones'],
      ['Piezas', '8', 'Empacadas para salir'],
    ]);
    expect(metrics[0]?.hero).toBe(true);
  });

  it('sin exportaciones deja todo en cero', () => {
    const metrics = exportMetrics([]);
    expect(metrics.map((metric) => metric.value)).toEqual(['0', '0', '0,00 g', '0']);
  });
});

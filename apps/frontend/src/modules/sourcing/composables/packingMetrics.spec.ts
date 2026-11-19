import type { PackingList } from '@arbigold/shared-types';
import { describe, expect, it } from 'vitest';
import { packingMetrics } from './packingMetrics.ts';

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

describe('métricas de packing lists', () => {
  it('cuenta piezas y oro fino, y separa lo pendiente de los borradores', () => {
    const metrics = packingMetrics([
      packingList(),
      packingList({ id: 'p-2', status: 'BORRADOR' }),
      packingList({
        id: 'p-3',
        status: 'EXPORTADO',
        pieces: [{ number: 1, grossWeight: '10', fineness: '900' }],
      }),
    ]);
    expect(metrics.map((metric) => [metric.label, metric.value, metric.detail])).toEqual([
      ['Packing lists', '3', '2 por recibir'],
      ['Piezas registradas', '5', 'En todas las entregas'],
      ['Oro fino', '307,00 g', 'Suma de piezas y leyes'],
      ['Borradores', '1', 'Sin confirmar piezas'],
    ]);
    expect(metrics[0]?.hero).toBe(true);
  });

  it('sin packing lists deja todo en cero', () => {
    const metrics = packingMetrics([]);
    expect(metrics.map((metric) => metric.value)).toEqual(['0', '0', '0,00 g', '0']);
  });
});

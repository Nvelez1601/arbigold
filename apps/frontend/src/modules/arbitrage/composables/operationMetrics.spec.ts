import type { Operation } from '@arbigold/shared-types';
import { describe, expect, it } from 'vitest';
import { operationMetrics } from './operationMetrics.ts';

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

describe('métricas de operaciones', () => {
  it('suma solo lo abierto y cuenta las cumplidas', () => {
    const metrics = operationMetrics([
      operation(),
      operation({ id: 'o-2', status: 'CUMPLIDA' }),
      operation({ id: 'o-3', status: 'CANCELADA' }),
    ]);
    expect(metrics.map((metric) => metric.label)).toEqual([
      'Oro por entregar',
      'Margen abierto',
      'Abiertas',
      'Cumplidas',
    ]);
    expect(metrics[0]?.detail).toBe('1 operaciones abiertas');
    expect(metrics[1]?.value).not.toBe('0,00 g');
    expect(metrics[2]?.value).toBe('1');
    expect(metrics[3]?.value).toBe('1');
    expect(metrics[0]?.hero).toBe(true);
  });

  it('sin operaciones deja todo en cero', () => {
    const metrics = operationMetrics([]);
    expect(metrics.map((metric) => metric.value)).toEqual(['0,00 g', '0,00 g', '0', '0']);
  });
});

import type { Supplier } from '@arbigold/shared-types';
import { describe, expect, it } from 'vitest';
import { supplierMetrics } from './supplierMetrics.ts';

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

describe('métricas de proveedores', () => {
  it('resume totales, fondeo, terceros y quiénes no tienen % habitual', () => {
    const metrics = supplierMetrics([
      supplier(),
      supplier({ id: 's-2', kind: 'TERCEROS', defaultPercentage: undefined }),
      supplier({ id: 's-3', kind: 'TERCEROS', active: false, defaultPercentage: undefined }),
      supplier({ id: 's-4', active: false }),
    ]);
    expect(metrics.map((metric) => [metric.label, metric.value, metric.detail])).toEqual([
      ['Proveedores', '4', '2 activos'],
      ['Fondeo activo', '1', 'Adelantan fondos para operar'],
      ['Terceros activos', '1', 'Traen material propio'],
      ['Sin % habitual', '1', 'Se negocian a mano'],
    ]);
    expect(metrics[0]?.hero).toBe(true);
    expect(metrics[1]?.hero).toBeUndefined();
  });

  it('sin proveedores deja los contadores en cero', () => {
    const metrics = supplierMetrics([]);
    expect(metrics.map((metric) => metric.value)).toEqual(['0', '0', '0', '0']);
  });
});

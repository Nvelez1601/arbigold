import type { Client } from '@arbigold/shared-types';
import { describe, expect, it } from 'vitest';
import { clientMetrics } from './clientMetrics.ts';

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

describe('métricas de clientes', () => {
  it('separa empresas y personas, y cuenta los activos y los que tienen %', () => {
    const metrics = clientMetrics([
      client(),
      client({
        id: 'c-2',
        kind: 'PERSONA',
        documentId: 'V-00000000',
        defaultPercentage: undefined,
      }),
      client({ id: 'c-3', active: false }),
    ]);
    expect(metrics.map((metric) => [metric.label, metric.value, metric.detail])).toEqual([
      ['Clientes', '3', '2 activos'],
      ['Empresas', '2', 'Compran con RIF'],
      ['Personas', '1', 'Compran con cédula'],
      ['Con % habitual', '2', 'Precarga el cierre'],
    ]);
    expect(metrics[0]?.hero).toBe(true);
  });

  it('sin clientes deja los contadores en cero', () => {
    const metrics = clientMetrics([]);
    expect(metrics.map((metric) => metric.value)).toEqual(['0', '0', '0', '0']);
  });
});

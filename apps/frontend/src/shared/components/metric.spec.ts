import { Scale } from 'lucide-vue-next';
import { describe, expect, it } from 'vitest';
import { toMetric } from './metric.ts';

describe('toMetric', () => {
  it('convierte la tupla compacta de un módulo en una métrica con nombre', () => {
    expect(
      toMetric(['Oro por entregar', '524,97 g', '2 operaciones abiertas', Scale, true]),
    ).toEqual({
      label: 'Oro por entregar',
      value: '524,97 g',
      detail: '2 operaciones abiertas',
      icon: Scale,
      hero: true,
    });
  });

  it('una métrica sin marca de destacada no lo es', () => {
    expect(toMetric(['Abiertas', '2', 'Pendientes de entrega', Scale]).hero).toBeUndefined();
  });
});

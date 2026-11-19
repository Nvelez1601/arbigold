import { mount } from '@vue/test-utils';
import { CircleAlert, Users } from 'lucide-vue-next';
import { describe, expect, it } from 'vitest';
import MetricStrip from './MetricStrip.vue';

describe('MetricStrip', () => {
  it('muestra cada métrica con su etiqueta, valor y detalle', () => {
    const wrapper = mount(MetricStrip, {
      props: {
        metrics: [
          { label: 'Clientes', value: '12', detail: '10 activos', icon: Users },
          { label: 'Empresas', value: '4', detail: 'Con RIF', icon: Users },
        ],
      },
    });
    expect(wrapper.findAll('dt').map((term) => term.text())).toEqual(['Clientes', 'Empresas']);
    expect(wrapper.findAll('dd').map((value) => value.text())).toEqual([
      '12',
      '10 activos',
      '4',
      'Con RIF',
    ]);
  });

  it('destaca la métrica principal con el degradado de la marca', () => {
    const wrapper = mount(MetricStrip, {
      props: {
        metrics: [
          {
            label: 'Oro por entregar',
            value: '120 g',
            detail: 'Abiertas',
            icon: Users,
            hero: true,
          },
        ],
      },
    });
    const card = wrapper.get('dl > div');
    expect(card.classes()).toContain('bg-brand-gradient');
    expect(card.classes()).not.toContain('bg-surface-0');
  });

  it('dibuja el ícono de la métrica', () => {
    const wrapper = mount(MetricStrip, {
      props: {
        metrics: [{ label: 'Sin %', value: '2', detail: 'A mano', icon: CircleAlert }],
      },
    });
    expect(wrapper.find('dt svg').exists()).toBe(true);
  });
});

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ScaleSummaryBar from './ScaleSummaryBar.vue';

const reading = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper
    .findAll('dl > div')
    .find((block) => block.get('dt').text() === label)
    ?.get('dd')
    .text();

describe('ScaleSummaryBar', () => {
  it('lee la balanza en bloques separados: piezas, peso bruto y peso fino en gramos', () => {
    const wrapper = mount(ScaleSummaryBar, {
      props: { count: 3, gross: '4500.5', fine: '4130.46' },
    });
    expect(reading(wrapper, 'Piezas')).toBe('3');
    expect(reading(wrapper, 'Peso bruto')).toBe('4.500,50g');
    expect(reading(wrapper, 'Peso fino')).toBe('4.130,46g');
    expect(wrapper.text()).not.toContain('·');
  });

  it('anuncia los cambios con cortesía a los lectores de pantalla', () => {
    const wrapper = mount(ScaleSummaryBar, { props: { count: 0, gross: '0', fine: '0' } });
    expect(wrapper.get('dl').attributes('aria-live')).toBe('polite');
    expect(wrapper.get('section').attributes('aria-label')).toBe('Balanza del packing list');
    expect(reading(wrapper, 'Peso fino')).toBe('0,00g');
  });

  it('aloja las acciones del editor junto a los totales', () => {
    const wrapper = mount(ScaleSummaryBar, {
      props: { count: 1, gross: '1', fine: '1' },
      slots: { default: '<button>Guardar borrador</button>' },
    });
    expect(wrapper.get('button').text()).toBe('Guardar borrador');
  });
});

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ExportProfitPreview from './ExportProfitPreview.vue';

const render = (props: { fine: string; percentage?: string }) =>
  mount(ExportProfitPreview, { props });
const text = (wrapper: ReturnType<typeof render>, field: string) =>
  wrapper.get(`[data-test="${field}"]`).text();

describe('ExportProfitPreview', () => {
  it('10 000 g al 2 % se lee como un recibo: 200 g brutos, − 100 g CVM, − 30 g exportación, 70 g netos', () => {
    const wrapper = render({ fine: '10000', percentage: '2' });
    expect(text(wrapper, 'fine')).toBe('10.000,00 g');
    expect(text(wrapper, 'gross')).toBe('200,00 g');
    expect(text(wrapper, 'cvm')).toBe('− 100,00 g');
    expect(text(wrapper, 'export-duty')).toBe('− 30,00 g');
    expect(text(wrapper, 'net')).toContain('70,00 g');
    expect(text(wrapper, 'net')).toContain('0,7 %');
    expect(wrapper.get('[data-test="net"]').classes()).toContain('text-success');
    expect(wrapper.find('[data-test="loss-explanation"]').exists()).toBe(false);
  });

  it('10 000 g al 1 % deja −30 g en rojo y explica por qué hay pérdida', () => {
    const wrapper = render({ fine: '10000', percentage: '1' });
    expect(text(wrapper, 'net')).toContain('-30,00 g');
    expect(wrapper.get('[data-test="net"]').classes()).toContain('text-danger');
    expect(text(wrapper, 'loss-explanation')).toContain('no cubre las deducciones');
  });

  it('sin % negociado muestra el fino y pide el % para calcular la utilidad', () => {
    const wrapper = render({ fine: '2500' });
    expect(text(wrapper, 'fine')).toBe('2.500,00 g');
    expect(wrapper.find('[data-test="net"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Escribe el % de utilidad negociado');
  });

  it('anuncia los cambios a lectores de pantalla sin interrumpir', () => {
    expect(render({ fine: '0' }).get('section').attributes('aria-live')).toBe('polite');
  });
});

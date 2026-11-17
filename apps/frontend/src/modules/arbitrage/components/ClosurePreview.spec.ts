import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ClosurePreview from './ClosurePreview.vue';

/** Datos ficticios del cierre. */
const CLOSURE = {
  amount: '100000',
  internationalPricePerOunce: '2000',
  clientPercentage: '96',
  supplierPercentage: '97',
};
const render = (inputs: Partial<typeof CLOSURE> = {}) =>
  mount(ClosurePreview, { props: { inputs: { ...CLOSURE, ...inputs } } });
const compact = (text: string) => text.replace(/\s+/g, ' ');

describe('ClosurePreview', () => {
  it('muestra precio por gramo, gramos de cada parte y el margen en verde', () => {
    const wrapper = render();
    const text = compact(wrapper.text());
    expect(text).toContain('64,30 USD/g');
    expect(text).toContain('1.619,97 g');
    expect(text).toContain('1.603,27 g');
    const margin = wrapper.get('[data-testid="closure-margin"] strong');
    expect(margin.text()).toBe('16,70 g');
    expect(margin.classes()).toContain('text-success');
    expect(text).toContain('Ganancia');
    expect(wrapper.find('[data-testid="closure-missing"]').exists()).toBe(false);
  });

  it('anuncia los cambios a lectores de pantalla', () => {
    expect(render().find('[aria-live="polite"]').exists()).toBe(true);
  });

  it('marca en rojo y explica un margen negativo', () => {
    const wrapper = render({ clientPercentage: '98' });
    const margin = wrapper.get('[data-testid="closure-margin"] strong');
    expect(margin.text()).toMatch(/^-/);
    expect(margin.classes()).toContain('text-danger');
    expect(wrapper.text()).toContain('Revisa los porcentajes');
  });

  it('explica que no hay margen cuando ambos cierran al mismo %', () => {
    const wrapper = render({ clientPercentage: '97' });
    expect(wrapper.get('[data-testid="closure-margin"] strong').text()).toBe('0,00 g');
    expect(wrapper.text()).toContain('Sin margen');
  });

  it('si falta un dato dice cuál falta y nunca muestra NaN', () => {
    const wrapper = render({ amount: '', supplierPercentage: '' });
    expect(wrapper.text()).not.toContain('NaN');
    expect(wrapper.get('[data-testid="closure-missing"]').text()).toBe(
      'Para completar el cálculo falta el monto y el % del proveedor.',
    );
    expect(wrapper.get('[data-testid="closure-margin"] strong').text()).toBe('—');
  });

  it('sin P. INT no muestra precio por gramo', () => {
    const wrapper = render({ internationalPricePerOunce: '' });
    expect(wrapper.text()).not.toContain('USD/g');
    expect(wrapper.text()).toContain('el P. INT');
  });
});

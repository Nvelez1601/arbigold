import { describe, expect, it } from 'vitest';
import { mountWithApp } from '../../../test/support/mount.ts';
import AppLayout from './AppLayout.vue';

describe('AppLayout', () => {
  it('ofrece saltar al contenido y una navegación con nombre', async () => {
    const { wrapper } = await mountWithApp(AppLayout, { slots: { default: '<p>contenido</p>' } });
    expect(wrapper.get('a[href="#contenido"]').text()).toBe('Saltar al contenido');
    expect(wrapper.get('main#contenido').text()).toBe('contenido');
  });

  it('agrupa la navegación en Operación y Relaciones, con enlaces a los seis módulos', async () => {
    const { wrapper } = await mountWithApp(AppLayout);
    const groups = wrapper.findAll('nav p').map((label) => label.text());
    expect(groups).toEqual(['Operación', 'Relaciones']);
    expect(wrapper.findAll('nav a').map((link) => link.attributes('href'))).toEqual([
      '/',
      '/operaciones',
      '/packing-lists',
      '/exportaciones',
      '/proveedores',
      '/clientes',
    ]);
  });

  it('se presenta como el sistema real: sin avisos de demostración ni datos de ejemplo', async () => {
    const { wrapper } = await mountWithApp(AppLayout);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('demostración');
    expect(wrapper.text()).not.toContain('datos de ejemplo');
  });
});

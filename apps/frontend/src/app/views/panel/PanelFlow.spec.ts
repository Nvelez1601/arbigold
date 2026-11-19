import { describe, expect, it } from 'vitest';
import { mountWithApp } from '../../../../test/support/mount.ts';
import PanelFlow from './PanelFlow.vue';

const links = (wrapper: Awaited<ReturnType<typeof mountWithApp>>['wrapper']) =>
  wrapper.findAll('ol a');

describe('flujo del panel', () => {
  it('enlaza los cinco módulos en el orden del negocio', async () => {
    const { wrapper } = await mountWithApp(PanelFlow, { props: { hasActivity: true } });
    expect(links(wrapper).map((link) => link.attributes('href'))).toEqual([
      '/proveedores',
      '/clientes',
      '/operaciones',
      '/packing-lists',
      '/exportaciones',
    ]);
    expect(links(wrapper)[0]?.text()).toContain('1');
    expect(links(wrapper)[4]?.text()).toContain('5');
  });

  it('sin actividad invita a registrar proveedor y cliente', async () => {
    const { wrapper } = await mountWithApp(PanelFlow, { props: { hasActivity: false } });
    expect(wrapper.text()).toContain('Empieza por aquí');
    expect(wrapper.find('a[href="/proveedores"]').text()).toBe('Registrar proveedor');
    expect(wrapper.find('a[href="/clientes"]').text()).toBe('Registrar cliente');
  });

  it('con actividad no repite la invitación', async () => {
    const { wrapper } = await mountWithApp(PanelFlow, { props: { hasActivity: true } });
    expect(wrapper.text()).not.toContain('Empieza por aquí');
    expect(wrapper.text()).toContain('Flujo de la operación');
  });
});

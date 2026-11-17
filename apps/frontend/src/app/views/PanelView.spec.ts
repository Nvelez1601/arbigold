import { describe, expect, it } from 'vitest';
import { mountWithApp } from '../../../test/support/mount.ts';
import PanelView from './PanelView.vue';

describe('PanelView', () => {
  it('presenta el flujo de la operación en orden, con enlaces a cada módulo', async () => {
    const { wrapper } = await mountWithApp(PanelView);
    const links = wrapper.findAll('ol a');
    expect(links.map((a) => a.attributes('href'))).toEqual([
      '/proveedores',
      '/clientes',
      '/operaciones',
      '/packing-lists',
      '/exportaciones',
    ]);
    expect(links[0]?.text()).toContain('1');
  });
});

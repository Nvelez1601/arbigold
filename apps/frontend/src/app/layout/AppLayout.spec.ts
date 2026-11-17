import { describe, expect, it } from 'vitest';
import { mountWithApp } from '../../../test/support/mount.ts';
import AppLayout from './AppLayout.vue';

describe('AppLayout', () => {
  it('ofrece saltar al contenido y una navegación con nombre', async () => {
    const { wrapper } = await mountWithApp(AppLayout, { slots: { default: '<p>contenido</p>' } });
    expect(wrapper.get('a[href="#contenido"]').text()).toBe('Saltar al contenido');
    expect(wrapper.get('main#contenido').text()).toBe('contenido');
  });

  it('avisa del modo demostración solo cuando aplica', async () => {
    const demo = await mountWithApp(AppLayout, { props: { demo: true } });
    expect(demo.wrapper.get('[role="status"]').text()).toContain('No cargues información real');
    const api = await mountWithApp(AppLayout, { props: { demo: false } });
    expect(api.wrapper.find('[role="status"]').exists()).toBe(false);
  });
});

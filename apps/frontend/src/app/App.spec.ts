import { describe, expect, it } from 'vitest';
import { mountWithApp } from '../../test/support/mount.ts';
import App from './App.vue';

describe('App', () => {
  it('monta el layout con la navegación y la pantalla de la ruta', async () => {
    const { wrapper } = await mountWithApp(App, { route: '/' });
    expect(wrapper.get('nav[aria-label="Principal"]').findAll('a')).toHaveLength(6);
    expect(wrapper.get('main h1').text()).toBe('Panel');
  });

  it('marca la sección activa en la navegación', async () => {
    const { wrapper } = await mountWithApp(App, { route: '/clientes' });
    const active = wrapper.get('nav a.text-primary-700\\!');
    expect(active.text()).toBe('Clientes');
  });
});

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import App from './App.vue';

describe('App', () => {
  it('muestra el nombre del sistema por defecto', () => {
    const wrapper = mount(App);
    expect(wrapper.get('h1').text()).toBe('ArbiGold');
  });

  it('muestra el nombre recibido por props', () => {
    const wrapper = mount(App, { props: { appName: 'ArbiGold Staging' } });
    expect(wrapper.get('h1').text()).toBe('ArbiGold Staging');
  });

  it('usa el degradado de marca en el encabezado', () => {
    expect(mount(App).get('header').classes()).toContain('bg-brand-gradient');
  });
});

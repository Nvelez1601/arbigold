import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SuppliersView from './SuppliersView.vue';

describe('SuppliersView', () => {
  it('muestra el título del módulo', () => {
    expect(mount(SuppliersView).get('h1').text()).toBe('Proveedores');
  });
});

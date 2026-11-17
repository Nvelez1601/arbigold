import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ClientsView from './ClientsView.vue';

describe('ClientsView', () => {
  it('muestra el título del módulo', () => {
    expect(mount(ClientsView).get('h1').text()).toBe('Clientes');
  });
});

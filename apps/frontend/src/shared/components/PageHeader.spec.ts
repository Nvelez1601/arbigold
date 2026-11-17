import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PageHeader from './PageHeader.vue';

describe('PageHeader', () => {
  it('muestra el título como h1 y la descripción', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Clientes', description: 'Quienes entregan el oro' },
    });
    expect(wrapper.get('h1').text()).toBe('Clientes');
    expect(wrapper.text()).toContain('Quienes entregan el oro');
  });

  it('muestra las acciones solo si se pasan', () => {
    expect(
      mount(PageHeader, { props: { title: 'X' } })
        .find('p')
        .exists(),
    ).toBe(false);
    const withActions = mount(PageHeader, {
      props: { title: 'X' },
      slots: { actions: '<button>Nuevo cliente</button>' },
    });
    expect(withActions.get('button').text()).toBe('Nuevo cliente');
  });
});

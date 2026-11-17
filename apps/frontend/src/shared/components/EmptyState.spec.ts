import { mount } from '@vue/test-utils';
import { Users } from 'lucide-vue-next';
import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState.vue';

describe('EmptyState', () => {
  it('invita a actuar: título, explicación y acción', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'Todavía no hay clientes', description: 'Registra el primero', icon: Users },
      slots: { default: '<button>Nuevo cliente</button>' },
    });
    expect(wrapper.get('h2').text()).toBe('Todavía no hay clientes');
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('button').text()).toBe('Nuevo cliente');
  });

  it('funciona sin ícono ni acción', () => {
    const wrapper = mount(EmptyState, { props: { title: 'Vacío', description: 'Nada aún' } });
    expect(wrapper.find('svg').exists()).toBe(false);
    expect(wrapper.find('button').exists()).toBe(false);
  });
});

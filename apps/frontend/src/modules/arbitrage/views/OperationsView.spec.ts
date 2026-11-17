import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import OperationsView from './OperationsView.vue';

describe('OperationsView', () => {
  it('muestra el título del módulo', () => {
    expect(mount(OperationsView).get('h1').text()).toBe('Operaciones');
  });
});

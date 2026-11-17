import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ExportsView from './ExportsView.vue';

describe('ExportsView', () => {
  it('muestra el título del módulo', () => {
    expect(mount(ExportsView).get('h1').text()).toBe('Exportaciones');
  });
});

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PackingListsView from './PackingListsView.vue';

describe('PackingListsView', () => {
  it('muestra el título del módulo', () => {
    expect(mount(PackingListsView).get('h1').text()).toBe('Packing lists');
  });
});

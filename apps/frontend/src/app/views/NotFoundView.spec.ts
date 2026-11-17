import { describe, expect, it } from 'vitest';
import { mountWithApp } from '../../../test/support/mount.ts';
import NotFoundView from './NotFoundView.vue';

describe('NotFoundView', () => {
  it('explica qué pasó y ofrece volver al panel', async () => {
    const { wrapper } = await mountWithApp(NotFoundView);
    expect(wrapper.get('h2').text()).toBe('Esta página no existe');
    expect(wrapper.get('a').attributes('href')).toBe('/');
  });
});

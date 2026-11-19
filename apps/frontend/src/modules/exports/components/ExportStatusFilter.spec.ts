import { mountWithApp } from '../../../../test/support/mount.ts';
import { describe, expect, it } from 'vitest';
import ExportStatusFilter from './ExportStatusFilter.vue';

/** jsdom no trae matchMedia y el Select de PrimeVue lo consulta para su panel. */
window.matchMedia = (media: string) =>
  ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
  }) as unknown as MediaQueryList;

describe('filtro de exportaciones', () => {
  it('muestra el estado elegido y avisa cuando no quedan packing lists', async () => {
    const { wrapper } = await mountWithApp(ExportStatusFilter, {
      props: { status: 'ENVIADA', available: false },
    });
    expect(wrapper.get('label').text()).toBe('Estado');
    expect(wrapper.text()).toContain('No quedan packing lists recibidos sin exportar.');
    expect(wrapper.find('a[href="/packing-lists"]').exists()).toBe(true);
  });

  it('sin faltantes no muestra el aviso', async () => {
    const { wrapper } = await mountWithApp(ExportStatusFilter, {
      props: { status: '', available: true },
    });
    expect(wrapper.find('[data-test="no-available"]').exists()).toBe(false);
  });

  it('emite el estado que elige la persona', async () => {
    const { wrapper } = await mountWithApp(ExportStatusFilter, {
      props: { status: '', available: true },
    });
    wrapper.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'LIQUIDADA');
    expect(wrapper.emitted('update:status')).toEqual([['LIQUIDADA']]);
  });
});

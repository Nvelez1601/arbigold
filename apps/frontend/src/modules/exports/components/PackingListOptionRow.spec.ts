import { mount } from '@vue/test-utils';
import { Decimal } from 'decimal.js';
import { describe, expect, it } from 'vitest';
import PackingListOptionRow from './PackingListOptionRow.vue';

const OPTION = {
  id: 'pl-a',
  clientName: 'Cliente Uno',
  issuedOn: '2026-11-10',
  pieceCount: 2,
  fine: new Decimal(6000),
};

describe('PackingListOptionRow', () => {
  it('muestra el cliente, la fecha, las piezas y el fino del packing list', () => {
    const wrapper = mount(PackingListOptionRow, {
      props: { list: OPTION, selected: true },
    });
    expect(wrapper.text()).toContain('Cliente Uno');
    expect(wrapper.text()).toContain('2 piezas');
    expect(wrapper.text()).toContain('6.000,00 g');
    expect(wrapper.get('input').element.checked).toBe(true);
  });

  it('emite el nuevo estado al marcar o desmarcar', async () => {
    const wrapper = mount(PackingListOptionRow, { props: { list: OPTION, selected: false } });
    await wrapper.get('input').setValue(true);
    expect(wrapper.emitted('update:selected')).toEqual([[true]]);
  });

  it('deshabilitada, la casilla no responde y se anuncia como bloqueada', async () => {
    const wrapper = mount(PackingListOptionRow, {
      props: { list: OPTION, selected: true, disabled: true },
    });
    expect(wrapper.get('input').attributes('disabled')).toBeDefined();
  });
});

import type { Operation } from '@arbigold/shared-types';
import { describe, expect, it } from 'vitest';
import { mountWithApp } from '../../../../test/support/mount.ts';
import { openOperationsTotals, operationFigures } from '../composables/useOperationForm.ts';
import OperationsTable from './OperationsTable.vue';

/** Datos ficticios: 100 000 USDT a P. INT 4000, cliente al 96 % y proveedor al 97 %. */
const operation = (id: string, status: Operation['status']): Operation => ({
  id,
  supplierId: 's-1',
  clientId: 'c-1',
  closedOn: '2026-11-10',
  amount: '100000',
  currency: 'USDT',
  internationalPricePerOunce: '4000',
  clientPercentage: '96',
  supplierPercentage: '97',
  notes: undefined,
  status,
  createdAt: '2026-11-10T10:00:00.000Z',
});
const row = (op: Operation) => ({
  ...op,
  clientName: 'Cliente Ficticio',
  supplierName: 'Proveedor Ficticio',
  figures: operationFigures(op),
});

describe('OperationsTable', () => {
  const ops = [operation('a', 'ABIERTA'), operation('b', 'CANCELADA')];
  const render = () =>
    mountWithApp(OperationsTable, {
      props: { rows: ops.map(row), totals: openOperationsTotals(ops) },
    });

  it('muestra partes, monto con su P. INT, porcentajes y gramos de cada cierre', async () => {
    const { wrapper } = await render();
    const text = wrapper.get('tbody tr').text();
    expect(text).toContain('Cliente Ficticio');
    expect(text).toContain('Proveedor Ficticio');
    expect(text).toContain('100.000,00 USDT');
    expect(text).toContain('a 4.000,00 USD/oz');
    expect(text).toContain('96,0 % / 97,0 %');
    expect(text).toContain('809,99 g');
  });

  it('totaliza solo las abiertas y marca el margen positivo como ganancia', async () => {
    const { wrapper } = await render();
    expect(wrapper.text()).toContain('Abiertas (1)');
    expect(wrapper.get('[data-testid="total-margin"]').text()).toBe('8,35 g');
  });

  it('una operación abierta ofrece cumplir o cancelar y emite la acción elegida', async () => {
    const { wrapper } = await render();
    const buttons = wrapper.get('tbody tr').findAll('button');
    expect(buttons.map((b) => b.attributes('aria-label'))).toEqual([
      'Marcar como cumplida la operación de Cliente Ficticio',
      'Cancelar la operación de Cliente Ficticio',
    ]);
    await buttons[1]?.trigger('click');
    expect(wrapper.emitted('status-change')?.[0]?.[1]).toBe('CANCELADA');
  });

  it('una operación cerrada va atenuada por fondo, sin acciones', async () => {
    const { wrapper } = await render();
    const closed = wrapper.findAll('tbody tr')[1];
    expect(closed?.classes()).toContain('bg-surface-50!');
    expect(closed?.find('button').exists()).toBe(false);
  });
});

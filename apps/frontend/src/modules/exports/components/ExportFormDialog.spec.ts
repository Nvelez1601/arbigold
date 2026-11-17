import type { Supplier } from '@arbigold/shared-types';
import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import { Decimal } from 'decimal.js';
import ConfirmDialog from 'primevue/confirmdialog';
import Select from 'primevue/select';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountWithApp } from '../../../../test/support/mount.ts';
import type { PackingListOption } from '../composables/useExportForm.ts';
import ExportFormDialog from './ExportFormDialog.vue';

const CREATED = '2026-11-17T12:00:00.000Z';
const SUPPLIERS: Supplier[] = [
  {
    id: 's-terceros',
    name: 'Comprador Ficticio',
    kind: 'TERCEROS',
    country: undefined,
    currency: 'USDT',
    defaultPercentage: '2',
    notes: undefined,
    active: true,
    createdAt: CREATED,
  },
  {
    id: 's-fondeo',
    name: 'Fondo Ficticio',
    kind: 'FONDEO',
    country: undefined,
    currency: 'USDT',
    defaultPercentage: '97',
    notes: undefined,
    active: true,
    createdAt: CREATED,
  },
];
const PACKING_LISTS: PackingListOption[] = [
  {
    id: 'pl-a',
    clientName: 'Cliente Uno',
    issuedOn: '2026-11-10',
    pieceCount: 2,
    fine: new Decimal(6000),
  },
  {
    id: 'pl-b',
    clientName: 'Cliente Dos',
    issuedOn: '2026-11-12',
    pieceCount: 3,
    fine: new Decimal(4000),
  },
];

/** El diálogo convive con el ConfirmDialog de App (descartar cambios al cerrar). */
const open = async (props: { packingLists?: PackingListOption[]; saving?: boolean } = {}) => {
  const dialogProps = {
    visible: true,
    suppliers: SUPPLIERS,
    packingLists: PACKING_LISTS,
    ...props,
  };
  const Host = defineComponent({
    render: () => [h(ExportFormDialog, dialogProps), h(ConfirmDialog)],
  });
  const { wrapper } = await mountWithApp(Host);
  await flushPromises();
  return wrapper.findComponent(ExportFormDialog);
};
const buttonNamed = (label: string, scope: ParentNode = document) =>
  [...scope.querySelectorAll('button')].find((button) => button.textContent?.trim() === label);
const accessibleName = (element: Element | null) => {
  const labelledBy = element?.getAttribute('aria-labelledby');
  if (labelledBy) return document.getElementById(labelledBy)?.textContent?.trim();
  return element?.closest('label')?.textContent?.replace(/\s+/g, ' ').trim();
};

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const chooseSupplier = async (wrapper: Awaited<ReturnType<typeof open>>, id: string) => {
  wrapper.findComponent(Select).vm.$emit('update:modelValue', id);
  await flushPromises();
};
const type = async (id: string, value: string) => {
  const input = byId<HTMLInputElement>(id);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await flushPromises();
};
const clickLabel = async (inputId: string) => {
  document.querySelector<HTMLLabelElement>(`label[for="${inputId}"]`)?.click();
  await flushPromises();
};
const submit = async () => {
  document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
  await flushPromises();
};
const settlementMode = () => document.querySelector('[data-test="settlement-mode"]');

enableAutoUnmount(afterEach);
/** jsdom no trae matchMedia y el Select de PrimeVue lo usa al montarse. */
beforeAll(() => {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as never;
});

/** Montan PrimeVue real (Dialog, Select): con la máquina cargada el primer montaje tarda más. */
describe('ExportFormDialog', { timeout: 20_000 }, () => {
  it('lista los packing lists disponibles con cliente, fecha, piezas y fino; la fecha arranca en hoy', async () => {
    await open();
    const rows = [...document.querySelectorAll('li')].map((li) => li.textContent ?? '');
    expect(rows[0]).toContain('Cliente Uno');
    expect(rows[0]).toContain('2 piezas');
    expect(rows[0]).toContain('6.000,00 g');
    expect(rows[1]).toContain('Cliente Dos');
    expect(byId<HTMLInputElement>('export-shipped-on').value).toBe(
      new Date().toLocaleDateString('en-CA'),
    );
  });

  it('la etiqueta de cada packing list marca su casilla y la vista previa suma su fino', async () => {
    await open();
    await clickLabel('export-packing-list-pl-a');
    await clickLabel('export-packing-list-pl-b');
    expect(byId<HTMLInputElement>('export-packing-list-pl-a').checked).toBe(true);
    expect(document.querySelector('[data-test="fine"]')?.textContent).toContain('10.000,00 g');
  });

  it('el modo de liquidación solo aparece con un proveedor de TERCEROS, que además precarga su %', async () => {
    const wrapper = await open();
    expect(settlementMode()).toBeNull();
    await chooseSupplier(wrapper, 's-terceros');
    expect(settlementMode()?.textContent).toContain('Cobro total');
    expect(byId<HTMLInputElement>('export-percentage').value).toBe('2');
    expect(byId<HTMLInputElement>('export-settlement-UTILIDAD').checked).toBe(true);
    await chooseSupplier(wrapper, 's-fondeo');
    expect(settlementMode()).toBeNull();
  });

  it('sin datos muestra los errores junto a cada campo y lleva el foco al primero', async () => {
    const wrapper = await open();
    await submit();
    expect(document.body.textContent).toContain('Elige el proveedor que recibe el oro');
    expect(document.body.textContent).toContain('Selecciona al menos un packing list');
    expect(document.activeElement?.id).toBe('export-supplier');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('con proveedor elegido el foco va a la primera casilla de packing list', async () => {
    const wrapper = await open();
    await chooseSupplier(wrapper, 's-fondeo');
    await submit();
    expect(document.activeElement?.id).toBe('export-packing-list-pl-a');
  });

  it('entrega la exportación validada con el contrato compartido', async () => {
    const wrapper = await open();
    await chooseSupplier(wrapper, 's-terceros');
    await clickLabel('export-packing-list-pl-b');
    await clickLabel('export-settlement-UTILIDAD');
    await type('export-destination', 'Refinería ficticia');
    await type('export-percentage', '2,5');
    await submit();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      supplierId: 's-terceros',
      destination: 'Refinería ficticia',
      packingListIds: ['pl-b'],
      grossProfitPercentage: '2.5',
      settlementMode: 'UTILIDAD',
    });
  });

  it('un % fuera de rango se explica junto al campo', async () => {
    const wrapper = await open();
    await chooseSupplier(wrapper, 's-fondeo');
    await clickLabel('export-packing-list-pl-a');
    await type('export-percentage', '150');
    await submit();
    expect(document.body.textContent).toContain('El porcentaje va entre 0 y 100');
    expect(document.activeElement?.id).toBe('export-percentage');
  });

  it('una fecha vacía y notas demasiado largas se explican y el foco va a la fecha', async () => {
    const wrapper = await open();
    await chooseSupplier(wrapper, 's-fondeo');
    await clickLabel('export-packing-list-pl-a');
    await type('export-shipped-on', '');
    const notes = byId<HTMLTextAreaElement>('export-notes');
    notes.value = 'x'.repeat(501);
    notes.dispatchEvent(new Event('input'));
    await submit();
    expect(document.body.textContent).toContain('Fecha inválida (AAAA-MM-DD)');
    expect(document.body.textContent).toContain('Máximo 500 caracteres');
    expect(document.activeElement?.id).toBe('export-shipped-on');
  });

  it('sin packing lists recibidos explica cómo conseguirlos', async () => {
    await open({ packingLists: [] });
    const notice = document.querySelector('[data-test="no-packing-lists"]');
    expect(notice?.textContent).toContain('Márcalos como recibidos');
    expect(notice?.querySelector('a')?.getAttribute('href')).toBe('/packing-lists');
  });

  it('mientras guarda muestra "Guardando…" y no deja reenviar', async () => {
    await open({ saving: true });
    const button = document.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(button?.textContent).toContain('Guardando…');
    expect(button?.disabled).toBe(true);
  });

  it('cancelar sin cambios cierra el diálogo de inmediato', async () => {
    const wrapper = await open();
    buttonNamed('Cancelar')?.click();
    await flushPromises();
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false]);
  });

  it('cerrar con datos capturados pide confirmación antes de descartarlos', async () => {
    const wrapper = await open();
    await type('export-destination', 'Refinería ficticia');
    buttonNamed('Cancelar')?.click();
    await flushPromises();
    const confirmation = document.querySelector('.p-confirmdialog');
    expect(confirmation?.textContent).toContain('Tienes datos sin registrar');
    expect(wrapper.emitted('update:visible')).toBeUndefined();

    buttonNamed('Seguir editando', confirmation ?? document)?.click();
    await flushPromises();
    expect(wrapper.emitted('update:visible')).toBeUndefined();

    buttonNamed('Cancelar')?.click();
    await flushPromises();
    buttonNamed('Descartar y cerrar')?.click();
    await flushPromises();
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false]);
  });

  it('cada control tiene un nombre accesible real', async () => {
    const wrapper = await open();
    await chooseSupplier(wrapper, 's-terceros');
    expect(accessibleName(byId('export-supplier'))).toBe('Proveedor');
    expect(accessibleName(byId('export-packing-list-pl-a'))).toContain('Cliente Uno');
    expect(accessibleName(byId('export-settlement-COBRO_TOTAL'))).toBe('Cobro total');
  });
});

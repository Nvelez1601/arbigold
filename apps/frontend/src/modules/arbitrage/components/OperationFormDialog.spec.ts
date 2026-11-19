import type { Client, Supplier } from '@arbigold/shared-types';
import { DOMWrapper, type VueWrapper, flushPromises } from '@vue/test-utils';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import ConfirmDialog from 'primevue/confirmdialog';
import { defineComponent, h } from 'vue';
import { mountWithApp } from '../../../../test/support/mount.ts';
import OperationFormDialog from './OperationFormDialog.vue';
import { pickOption } from '../../../../test/support/select.ts';

/** Datos ficticios: ni nombres ni montos reales. */
const SUPPLIERS: Supplier[] = [
  {
    id: 'prov-1',
    name: 'Proveedor Ficticio',
    kind: 'FONDEO',
    country: undefined,
    notes: undefined,
    currency: 'USD',
    defaultPercentage: '97',
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'prov-2',
    name: 'Proveedor Inactivo',
    kind: 'FONDEO',
    country: undefined,
    notes: undefined,
    currency: 'USDT',
    active: false,
    createdAt: '2026-11-01T10:00:00.000Z',
  },
];
const CLIENTS: Client[] = [
  {
    id: 'cli-1',
    name: 'Cliente Ficticio',
    kind: 'PERSONA',
    documentId: undefined,
    location: undefined,
    phone: undefined,
    notes: undefined,
    defaultPercentage: '96',
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
  },
];

const field = (id: string) => {
  const element = document.getElementById(`operation-${id}`);
  if (!element) throw new Error(`No se encontró el campo ${id}`);
  return new DOMWrapper(element);
};
const optionTexts = () =>
  [...document.querySelectorAll('[role="option"]')].map((option) => option.textContent?.trim());

/** Abre la lista del Select (si no está abierta ya) para ver sus opciones. */
const openOptions = async (fieldId: string) => {
  if (!document.querySelector('[role="option"]')) await field(fieldId).trigger('click');
  await flushPromises();
};
const chooseOption = async (fieldId: string, label: string) => {
  await openOptions(fieldId);
  await pickOption(label);
};

/** El diálogo junto al ConfirmDialog que App monta, para ver la confirmación de descartar. */
const WithConfirm = defineComponent({
  inheritAttrs: false,
  setup:
    (_, { attrs }) =>
    () => [h(OperationFormDialog, { ...attrs } as never), h(ConfirmDialog)],
});

const mounted: VueWrapper[] = [];
const open = async (props: { isSaving?: boolean } = {}) => {
  const { wrapper } = await mountWithApp(WithConfirm, {
    attrs: { visible: true, suppliers: SUPPLIERS, clients: CLIENTS, isSaving: false, ...props },
  });
  mounted.push(wrapper);
  const dialog = wrapper.findComponent(OperationFormDialog);
  return Object.assign(dialog, {
    reopen: async () => {
      await wrapper.setProps({ visible: false } as never);
      await wrapper.setProps({ visible: true } as never);
      await flushPromises();
    },
  });
};
const buttonByText = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.trim() === label,
  );
const accessibleName = (id: string) =>
  document.getElementById(field(id).attributes('aria-labelledby') ?? '')?.textContent?.trim();

/** jsdom no trae matchMedia ni ResizeObserver; Select y Textarea de PrimeVue los usan. */
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
  };
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList;
});

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount());
});

/** Monta la app completa (PrimeVue, router): con la suite en paralelo puede tardar. */
describe('OperationFormDialog', { timeout: 20_000 }, () => {
  it('abre con la fecha de hoy, moneda USDT y la vista previa esperando datos', async () => {
    await open();
    expect((field('closedOn').element as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(document.body.textContent).toContain('Para completar el cálculo falta');
    expect(field('amount').attributes('inputmode')).toBe('decimal');
  });

  it('solo ofrece proveedores activos y al elegir uno precarga su % y su moneda', async () => {
    await open();
    await openOptions('supplierId');
    expect(optionTexts()).toEqual(['Proveedor Ficticio']);
    await chooseOption('supplierId', 'Proveedor Ficticio');
    expect((field('supplierPercentage').element as HTMLInputElement).value).toBe('97');
    expect(document.body.textContent).toContain('USD');
  });

  it('al elegir cliente precarga su % habitual', async () => {
    await open();
    await chooseOption('clientId', 'Cliente Ficticio');
    expect((field('clientPercentage').element as HTMLInputElement).value).toBe('96');
  });

  it('calcula en vivo los gramos y el margen mientras se escribe', async () => {
    await open();
    await chooseOption('supplierId', 'Proveedor Ficticio');
    await chooseOption('clientId', 'Cliente Ficticio');
    await field('amount').setValue('100000');
    await field('internationalPricePerOunce').setValue('2000');
    const preview = document.querySelector('[data-testid="closure-preview"]')?.textContent ?? '';
    expect(preview).toContain('1.619,97 g');
    expect(preview).toContain('1.603,27 g');
    expect(preview).toContain('16,70 g');
  });

  it('sin datos muestra los errores en línea y lleva el foco al primero', async () => {
    const wrapper = await open();
    await field('notes').setValue('x'.repeat(501));
    document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await flushPromises();
    expect(document.body.textContent).toContain('Elige el proveedor que adelanta el monto');
    expect(document.body.textContent).toContain('Elige el cliente que recibe el monto');
    expect(document.body.textContent).toContain('Máximo 500 caracteres');
    expect(field('amount').attributes('aria-describedby')).toBe('operation-amount-error');
    expect(document.activeElement?.id).toBe('operation-supplierId');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('con datos válidos emite la operación como texto', async () => {
    const wrapper = await open();
    await chooseOption('supplierId', 'Proveedor Ficticio');
    await chooseOption('clientId', 'Cliente Ficticio');
    await field('amount').setValue('100000');
    await field('internationalPricePerOunce').setValue('4000');
    document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      supplierId: 'prov-1',
      clientId: 'cli-1',
      amount: '100000',
      currency: 'USD',
      internationalPricePerOunce: '4000',
      clientPercentage: '96',
      supplierPercentage: '97',
    });
  });

  it('permite negociar a mano fecha, moneda y porcentajes distintos a los habituales', async () => {
    const wrapper = await open();
    await chooseOption('supplierId', 'Proveedor Ficticio');
    await chooseOption('clientId', 'Cliente Ficticio');
    await field('closedOn').setValue('2026-11-15');
    await field('amount').setValue('25000,50');
    await field('internationalPricePerOunce').setValue('4100');
    await field('clientPercentage').setValue('95.5');
    await field('supplierPercentage').setValue('96.75');
    await chooseOption('currency', 'USD');
    document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      closedOn: '2026-11-15',
      amount: '25000.50',
      currency: 'USD',
      clientPercentage: '95.5',
      supplierPercentage: '96.75',
    });
  });

  it('cerrar sin haber escrito nada no pide confirmación', async () => {
    const wrapper = await open();
    document.querySelector<HTMLButtonElement>('.p-dialog-close-button')?.click();
    await flushPromises();
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('con datos escritos confirma antes de descartar (X, Esc o "Volver")', async () => {
    const wrapper = await open();
    await field('amount').setValue('500');
    buttonByText('Volver')?.click();
    await flushPromises();
    expect(document.body.textContent).toContain('Lo que escribiste en esta operación se perderá.');
    buttonByText('Seguir editando')?.click();
    await flushPromises();
    expect(wrapper.emitted('update:visible')).toBeUndefined();
    document.querySelector<HTMLButtonElement>('.p-dialog-close-button')?.click();
    await flushPromises();
    buttonByText('Descartar')?.click();
    await flushPromises();
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false]);
  });

  it('cada Select tiene nombre accesible real', async () => {
    await open();
    expect(accessibleName('supplierId')).toBe('Proveedor');
    expect(accessibleName('clientId')).toBe('Cliente');
    expect(accessibleName('currency')).toBe('Moneda del monto');
  });

  it('mientras guarda el botón dice "Guardando…" y queda deshabilitado', async () => {
    await open({ isSaving: true });
    const submit = document.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(submit?.textContent).toContain('Guardando…');
    expect(submit?.disabled).toBe(true);
  });

  it('al reabrir empieza un borrador limpio, sin datos ni errores', async () => {
    const wrapper = await open();
    await field('amount').setValue('12.345');
    buttonByText('Registrar operación')?.click();
    await flushPromises();
    expect(document.body.textContent).toContain('Máximo 2 decimales');
    await wrapper.reopen();
    expect((field('amount').element as HTMLInputElement).value).toBe('');
    expect(document.body.textContent).not.toContain('Máximo 2 decimales');
    expect(document.body.textContent).not.toContain('Elige el proveedor que adelanta el monto');
  });
});

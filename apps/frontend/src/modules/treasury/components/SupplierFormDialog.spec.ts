import type { Supplier } from '@arbigold/shared-types';
import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import ConfirmDialog from 'primevue/confirmdialog';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { type PropType, defineComponent, h } from 'vue';
import { mountWithApp } from '../../../../test/support/mount.ts';
import SupplierFormDialog from './SupplierFormDialog.vue';

const existingSupplier: Supplier = {
  id: 's-1',
  name: 'Fondos Ejemplo',
  kind: 'TERCEROS',
  country: undefined,
  currency: 'USD',
  defaultPercentage: '2.5',
  notes: undefined,
  active: true,
  createdAt: '2026-11-17T12:00:00.000Z',
};

/** El diálogo junto a la confirmación que monta App (para avisar antes de descartar cambios). */
const DialogWithConfirmation = defineComponent({
  props: {
    visible: { type: Boolean, required: true },
    supplier: { type: Object as PropType<Supplier | null>, default: null },
    isSaving: { type: Boolean, default: false },
  },
  setup: (props) => () => [h(SupplierFormDialog, { ...props }), h(ConfirmDialog)],
});

const openDialog = async (
  props: Partial<{ supplier: Supplier | null; isSaving: boolean }> = {},
) => {
  const mounted = await mountWithApp(DialogWithConfirmation, {
    props: { visible: true, supplier: null, isSaving: false, ...props },
  });
  return { ...mounted, dialog: mounted.wrapper.findComponent(SupplierFormDialog) };
};

const field = <T extends HTMLElement = HTMLInputElement>(selector: string) => {
  const element = document.body.querySelector<T>(selector);
  if (!element) throw new Error(`No está en pantalla: ${selector}`);
  return element;
};

/** Nombre accesible: el texto de aria-labelledby si existe; si no, el del label asociado. */
const accessibleName = (control: HTMLElement) => {
  const labelledBy = control.getAttribute('aria-labelledby');
  const label = labelledBy
    ? document.getElementById(labelledBy)
    : document.body.querySelector(`label[for="${control.id}"]`);
  return label?.textContent?.replace(/\s+/g, ' ').trim();
};

const type = async (selector: string, value: string) => {
  const input = field(selector);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await flushPromises();
};

const submit = async () => {
  field<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
  await flushPromises();
};

const click = async (name: string, scope = 'form') => {
  const button = [...field(scope).querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`No hay un botón "${name}"`);
  button.click();
  await flushPromises();
};

/** jsdom no trae matchMedia y el Select de PrimeVue lo consulta al montarse. */
beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});
enableAutoUnmount(afterEach);

/** El primer montaje carga PrimeVue y el router en frío: con la máquina cargada pasa de 5 s. */
const COLD_MOUNT_TIMEOUT_MS = 20_000;

describe('SupplierFormDialog', { timeout: COLD_MOUNT_TIMEOUT_MS }, () => {
  it('para un alta se titula "Nuevo proveedor" y cada control tiene su nombre accesible', async () => {
    await openDialog();
    expect(document.body.textContent).toContain('Nuevo proveedor');
    expect(accessibleName(field('#supplier-name'))).toBe('Nombre');
    expect(accessibleName(field('#supplier-country'))).toBe('País (opcional)');
    expect(accessibleName(field('[role="combobox"]#supplier-currency'))).toBe('Moneda');
    expect(accessibleName(field('#supplier-percentage'))).toBe('% habitual (opcional)');
    expect(accessibleName(field('#supplier-notes'))).toBe('Notas (opcional)');
    expect(accessibleName(field('#supplier-kind-FONDEO'))).toContain('Fondeo');
  });

  it('pide el % como texto con teclado decimal', async () => {
    await openDialog();
    const percentage = field('#supplier-percentage');
    expect(percentage.type).toBe('text');
    expect(percentage.getAttribute('inputmode')).toBe('decimal');
    expect(field('#supplier-name').getAttribute('autocomplete')).toBe('organization');
  });

  it('explica qué significa fondeo y qué significa terceros', async () => {
    await openDialog();
    const text = document.body.textContent ?? '';
    expect(text).toContain('Adelanta los fondos y recibe el oro exportado.');
    expect(text).toContain('Trae material propio con token y custodio');
  });

  it('muestra los errores junto a cada campo y lleva el foco al primero', async () => {
    const { dialog } = await openDialog();
    await type('#supplier-percentage', '150');
    await submit();
    expect(field('#supplier-name-error').textContent).toContain('Escribe al menos 2 caracteres');
    expect(field('#supplier-percentage-error').textContent).toContain('entre 0 y 100');
    expect(field('#supplier-name').getAttribute('aria-invalid')).toBe('true');
    expect(field('#supplier-name').getAttribute('aria-describedby')).toBe('supplier-name-error');
    expect(document.activeElement?.id).toBe('supplier-name');
    expect(dialog.emitted('submit')).toBeUndefined();
  });

  it('entrega el proveedor validado con el contrato compartido', async () => {
    const { dialog } = await openDialog();
    await type('#supplier-name', '  Fondos del Caribe ');
    await type('#supplier-country', 'Panamá');
    await type('#supplier-percentage', '97,5');
    field('#supplier-kind-TERCEROS').click();
    await submit();
    expect(dialog.emitted('submit')?.[0]).toEqual([
      {
        name: 'Fondos del Caribe',
        kind: 'TERCEROS',
        country: 'Panamá',
        currency: 'USDT',
        defaultPercentage: '97.5',
        notes: undefined,
      },
    ]);
  });

  it('al editar precarga los datos del proveedor', async () => {
    await openDialog({ supplier: existingSupplier });
    expect(document.body.textContent).toContain('Editar proveedor');
    expect(field('#supplier-name').value).toBe('Fondos Ejemplo');
    expect(field('#supplier-percentage').value).toBe('2.5');
    expect(field('#supplier-kind-TERCEROS').checked).toBe(true);
  });

  it('al reabrirlo no arrastra los datos ni los errores anteriores', async () => {
    const { wrapper } = await openDialog();
    await type('#supplier-name', 'A');
    await submit();
    expect(document.body.querySelector('#supplier-name-error')).not.toBeNull();
    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    await flushPromises();
    expect(field('#supplier-name').value).toBe('');
    expect(document.body.querySelector('#supplier-name-error')).toBeNull();
  });

  it('mientras guarda, el botón dice "Guardando…", queda deshabilitado y no reenvía', async () => {
    const { dialog } = await openDialog({ supplier: existingSupplier, isSaving: true });
    const button = field<HTMLButtonElement>('button[type="submit"]');
    expect(button.textContent).toContain('Guardando…');
    expect(button.disabled).toBe(true);
    await submit();
    expect(dialog.emitted('submit')).toBeUndefined();
  });

  it('sin cambios, cancelar cierra el diálogo sin guardar', async () => {
    const { dialog } = await openDialog();
    await click('Cancelar');
    expect(dialog.emitted('update:visible')?.[0]).toEqual([false]);
    expect(dialog.emitted('submit')).toBeUndefined();
  });

  it('con cambios sin guardar, pide confirmación antes de cerrar', async () => {
    const { dialog } = await openDialog();
    await type('#supplier-name', 'Fondos del Caribe');
    await click('Cancelar');
    expect(field('[role="alertdialog"]').textContent).toContain('Hay cambios sin guardar');
    await click('Seguir editando', '[role="alertdialog"]');
    expect(dialog.emitted('update:visible')).toBeUndefined();
    await click('Cancelar');
    await click('Descartar cambios', '[role="alertdialog"]');
    expect(dialog.emitted('update:visible')?.[0]).toEqual([false]);
  });
});

import type { Client } from '@arbigold/shared-types';
import { DOMWrapper, type VueWrapper, flushPromises } from '@vue/test-utils';
import ConfirmDialog from 'primevue/confirmdialog';
import { afterEach, describe, expect, it } from 'vitest';
import { mountWithApp } from '../../../../test/support/mount.ts';
import ClientFormDialog from './ClientFormDialog.vue';

const existingClient: Client = {
  id: 'c-1',
  name: 'Compradora Ejemplo',
  kind: 'EMPRESA',
  documentId: 'J-00000000-1',
  phone: '0414-0000000',
  defaultPercentage: '96.5',
  location: undefined,
  notes: undefined,
  active: true,
  createdAt: '2026-11-01T10:00:00.000Z',
};

const inBody = (selector: string) => new DOMWrapper(document.body).get(selector);
const field = (name: string) => inBody(`#client-${name}`);
const submitButton = () => inBody('form button[type="submit"]');

const mounted: VueWrapper[] = [];

/** Monta el diálogo abierto y, como en App, el ConfirmDialog que pregunta antes de descartar. */
const openDialog = async (props: Partial<{ client: Client | null; isSaving: boolean }> = {}) => {
  const confirmHost = await mountWithApp(ConfirmDialog);
  const app = await mountWithApp(ClientFormDialog, {
    props: { visible: true, client: null, isSaving: false, ...props },
  });
  mounted.push(confirmHost.wrapper, app.wrapper);
  return app;
};

const buttonNamed = (name: string) => {
  const button = new DOMWrapper(document.body)
    .findAll('button')
    .find((candidate) => candidate.text() === name);
  if (!button) throw new Error(`No hay botón "${name}"`);
  return button;
};
const click = async (name: string) => {
  await buttonNamed(name).trigger('click');
  await flushPromises();
};

const submit = async () => {
  await inBody('form').trigger('submit');
  await flushPromises();
};

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

// Montar PrimeVue con el preset es lento cuando la máquina está cargada: margen de tiempo amplio.
describe('diálogo de alta y edición de cliente', { timeout: 20_000 }, () => {
  it('para un cliente nuevo arranca vacío, con título y botón de guardar', async () => {
    await openDialog();
    expect(document.body.textContent).toContain('Nuevo cliente');
    expect((field('name').element as HTMLInputElement).value).toBe('');
    expect(submitButton().text()).toContain('Guardar cliente');
  });

  it('cada campo tiene su label y el tipo de teclado correcto', async () => {
    await openDialog();
    const accessibleName = (name: string) =>
      (field(name).element as HTMLInputElement).labels?.[0]?.textContent?.trim();
    expect(accessibleName('name')).toBe('Nombre');
    expect(accessibleName('phone')).toBe('Teléfono');
    expect(accessibleName('defaultPercentage')).toBe('% habitual de compra');
    expect(accessibleName('notes')).toBe('Notas');
    expect(accessibleName('kind')).toBe('Persona');
    expect(field('phone').attributes('type')).toBe('tel');
    expect(field('defaultPercentage').attributes()).toMatchObject({
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
    });
  });

  it('explica para qué sirve el % habitual y lo asocia al campo', async () => {
    await openDialog();
    const percent = field('defaultPercentage');
    expect(percent.attributes('aria-describedby')).toBe('client-defaultPercentage-hint');
    expect(inBody('#client-defaultPercentage-hint').text()).toContain(
      'cada operación puede negociar otro',
    );
  });

  it('entrega los datos validados al guardar, con el % como texto', async () => {
    const { wrapper } = await openDialog();
    await field('name').setValue('Cliente Ejemplo');
    await inBody('input[type="radio"][value="EMPRESA"]').setValue(true);
    await field('defaultPercentage').setValue('96,5');
    await submit();
    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      name: 'Cliente Ejemplo',
      kind: 'EMPRESA',
      defaultPercentage: '96.5',
    });
  });

  it('muestra los errores junto a cada campo y lleva el foco al primero', async () => {
    const { wrapper } = await openDialog();
    await field('defaultPercentage').setValue('150');
    await submit();
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(inBody('#client-name-error').text()).toBe('Escribe al menos 2 caracteres');
    expect(inBody('#client-defaultPercentage-error').text()).toBe('El porcentaje va entre 0 y 100');
    expect(field('name').attributes('aria-invalid')).toBe('true');
    expect(field('defaultPercentage').attributes('aria-describedby')).toContain(
      'client-defaultPercentage-error',
    );
    expect(document.activeElement).toBe(field('name').element);
  });

  it('avisa si las notas son demasiado largas', async () => {
    await openDialog();
    await field('name').setValue('Cliente Ejemplo');
    await field('notes').setValue('x'.repeat(501));
    await submit();
    expect(document.body.textContent).toContain('Máximo 500 caracteres');
    expect(document.activeElement).toBe(field('notes').element);
  });

  it('al editar muestra los datos actuales del cliente', async () => {
    await openDialog({ client: existingClient });
    expect(document.body.textContent).toContain('Editar cliente');
    expect((field('name').element as HTMLInputElement).value).toBe('Compradora Ejemplo');
    expect((field('kind').element as HTMLInputElement).value).toBe('EMPRESA');
  });

  it('mientras guarda dice "Guardando…" y no deja guardar dos veces ni cancelar', async () => {
    await openDialog({ isSaving: true });
    expect(submitButton().text()).toContain('Guardando…');
    expect(submitButton().attributes('disabled')).toBeDefined();
    expect(buttonNamed('Cancelar').attributes('disabled')).toBeDefined();
  });

  it('cancelar sin cambios cierra el diálogo sin preguntar', async () => {
    const { wrapper } = await openDialog();
    await click('Cancelar');
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false]);
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('con cambios sin guardar pregunta antes de descartarlos', async () => {
    const { wrapper } = await openDialog();
    await field('name').setValue('Cliente a medias');
    await click('Cancelar');
    expect(document.body.textContent).toContain('Lo que escribiste en este cliente se perderá.');
    await click('Seguir editando');
    expect(wrapper.emitted('update:visible')).toBeUndefined();
    expect((field('name').element as HTMLInputElement).value).toBe('Cliente a medias');
    await click('Cancelar');
    await click('Descartar cambios');
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false]);
  });

  it('cerrar con Esc también protege los cambios', async () => {
    const { wrapper } = await openDialog();
    await field('name').setValue('Cliente a medias');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    await flushPromises();
    expect(wrapper.emitted('update:visible')).toBeUndefined();
  });

  it('al reabrir arranca limpio: sin lo escrito ni los errores anteriores', async () => {
    const { wrapper } = await openDialog();
    await field('name').setValue('A');
    await submit();
    expect(document.body.querySelector('#client-name-error')).not.toBeNull();
    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    await flushPromises();
    expect((field('name').element as HTMLInputElement).value).toBe('');
    expect(document.body.querySelector('#client-name-error')).toBeNull();
  });
});

import type { SupplierInput } from '@arbigold/shared-types';
import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountWithApp } from '../../../../test/support/mount.ts';
import { suppliersRepository } from '../../../shared/data/repositories.ts';
import SuppliersView from './SuppliersView.vue';

/** La vista tal como la ve el usuario: con los toasts y la confirmación que monta App. */
const ScreenWithAppChrome = defineComponent({
  render: () => [h(SuppliersView), h(Toast), h(ConfirmDialog)],
});

const openScreen = (route = '/proveedores') => mountWithApp(ScreenWithAppChrome, { route });

const registerSupplier = (input: Partial<SupplierInput> = {}) =>
  suppliersRepository.create({
    name: 'Fondos del Caribe',
    kind: 'FONDEO',
    currency: 'USDT',
    ...input,
  });

const screenText = () => document.body.textContent ?? '';

const buttonNamed = (name: string, scope: ParentNode = document.body) => {
  const button = [...scope.querySelectorAll('button')].find(
    (candidate) =>
      candidate.getAttribute('aria-label') === name || candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`No hay un botón "${name}"`);
  return button;
};

const click = async (name: string) => {
  buttonNamed(name).click();
  await flushPromises();
};

/** Responde la confirmación (ConfirmDialog se teletransporta a document.body). */
const answerConfirmation = async (name: string) => {
  const dialog = document.body.querySelector('[role="alertdialog"]');
  if (!dialog) throw new Error('No se pidió confirmación');
  buttonNamed(name, dialog).click();
  await flushPromises();
};

const input = (selector: string) => {
  const element = document.body.querySelector<HTMLInputElement>(selector);
  if (!element) throw new Error(`No está en pantalla: ${selector}`);
  return element;
};

const type = async (selector: string, value: string) => {
  input(selector).value = value;
  input(selector).dispatchEvent(new Event('input'));
  await flushPromises();
};

const submitForm = async () => {
  input('form').dispatchEvent(new Event('submit'));
  await flushPromises();
};

const tableRows = () => [...document.body.querySelectorAll('tbody tr')];

beforeAll(() => {
  // jsdom no trae matchMedia y el Select de PrimeVue lo consulta al montarse.
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

/**
 * Node 26 trae su propio localStorage vacío: los tests instalan uno en memoria. El repositorio
 * fija su almacenamiento al importarse, así que además se vacía por su propia interfaz.
 */
beforeEach(async () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    },
  });
  const leftovers = await suppliersRepository.list();
  await Promise.all(leftovers.map((supplier) => suppliersRepository.remove(supplier.id)));
});

afterEach(() => vi.restoreAllMocks());
enableAutoUnmount(afterEach);

/** El primer montaje carga PrimeVue y el router en frío: con la máquina cargada pasa de 5 s. */
const COLD_MOUNT_TIMEOUT_MS = 20_000;

describe('SuppliersView', { timeout: COLD_MOUNT_TIMEOUT_MS }, () => {
  it('sin proveedores invita a registrar el primero', async () => {
    const { wrapper } = await openScreen();
    expect(wrapper.get('h1').text()).toBe('Proveedores');
    expect(screenText()).toContain('Todavía no hay proveedores');
    await click('Nuevo proveedor');
    expect(screenText()).toContain('Guardar proveedor');
  });

  it('avisa mientras carga la lista', async () => {
    vi.spyOn(suppliersRepository, 'list').mockReturnValue(new Promise(() => undefined));
    await openScreen();
    expect(document.body.querySelector('[role="status"]')?.textContent).toContain(
      'Cargando proveedores…',
    );
  });

  it('si la lista no carga, permite reintentar', async () => {
    const list = vi.spyOn(suppliersRepository, 'list').mockRejectedValue(new Error('sin red'));
    await openScreen();
    expect(screenText()).toContain('No se pudieron cargar los proveedores');
    await click('Reintentar');
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('lista los proveedores con su tipo, % habitual y estado; los inactivos atenuados', async () => {
    await registerSupplier({ defaultPercentage: '97', country: 'Panamá' });
    const thirdParty = await registerSupplier({ name: 'Arenas Doradas', kind: 'TERCEROS' });
    await suppliersRepository.update(thirdParty.id, { active: false });
    await openScreen();
    const [inactive, active] = tableRows().map((row) => row.textContent);
    expect(inactive).toMatch(/Arenas Doradas.*Terceros.*Inactivo/);
    expect(buttonNamed('Reactivar Arenas Doradas')).toBeTruthy();
    expect(active).toMatch(/Fondos del Caribe.*Fondeo.*97,0 %.*Panamá.*Activo/);
    expect(buttonNamed('Desactivar Fondos del Caribe')).toBeTruthy();
  });

  it('filtra por nombre desde la URL, sin importar mayúsculas ni tildes', async () => {
    await registerSupplier();
    await registerSupplier({ name: 'Arenas Doradas' });
    await openScreen('/proveedores?q=CARIBÉ');
    expect(input('#suppliers-search').value).toBe('CARIBÉ');
    expect(tableRows()).toHaveLength(1);
    expect(tableRows()[0]?.textContent).toContain('Fondos del Caribe');
  });

  it('al escribir la búsqueda la deja en la URL para que sobreviva a recargar', async () => {
    await registerSupplier();
    const { router } = await openScreen();
    await type('#suppliers-search', 'caribe');
    expect(router.currentRoute.value.query.q).toBe('caribe');
    await type('#suppliers-search', '   ');
    expect(router.currentRoute.value.query.q).toBeUndefined();
    await type('#suppliers-search', '');
    expect(router.currentRoute.value.query.q).toBeUndefined();
  });

  it('distingue "sin resultados" del estado vacío y permite borrar la búsqueda', async () => {
    await registerSupplier();
    const { router } = await openScreen('/proveedores?q=zafiro');
    expect(screenText()).toContain('Ningún proveedor coincide con “zafiro”');
    expect(screenText()).not.toContain('Todavía no hay proveedores');
    await click('Borrar búsqueda');
    expect(router.currentRoute.value.query.q).toBeUndefined();
    expect(tableRows()).toHaveLength(1);
  });

  it('registra un proveedor nuevo y confirma con "Proveedor guardado"', async () => {
    await openScreen();
    await click('Nuevo proveedor');
    await type('#supplier-name', 'Fondos del Caribe');
    await type('#supplier-percentage', '97,5');
    await submitForm();
    expect(screenText()).toContain('Proveedor guardado');
    expect(tableRows()[0]?.textContent).toContain('97,5 %');
    expect(await suppliersRepository.list()).toMatchObject([
      { name: 'Fondos del Caribe', defaultPercentage: '97.5', active: true },
    ]);
  });

  it('no guarda un proveedor inválido: el error queda junto al campo', async () => {
    await openScreen();
    await click('Nuevo proveedor');
    await submitForm();
    expect(input('#supplier-name-error').textContent).toContain('Escribe al menos 2 caracteres');
    expect(await suppliersRepository.list()).toEqual([]);
  });

  it('edita un proveedor desde su fila', async () => {
    await registerSupplier();
    await openScreen();
    await click('Editar Fondos del Caribe');
    expect(input('#supplier-name').value).toBe('Fondos del Caribe');
    await type('#supplier-name', 'Fondos del Caribe Sur');
    await submitForm();
    expect(screenText()).toContain('Proveedor guardado');
    expect(await suppliersRepository.list()).toMatchObject([{ name: 'Fondos del Caribe Sur' }]);
  });

  it('si no se puede guardar, lo dice y deja el formulario abierto', async () => {
    vi.spyOn(suppliersRepository, 'create').mockRejectedValue(new Error('sin red'));
    await openScreen();
    await click('Nuevo proveedor');
    await type('#supplier-name', 'Fondos del Caribe');
    await submitForm();
    expect(screenText()).toContain('No se pudo guardar el proveedor');
    expect(screenText()).toContain('Tus datos siguen en el formulario');
    expect(input('#supplier-name').value).toBe('Fondos del Caribe');
  });

  it('desactiva un proveedor solo después de confirmarlo', async () => {
    await registerSupplier();
    await openScreen();
    await click('Desactivar Fondos del Caribe');
    expect(screenText()).toContain('quedará inactivo');
    await answerConfirmation('Cancelar');
    expect((await suppliersRepository.list())[0]?.active).toBe(true);
    await click('Desactivar Fondos del Caribe');
    await answerConfirmation('Desactivar');
    expect(screenText()).toContain('Proveedor desactivado');
    expect((await suppliersRepository.list())[0]?.active).toBe(false);
  });

  it('reactiva un proveedor inactivo con confirmación', async () => {
    const supplier = await registerSupplier();
    await suppliersRepository.update(supplier.id, { active: false });
    await openScreen();
    await click('Reactivar Fondos del Caribe');
    expect(screenText()).toContain('vuelve a estar disponible');
    await answerConfirmation('Reactivar');
    expect(screenText()).toContain('Proveedor reactivado');
    expect((await suppliersRepository.list())[0]?.active).toBe(true);
  });

  it('si no se puede desactivar, lo avisa y el proveedor sigue activo', async () => {
    await registerSupplier();
    await openScreen();
    vi.spyOn(suppliersRepository, 'update').mockRejectedValue(new Error('sin red'));
    await click('Desactivar Fondos del Caribe');
    await answerConfirmation('Desactivar');
    expect(screenText()).toContain('No se pudo desactivar el proveedor');
    expect(screenText()).toContain('Vuelve a intentarlo.');
    expect(tableRows()[0]?.textContent).toContain('Activo');
  });

  it('cerrar el formulario con cambios pide confirmar antes de descartarlos', async () => {
    await openScreen();
    await click('Nuevo proveedor');
    await type('#supplier-name', 'Fondos del Caribe');
    await click('Cancelar');
    await answerConfirmation('Descartar cambios');
    expect(document.body.querySelector('#supplier-name')).toBeNull();
    expect(await suppliersRepository.list()).toEqual([]);
  });
});

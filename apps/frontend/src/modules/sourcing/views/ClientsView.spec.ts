import type { ClientInput } from '@arbigold/shared-types';
import { DOMWrapper, type VueWrapper, flushPromises } from '@vue/test-utils';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountWithApp } from '../../../../test/support/mount.ts';
import { clientsRepository } from '../../../shared/data/repositories.ts';
import ClientsView from './ClientsView.vue';

/** La vista con lo que App monta alrededor: toasts y confirmaciones. */
const ScreenWithApp = defineComponent({
  render: () => [h(ClientsView), h(Toast), h(ConfirmDialog)],
});

let mounted: VueWrapper | undefined;

/**
 * Node 26 trae su propio localStorage vacío: se instala uno en memoria. Además el repositorio
 * elige su almacenamiento al cargarse, así que cada test arranca vaciando la lista.
 */
beforeEach(async () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    },
  });
  for (const client of await clientsRepository.list()) await clientsRepository.remove(client.id);
});

afterEach(() => {
  mounted?.unmount();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

const seed = async (...clients: ClientInput[]) => {
  const created = [];
  for (const client of clients) created.push(await clientsRepository.create(client));
  return created;
};

const openScreen = async (route = '/clientes') => {
  const app = await mountWithApp(ScreenWithApp, { route });
  mounted = app.wrapper;
  return app;
};

const body = () => new DOMWrapper(document.body);
const bodyText = () => document.body.textContent ?? '';
const buttonNamed = (name: string) => {
  const button = body()
    .findAll('button')
    .find((candidate) => (candidate.attributes('aria-label') ?? candidate.text()) === name);
  if (!button) throw new Error(`No hay botón "${name}"`);
  return button;
};
const click = async (name: string) => {
  const button = await vi.waitFor(() => buttonNamed(name));
  await button.trigger('click');
  await flushPromises();
};
/** Las mutaciones y el refresco de la lista son asíncronos: se espera a que el resultado aparezca. */
const eventually = (assertion: () => void) => vi.waitFor(assertion);
const rowOf = (name: string) =>
  body()
    .findAll('tbody tr')
    .find((row) => row.text().includes(name));

const MARIA = { name: 'María Pérez', kind: 'PERSONA', documentId: 'V-12.345.678' } as const;
const COMPRADORA = {
  name: 'Compradora Ejemplo C.A.',
  kind: 'EMPRESA',
  documentId: 'J-00000000-1',
  location: 'Ciudad Bolívar',
  phone: '0414-0000000',
  defaultPercentage: '96.5',
} as const;

// Montar PrimeVue con el preset es lento cuando la máquina está cargada: margen de tiempo amplio.
describe('pantalla de clientes', { timeout: 20_000 }, () => {
  it('sin clientes invita a registrar el primero', async () => {
    await openScreen();
    expect(body().get('h1').text()).toBe('Clientes');
    expect(bodyText()).toContain('Todavía no hay clientes');
    await click('Registrar el primer cliente');
    expect(body().find('#client-name').exists()).toBe(true);
  });

  it('avisa mientras carga la lista', async () => {
    vi.spyOn(clientsRepository, 'list').mockReturnValue(new Promise(() => undefined));
    await openScreen();
    expect(body().get('[role="status"]').text()).toBe('Cargando clientes…');
  });

  it('si la lista no carga, dice qué hacer', async () => {
    vi.spyOn(clientsRepository, 'list').mockRejectedValue(new Error('sin conexión'));
    await openScreen();
    expect(bodyText()).toContain('No se pudieron cargar los clientes. Recarga la página');
  });

  it('muestra cada cliente con su tipo, documento, % habitual y estado', async () => {
    await seed(COMPRADORA, MARIA);
    await openScreen();
    const row = rowOf('Compradora Ejemplo C.A.');
    expect(row?.text()).toContain('Empresa');
    expect(row?.text()).toContain('J-00000000-1');
    expect(row?.text()).toContain('Ciudad Bolívar');
    expect(row?.text()).toContain('96,5 %');
    expect(row?.text()).toContain('Activo');
    expect(rowOf('María Pérez')?.text()).toContain('Sin dato');
    expect(bodyText()).toContain('2 de 2 clientes');
  });

  it('registra un cliente nuevo y confirma con "Cliente guardado"', async () => {
    await seed(MARIA);
    await openScreen();
    await click('Nuevo cliente');
    await body().get('#client-name').setValue('Cliente Nuevo Ejemplo');
    await body().get('#client-defaultPercentage').setValue('97');
    await body().get('form').trigger('submit');
    await flushPromises();
    await eventually(() => expect(bodyText()).toContain('Cliente guardado'));
    await eventually(() => expect(rowOf('Cliente Nuevo Ejemplo')?.text()).toContain('97,0 %'));
    expect(await clientsRepository.list()).toHaveLength(2);
  });

  it('no guarda un cliente inválido y señala el campo a corregir', async () => {
    await openScreen();
    await click('Registrar el primer cliente');
    await body().get('form').trigger('submit');
    await flushPromises();
    expect(bodyText()).toContain('Escribe al menos 2 caracteres');
    expect(await clientsRepository.list()).toHaveLength(0);
  });

  it('edita un cliente desde su fila', async () => {
    await seed(MARIA);
    await openScreen();
    await click('Editar María Pérez');
    const name = body().get('#client-name');
    expect((name.element as HTMLInputElement).value).toBe('María Pérez');
    await name.setValue('María Pérez de Ejemplo');
    await body().get('form').trigger('submit');
    await flushPromises();
    await eventually(() => expect(rowOf('María Pérez de Ejemplo')).toBeDefined());
    expect(await clientsRepository.list()).toHaveLength(1);
  });

  it('si no se puede guardar, lo dice y deja el diálogo abierto', async () => {
    vi.spyOn(clientsRepository, 'create').mockRejectedValue(new Error('falló'));
    await openScreen();
    await click('Registrar el primer cliente');
    await body().get('#client-name').setValue('Cliente Ejemplo');
    await body().get('form').trigger('submit');
    await flushPromises();
    await eventually(() => expect(bodyText()).toContain('No se pudo guardar el cliente'));
    expect(bodyText()).toContain('Tus datos siguen en el formulario: vuelve a intentarlo.');
    expect((body().get('#client-name').element as HTMLInputElement).value).toBe('Cliente Ejemplo');
    expect(body().find('#client-name').exists()).toBe(true);
  });
});

describe('búsqueda de clientes', { timeout: 20_000 }, () => {
  it('filtra por nombre sin importar acentos y deja la búsqueda en la URL', async () => {
    await seed(MARIA, COMPRADORA);
    const { router } = await openScreen();
    await body().get('#clients-search').setValue('maria');
    await flushPromises();
    expect(router.currentRoute.value.query['q']).toBe('maria');
    expect(rowOf('Compradora')).toBeUndefined();
    expect(bodyText()).toContain('1 de 2 clientes');
  });

  it('no guarda en la URL una búsqueda de solo espacios ni le borra el espacio al que escribe', async () => {
    await seed(MARIA, COMPRADORA);
    const { router } = await openScreen();
    const input = body().get('#clients-search');
    await input.setValue('   ');
    await flushPromises();
    expect(router.currentRoute.value.query['q']).toBeUndefined();
    await input.setValue('maría ');
    await flushPromises();
    expect(router.currentRoute.value.query['q']).toBe('maría');
    expect((input.element as HTMLInputElement).value).toBe('maría ');
  });

  it('si la URL cambia desde fuera, la búsqueda la sigue', async () => {
    await seed(MARIA, COMPRADORA);
    const { router } = await openScreen('/clientes?q=maria');
    await router.push('/clientes');
    await flushPromises();
    expect((body().get('#clients-search').element as HTMLInputElement).value).toBe('');
    expect(bodyText()).toContain('2 de 2 clientes');
  });

  it('al recargar con ?q= conserva la búsqueda, también por documento', async () => {
    await seed(MARIA, COMPRADORA);
    await openScreen('/clientes?q=12345678');
    expect((body().get('#clients-search').element as HTMLInputElement).value).toBe('12345678');
    expect(rowOf('María Pérez')).toBeDefined();
    expect(rowOf('Compradora')).toBeUndefined();
  });

  it('sin resultados lo dice y permite limpiar la búsqueda', async () => {
    await seed(MARIA);
    const { router } = await openScreen('/clientes?q=zzz');
    expect(bodyText()).toContain('Ningún cliente coincide con “zzz”');
    await click('Limpiar búsqueda');
    expect(router.currentRoute.value.query['q']).toBeUndefined();
    expect(rowOf('María Pérez')).toBeDefined();
  });
});

describe('desactivar y reactivar clientes', { timeout: 20_000 }, () => {
  it('pide confirmación antes de desactivar y deja al cliente en la lista como inactivo', async () => {
    await seed(MARIA);
    await openScreen();
    await click('Desactivar María Pérez');
    expect(bodyText()).toContain('seguirá en la lista, marcado como inactivo');
    await click('Desactivar cliente');
    await eventually(() => expect(bodyText()).toContain('Cliente desactivado'));
    await eventually(() => expect(rowOf('María Pérez')?.text()).toContain('Inactivo'));
    expect(rowOf('María Pérez')?.classes()).toContain('bg-surface-50!');
    expect(rowOf('María Pérez')?.classes()).not.toContain('opacity-60');
  });

  it('si se cancela la confirmación, el cliente sigue activo', async () => {
    await seed(MARIA);
    await openScreen();
    await click('Desactivar María Pérez');
    await click('Cancelar');
    expect((await clientsRepository.list())[0]?.active).toBe(true);
  });

  it('reactiva un cliente inactivo, también con confirmación', async () => {
    const [maria] = await seed(MARIA);
    await clientsRepository.update(maria?.id ?? '', { active: false });
    await openScreen();
    await click('Reactivar María Pérez');
    await click('Reactivar cliente');
    await eventually(() => expect(bodyText()).toContain('Cliente reactivado'));
    await eventually(() => expect(rowOf('María Pérez')?.text()).toContain('Activo'));
  });

  it('si no se puede desactivar, lo dice', async () => {
    await seed(MARIA);
    vi.spyOn(clientsRepository, 'update').mockRejectedValue(new Error('falló'));
    await openScreen();
    await click('Desactivar María Pérez');
    await click('Desactivar cliente');
    await eventually(() => expect(bodyText()).toContain('No se pudo desactivar el cliente'));
    expect(bodyText()).toContain('Su estado no cambió');
  });
});

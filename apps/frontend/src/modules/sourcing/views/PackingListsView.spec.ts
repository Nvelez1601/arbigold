import type { Client } from '@arbigold/shared-types';
import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import Select from 'primevue/select';
import { afterEach, beforeEach, describe, expect, it, vi, beforeAll } from 'vitest';
import { mountWithApp } from '../../../../test/support/mount.ts';
import { clientsRepository, packingListsRepository } from '../../../shared/data/repositories.ts';
import PackingListsView from './PackingListsView.vue';

/** Monta PrimeVue y el router completos: con la máquina cargada, 5 s no alcanzan. */
vi.setConfig({ testTimeout: 30_000 });

/** mountWithApp navega con el router real: se precargan sus pantallas para no medir el import en frío. */
beforeAll(async () => {
  await Promise.all([
    import('../../../app/views/PanelView.vue'),
    import('./PackingListEditorView.vue'),
  ]);
}, 60_000);

enableAutoUnmount(afterEach);

/** jsdom no trae matchMedia y el Select de PrimeVue lo consulta para su panel. */
window.matchMedia = (media: string) =>
  ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
  }) as unknown as MediaQueryList;

/** Node 26 trae su propio localStorage vacío: los tests instalan uno en memoria y parten de cero. */
beforeEach(async () => {
  for (const repository of [clientsRepository, packingListsRepository]) {
    for (const record of await repository.list()) await repository.remove(record.id);
  }
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    },
  });
});

/** Datos ficticios: tres piezas en tres escalas de ley, más una viruta que no suma. */
const seed = async () => {
  const north = await clientsRepository.create({ name: 'Cliente Norte', kind: 'PERSONA' });
  const south = await clientsRepository.create({ name: 'Cliente Sur', kind: 'EMPRESA' });
  const older = await packingListsRepository.create({
    clientId: north.id,
    issuedOn: '2026-11-10',
    pieces: [
      { number: 1, grossWeight: '1000', fineness: '950' },
      { number: 2, grossWeight: '2000', fineness: '0.9' },
      { number: 3, grossWeight: '1500.5', fineness: '92' },
    ],
    residues: [{ kind: 'VIRUTA', fromPieces: [1], grossWeight: '25' }],
  });
  const newer = await packingListsRepository.create({
    clientId: south.id,
    issuedOn: '2026-11-15',
    pieces: [{ number: 1, grossWeight: '500', fineness: '920' }],
  });
  await packingListsRepository.update(newer.id, { status: 'RECIBIDO' });
  return { north, south, older, newer };
};

const mountList = (route = '/packing-lists') => mountWithApp(PackingListsView, { route });
type Mounted = Awaited<ReturnType<typeof mountList>>;
const tableRows = ({ wrapper }: Mounted) =>
  wrapper.findAll('tbody tr').map((row) => row.findAll('td').map((cell) => cell.text()));

describe('PackingListsView', () => {
  it('sin clientes invita a registrar uno primero', async () => {
    const { wrapper } = await mountList();
    expect(wrapper.get('h1').text()).toBe('Packing lists');
    expect(wrapper.text()).toContain('Primero registra un cliente');
    expect(wrapper.get('a[href="/clientes"]').text()).toBe('Ir a clientes');
  });

  it('con clientes y sin packing lists invita a crear el primero', async () => {
    await clientsRepository.create({ name: 'Cliente Norte', kind: 'PERSONA' });
    const { wrapper } = await mountList();
    expect(wrapper.text()).toContain('Todavía no hay packing lists');
    expect(wrapper.findAll('a[href="/packing-lists/nuevo"]').length).toBe(2);
  });

  it('lista fecha, cliente, piezas, pesos y estado; la viruta no suma', async () => {
    await seed();
    const mounted = await mountList();
    expect(mounted.wrapper.findAll('th').map((th) => th.text())).toEqual([
      'Fecha',
      'Cliente',
      'Piezas',
      'Peso bruto',
      'Peso fino',
      'Estado',
    ]);
    const [newer, older] = tableRows(mounted);
    expect(newer).toEqual([
      expect.stringMatching(/^15 nov/),
      'Cliente Sur',
      '1',
      '500,00 g',
      '460,00 g',
      'Recibido',
    ]);
    expect(older).toEqual([
      expect.stringMatching(/^10 nov/),
      'Cliente Norte',
      '3',
      '4.500,50 g',
      '4.130,46 g',
      'Borrador',
    ]);
  });

  it('el botón de alta lleva a un packing list nuevo', async () => {
    await seed();
    const { wrapper } = await mountList();
    const link = wrapper.get('header a');
    expect(link.text()).toBe('Nuevo packing list');
    expect(link.attributes('href')).toBe('/packing-lists/nuevo');
  });

  it('filtra por cliente y por estado desde la URL', async () => {
    const { north } = await seed();
    const byClient = await mountList(`/packing-lists?cliente=${north.id}`);
    expect(tableRows(byClient).map((row) => row[1])).toEqual(['Cliente Norte']);
    byClient.wrapper.unmount();
    const byStatus = await mountList('/packing-lists?estado=RECIBIDO');
    expect(tableRows(byStatus).map((row) => row[1])).toEqual(['Cliente Sur']);
  });

  it('al elegir un filtro lo escribe en la URL', async () => {
    const { south } = await seed();
    const mounted = await mountList();
    const [clientSelect, statusSelect] = mounted.wrapper.findAllComponents(Select);
    clientSelect?.vm.$emit('update:modelValue', south.id);
    await flushPromises();
    statusSelect?.vm.$emit('update:modelValue', 'BORRADOR');
    await flushPromises();
    expect(mounted.router.currentRoute.value.query).toEqual({
      cliente: south.id,
      estado: 'BORRADOR',
    });
    expect(mounted.wrapper.text()).toContain('Ningún packing list coincide con los filtros');
    clientSelect?.vm.$emit('update:modelValue', null);
    await flushPromises();
    expect(mounted.router.currentRoute.value.query).toEqual({ estado: 'BORRADOR' });
  });

  it('no guarda en la URL filtros vacíos ni solo espacios', async () => {
    await seed();
    const mounted = await mountList('/packing-lists?cliente=%20%20');
    expect(tableRows(mounted)).toHaveLength(2);
    const [clientSelect] = mounted.wrapper.findAllComponents(Select);
    clientSelect?.vm.$emit('update:modelValue', '   ');
    await flushPromises();
    expect(mounted.router.currentRoute.value.query).toEqual({});
  });

  it('nombra cada filtro para los lectores de pantalla', async () => {
    await seed();
    const { wrapper } = await mountList();
    expect(wrapper.findAll('[role="combobox"]').map((c) => c.attributes('aria-label'))).toEqual([
      'Filtrar por cliente',
      'Filtrar por estado',
    ]);
  });

  it('quitar filtros limpia la URL', async () => {
    await seed();
    const mounted = await mountList('/packing-lists?estado=CONCILIADO');
    expect(tableRows(mounted)).toEqual([]);
    const clear = mounted.wrapper.findAll('button').find((b) => b.text() === 'Quitar filtros');
    await clear?.trigger('click');
    await flushPromises();
    expect(mounted.router.currentRoute.value.query).toEqual({});
    expect(tableRows(mounted)).toHaveLength(2);
  });

  it('abre el packing list al hacer clic en la fila o en su fecha', async () => {
    const { older } = await seed();
    const mounted = await mountList();
    const push = vi.spyOn(mounted.router, 'push').mockResolvedValue(undefined);
    await mounted.wrapper.findAll('tbody tr')[1]?.trigger('click');
    expect(push).toHaveBeenCalledWith(`/packing-lists/${older.id}`);
    expect(mounted.wrapper.find(`a[href="/packing-lists/${older.id}"]`).exists()).toBe(true);
  });

  it('nombra al cliente aunque ya no exista en el registro', async () => {
    const { north } = await seed();
    await clientsRepository.remove((north satisfies Client).id);
    const mounted = await mountList();
    expect(tableRows(mounted).map((row) => row[1])).toContain('Cliente sin registro');
  });
});

import { type VueWrapper, flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountWithApp } from '../../../test/support/mount.ts';
import {
  clientsRepository,
  exportsRepository,
  operationsRepository,
  packingListsRepository,
  suppliersRepository,
} from '../../shared/data/repositories.ts';
import PanelView from './PanelView.vue';
import PanelChart from './panel/PanelChart.vue';

let mounted: VueWrapper | undefined;

const repos = [
  clientsRepository,
  suppliersRepository,
  operationsRepository,
  packingListsRepository,
  exportsRepository,
] as const;

/** Node 26 trae su propio localStorage: se instala uno en memoria y se limpian las colecciones. */
beforeEach(async () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    },
  });
  for (const repository of repos) {
    for (const record of await repository.list()) await repository.remove(record.id);
  }
});

afterEach(() => {
  mounted?.unmount();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

const seed = async () => {
  const supplier = await suppliersRepository.create({
    name: 'Fondos Ejemplo',
    kind: 'FONDEO',
    currency: 'USD',
    defaultPercentage: '93.5',
    country: 'Panamá',
  });
  const client = await clientsRepository.create({
    name: 'Compradora Ejemplo',
    kind: 'EMPRESA',
    documentId: 'J-00000000-1',
    defaultPercentage: '96.5',
  });
  await operationsRepository.create({
    supplierId: supplier.id,
    clientId: client.id,
    closedOn: '2026-11-10',
    amount: '1000',
    currency: 'USD',
    internationalPricePerOunce: '2000',
    clientPercentage: '97',
    supplierPercentage: '93',
  });
  await packingListsRepository.create({
    clientId: client.id,
    issuedOn: '2026-11-11',
    pieces: [{ number: 1, grossWeight: '100', fineness: '995' }],
  });
  return { supplier, client };
};

const openPanel = async () => {
  const app = await mountWithApp(PanelView);
  mounted = app.wrapper;
  return app;
};

describe('PanelView', { timeout: 20_000 }, () => {
  it('presenta el flujo de la operación en orden, con enlaces a cada módulo', async () => {
    const { wrapper } = await openPanel();
    const links = wrapper.findAll('ol a');
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/proveedores',
      '/clientes',
      '/operaciones',
      '/packing-lists',
      '/exportaciones',
    ]);
    expect(links[0]?.text()).toContain('1');
  });

  it('sin datos muestra los indicadores en cero e invita a empezar', async () => {
    const { wrapper } = await openPanel();
    const text = wrapper.text();
    expect(text).toContain('Oro por entregar');
    expect(text).toContain('0,00 g');
    expect(text).toContain('Packing lists por recibir');
    expect(text).toContain('Aún no hay operaciones registradas.');
    expect(text).toContain('Empieza por aquí');
    expect(wrapper.find('a[href="/proveedores"]').text()).toContain('Registrar proveedor');
  });

  it('con datos resume oro, margen, packing lists y los últimos movimientos', async () => {
    await seed();
    const { wrapper } = await openPanel();
    const text = wrapper.text();
    expect(text).toContain('Oro por entregar');
    expect(text).toContain('Margen abierto');
    expect(text).toContain('Packing lists por recibir');
    expect(text).toContain('Exportaciones activas');
    expect(text).toContain('Compradora Ejemplo');
    expect(text).toContain('Fondos Ejemplo');
    expect(text).toContain('Abierta');
    expect(text).toContain('Packing lists sin recibir');
    expect(text).not.toContain('Empieza por aquí');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
  });

  it('si la carga falla, lo dice y ofrece reintentar', async () => {
    vi.spyOn(operationsRepository, 'list').mockRejectedValue(new Error('sin conexión'));
    const { wrapper } = await openPanel();
    expect(wrapper.text()).toContain('No se pudo cargar el resumen.');
    expect(wrapper.find('button').text()).toBe('Reintentar');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('No se pudo cargar el resumen.');
  });

  it('el gráfico muestra un punto por operación abierta o cerrada', async () => {
    await seed();
    const { wrapper } = await openPanel();
    expect(wrapper.findComponent(PanelChart).findAll('rect')).toHaveLength(2);
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Proveedor');
  });
});

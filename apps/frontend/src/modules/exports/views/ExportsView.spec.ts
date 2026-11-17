import type { ExportInput } from '@arbigold/shared-types';
import { type VueWrapper, enableAutoUnmount, flushPromises } from '@vue/test-utils';
import ConfirmDialog from 'primevue/confirmdialog';
import Select from 'primevue/select';
import Toast from 'primevue/toast';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountWithApp } from '../../../../test/support/mount.ts';
import {
  clientsRepository,
  exportsRepository,
  packingListsRepository,
  suppliersRepository,
} from '../../../shared/data/repositories.ts';
import { formatDate } from '../../../shared/utils/format.ts';
import ExportsView from './ExportsView.vue';

/** La pantalla real convive con el diálogo de confirmación y los toasts de App. */
const Host = defineComponent({ render: () => [h(ExportsView), h(ConfirmDialog), h(Toast)] });

/** 8000 g a 900 ‰ (7200 g) + 3500 g a 800 ‰ (2800 g) = 10 000 g finos. Datos ficticios. */
const TEN_KILO_PIECES = [
  { number: 1, grossWeight: '8000', fineness: '900' },
  { number: 2, grossWeight: '3500', fineness: '800' },
];
const ALL_REPOSITORIES = [
  clientsRepository,
  suppliersRepository,
  packingListsRepository,
  exportsRepository,
];

enableAutoUnmount(afterEach);
afterEach(() => {
  vi.restoreAllMocks();
});
beforeAll(() => {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as never;
});
/** Node 26 trae su propio localStorage vacío: se instala uno en memoria y se vacía cada test. */
beforeEach(async () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    },
  });
  for (const repository of ALL_REPOSITORIES) {
    const records = await repository.list();
    await Promise.all(records.map((record) => repository.remove(record.id)));
  }
});

const seedSupplier = (kind: 'TERCEROS' | 'FONDEO' = 'TERCEROS') =>
  suppliersRepository.create({
    name: 'Comprador Ficticio',
    kind,
    currency: 'USDT',
    defaultPercentage: '2',
  });

const seedPackingList = async (status: 'RECIBIDO' | 'BORRADOR' = 'RECIBIDO', exportId?: string) => {
  const client = await clientsRepository.create({ name: 'Cliente Ficticio', kind: 'PERSONA' });
  const list = await packingListsRepository.create({
    clientId: client.id,
    issuedOn: '2026-11-10',
    pieces: TEN_KILO_PIECES,
  });
  return packingListsRepository.update(list.id, { status, ...(exportId ? { exportId } : {}) });
};

const seedExport = async (
  overrides: Partial<ExportInput> & { status?: 'DOCUMENTACION' | 'ENVIADA' },
) => {
  const supplier = await seedSupplier();
  const list = await seedPackingList();
  const { status, ...input } = overrides;
  const created = await exportsRepository.create({
    supplierId: supplier.id,
    shippedOn: '2026-11-17',
    destination: 'Refinería ficticia',
    packingListIds: [list.id],
    grossProfitPercentage: '2',
    ...input,
  });
  await packingListsRepository.update(list.id, { status: 'EN_EXPORTACION', exportId: created.id });
  return status ? exportsRepository.update(created.id, { status }) : created;
};

const render = async (route = '/exportaciones') => {
  const mounted = await mountWithApp(Host, { route });
  await vi.dynamicImportSettled();
  await flushPromises();
  return mounted;
};
const body = () => document.body.textContent ?? '';
const buttonNamed = (label: string, scope: ParentNode = document) =>
  [...scope.querySelectorAll('button')].find((button) => button.textContent?.trim() === label);
const confirmDialog = () => document.querySelector('.p-confirmdialog') ?? document.body;
const statusOf = async (exportId: string) => (await exportsRepository.get(exportId))?.status;
const openAndFill = async (wrapper: VueWrapper, ids: { supplier: string; list: string }) => {
  buttonNamed('Nueva exportación')?.click();
  await flushPromises();
  selectById(wrapper, 'export-supplier')?.vm.$emit('update:modelValue', ids.supplier);
  await flushPromises();
  document.querySelector<HTMLLabelElement>(`label[for="export-packing-list-${ids.list}"]`)?.click();
  await flushPromises();
};
const submitButton = () => document.querySelector<HTMLButtonElement>('button[type="submit"]');
const selectById = (wrapper: VueWrapper, inputId: string) =>
  wrapper.findAllComponents(Select).find((select) => select.props('inputId') === inputId);

describe('ExportsView: estados vacíos', { timeout: 20_000 }, () => {
  it('sin proveedores explica por qué y lleva a registrarlos', async () => {
    const { wrapper } = await render();
    expect(wrapper.get('h1').text()).toBe('Exportaciones');
    expect(body()).toContain('Primero registra un proveedor');
    expect(wrapper.get('a[href="/proveedores"]').text()).toBe('Ir a proveedores');
  });

  it('sin packing lists recibidos pide marcarlos como recibidos', async () => {
    await seedSupplier();
    await seedPackingList('BORRADOR');
    const { wrapper } = await render();
    expect(body()).toContain('No hay packing lists recibidos para exportar');
    expect(wrapper.get('a[href="/packing-lists"]').text()).toBe('Ir a packing lists');
  });

  it('con todo listo y sin exportaciones invita a crear la primera', async () => {
    await seedSupplier();
    await seedPackingList();
    await render();
    expect(body()).toContain('Aún no hay exportaciones');
    buttonNamed('Nueva exportación', document.querySelector('section') ?? document)?.click();
    await flushPromises();
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Nueva exportación');
  });
});

describe('ExportsView: nueva exportación', { timeout: 20_000 }, () => {
  it('solo ofrece packing lists RECIBIDOS sin exportación asignada', async () => {
    await seedSupplier();
    const available = await seedPackingList();
    await seedPackingList('BORRADOR');
    await seedPackingList('RECIBIDO', 'otra-exportacion');
    await render();
    buttonNamed('Nueva exportación')?.click();
    await flushPromises();
    const boxes = document.querySelectorAll<HTMLInputElement>('input[name="packingListIds"]');
    expect([...boxes].map((box) => box.value)).toEqual([available.id]);
  });

  it('al guardar marca los packing lists EN_EXPORTACION con la exportación y muestra 70 g netos', async () => {
    const supplier = await seedSupplier();
    const list = await seedPackingList();
    const { wrapper } = await render();
    buttonNamed('Nueva exportación')?.click();
    await flushPromises();
    selectById(wrapper, 'export-supplier')?.vm.$emit('update:modelValue', supplier.id);
    await flushPromises();
    document
      .querySelector<HTMLLabelElement>(`label[for="export-packing-list-${list.id}"]`)
      ?.click();
    await flushPromises();
    document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await flushPromises();

    const [created] = await exportsRepository.list();
    expect(created).toMatchObject({ supplierId: supplier.id, settlementMode: 'UTILIDAD' });
    expect(await packingListsRepository.get(list.id)).toMatchObject({
      status: 'EN_EXPORTACION',
      exportId: created?.id,
    });
    expect(body()).toContain('Exportación registrada');
    const net = wrapper.get('[data-test="export-row"] [data-test="net"] span');
    expect(net.text()).toBe('70,00 g');
    expect(net.classes()).toContain('text-success');
  });

  it('si no se puede guardar lo avisa sin cerrar el formulario', async () => {
    const supplier = await seedSupplier();
    const list = await seedPackingList();
    vi.spyOn(exportsRepository, 'create').mockRejectedValueOnce(new Error('sin conexión'));
    const { wrapper } = await render();
    buttonNamed('Nueva exportación')?.click();
    await flushPromises();
    selectById(wrapper, 'export-supplier')?.vm.$emit('update:modelValue', supplier.id);
    await flushPromises();
    document
      .querySelector<HTMLLabelElement>(`label[for="export-packing-list-${list.id}"]`)
      ?.click();
    await flushPromises();
    document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await flushPromises();
    expect(body()).toContain('No se pudo registrar la exportación');
    expect(body()).toContain('Tus datos siguen en el formulario');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});

describe('ExportsView: diálogo', { timeout: 20_000 }, () => {
  it('mientras guarda, el botón dice "Guardando…" y queda deshabilitado', async () => {
    const supplier = await seedSupplier();
    const list = await seedPackingList();
    let finish: (value: unknown) => void = () => {};
    const realCreate = exportsRepository.create.bind(exportsRepository);
    vi.spyOn(exportsRepository, 'create').mockImplementationOnce(
      (input) => new Promise((resolve) => (finish = () => resolve(realCreate(input)))),
    );
    const { wrapper } = await render();
    await openAndFill(wrapper, { supplier: supplier.id, list: list.id });
    submitButton()?.click();
    await flushPromises();
    expect(submitButton()?.textContent).toContain('Guardando…');
    expect(submitButton()?.disabled).toBe(true);
    finish(undefined);
    await flushPromises();
    expect(body()).toContain('Exportación registrada');
  });

  it('reabrir el diálogo lo trae limpio, sin datos ni errores', async () => {
    await seedSupplier();
    await seedPackingList();
    await render();
    buttonNamed('Nueva exportación')?.click();
    await flushPromises();
    submitButton()?.click();
    await flushPromises();
    expect(body()).toContain('Elige el proveedor que recibe el oro');
    const destination = document.getElementById('export-destination') as HTMLInputElement;
    destination.value = 'Refinería ficticia';
    destination.dispatchEvent(new Event('input'));
    await flushPromises();
    buttonNamed('Cancelar')?.click();
    await flushPromises();
    buttonNamed('Descartar y cerrar')?.click();
    await flushPromises();

    buttonNamed('Nueva exportación')?.click();
    await flushPromises();
    expect((document.getElementById('export-destination') as HTMLInputElement).value).toBe('');
    expect(body()).not.toContain('Elige el proveedor que recibe el oro');
  });

  it('el filtro de estado tiene nombre accesible', async () => {
    await seedExport({});
    await render();
    const filter = document.getElementById('export-status-filter');
    const labelId = filter?.getAttribute('aria-labelledby') ?? '';
    expect(document.getElementById(labelId)?.textContent?.trim()).toBe('Estado');
  });
});

describe('ExportsView: tabla', { timeout: 20_000 }, () => {
  it('muestra fecha, proveedor, destino, packing lists, piezas, fino y estado', async () => {
    await seedExport({});
    const { wrapper } = await render();
    const cells = wrapper.findAll('[data-test="export-row"] td').map((cell) => cell.text());
    expect(cells.slice(0, 6)).toEqual([
      formatDate('2026-11-17'),
      'Comprador Ficticio',
      'Refinería ficticia',
      '1',
      '2',
      '10.000,00 g',
    ]);
    expect(cells[7]).toBe('Preparación');
    expect(body()).toContain('No quedan packing lists recibidos sin exportar');
  });

  it('una utilidad negativa (10 000 g al 1 %) se muestra tal cual, en rojo', async () => {
    await seedExport({ grossProfitPercentage: '1' });
    const { wrapper } = await render();
    const net = wrapper.get('[data-test="net"] span');
    expect(net.text()).toBe('-30,00 g');
    expect(net.classes()).toContain('text-danger');
  });

  it('el cobro total y la falta de % se indican en vez de inventar una utilidad', async () => {
    await seedExport({ settlementMode: 'COBRO_TOTAL' });
    await seedExport({ grossProfitPercentage: undefined });
    const { wrapper } = await render();
    const nets = wrapper.findAll('[data-test="net"]').map((cell) => cell.text());
    expect(nets).toEqual(expect.arrayContaining(['Cobro total', 'Sin % negociado']));
  });

  it('el filtro por estado vive en la URL', async () => {
    await seedExport({ status: 'ENVIADA', destination: 'Destino enviado' });
    await seedExport({ destination: 'Destino en preparación' });
    const { wrapper, router } = await render('/exportaciones?estado=ENVIADA');
    expect(wrapper.findAll('[data-test="export-row"]')).toHaveLength(1);
    expect(body()).toContain('Destino enviado');

    selectById(wrapper, 'export-status-filter')?.vm.$emit('update:modelValue', 'LIQUIDADA');
    await flushPromises();
    expect(router.currentRoute.value.query).toEqual({ estado: 'LIQUIDADA' });
    expect(body()).toContain('No hay exportaciones en este estado');

    selectById(wrapper, 'export-status-filter')?.vm.$emit('update:modelValue', '   ');
    await flushPromises();
    expect(router.currentRoute.value.query).toEqual({});
    expect(wrapper.findAll('[data-test="export-row"]')).toHaveLength(2);
  });
});

describe('ExportsView: avance de estados', { timeout: 20_000 }, () => {
  it('pide confirmación nombrando el estado destino y, al enviar, sus packing lists quedan EXPORTADOS', async () => {
    const record = await seedExport({ status: 'DOCUMENTACION' });
    await render();
    buttonNamed('Pasar a Enviada')?.click();
    await flushPromises();
    const dialog = confirmDialog();
    expect(dialog.textContent).toContain('Pasar a “Enviada”');
    expect(dialog.textContent).toContain('quedarán como exportados');

    buttonNamed('Pasar a Enviada', dialog)?.click();
    await flushPromises();
    expect(await statusOf(record.id)).toBe('ENVIADA');
    const lists = await packingListsRepository.list();
    expect(lists.map((list) => list.status)).toEqual(['EXPORTADO']);
    expect(body()).toContain('Exportación en “Enviada”');
  });

  it('cancelar la confirmación no cambia el estado', async () => {
    const record = await seedExport({});
    await render();
    buttonNamed('Pasar a Documentación')?.click();
    await flushPromises();
    buttonNamed('Cancelar', confirmDialog())?.click();
    await flushPromises();
    expect(await statusOf(record.id)).toBe('PREPARACION');
  });

  it('si no se puede avanzar lo avisa y la exportación sigue en su estado', async () => {
    const record = await seedExport({});
    vi.spyOn(exportsRepository, 'update').mockRejectedValueOnce(new Error('sin conexión'));
    await render();
    buttonNamed('Pasar a Documentación')?.click();
    await flushPromises();
    buttonNamed('Pasar a Documentación', confirmDialog())?.click();
    await flushPromises();
    expect(body()).toContain('No se pudo pasar la exportación a “Documentación”');
    expect(await statusOf(record.id)).toBe('PREPARACION');
  });
});

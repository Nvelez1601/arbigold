import type { OperationInput } from '@arbigold/shared-types';
import { DOMWrapper, type VueWrapper, flushPromises } from '@vue/test-utils';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountWithApp } from '../../../../test/support/mount.ts';
import {
  clientsRepository,
  operationsRepository,
  suppliersRepository,
} from '../../../shared/data/repositories.ts';
import OperationsView from './OperationsView.vue';

/** La pantalla tal como la ve el usuario: con el diálogo de confirmación y los toasts de App. */
const Screen = defineComponent({
  render: () => [h(OperationsView), h(ConfirmDialog), h(Toast)],
});

const mounted: VueWrapper[] = [];
const render = async () => {
  const { wrapper } = await mountWithApp(Screen, { route: '/operaciones' });
  mounted.push(wrapper);
  await flushPromises();
  return wrapper;
};
const bodyText = () => document.body.textContent ?? '';
const buttonByText = (label: string) => {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`No hay botón "${label}"`);
  return button;
};
const click = async (label: string) => {
  buttonByText(label).click();
  await flushPromises();
};

/** Datos ficticios: ni nombres ni montos reales. */
const seedParties = async () => {
  const supplier = await suppliersRepository.create({
    name: 'Proveedor Ficticio',
    kind: 'FONDEO',
    currency: 'USDT',
    defaultPercentage: '97',
  });
  const client = await clientsRepository.create({
    name: 'Cliente Ficticio',
    kind: 'PERSONA',
    defaultPercentage: '96',
  });
  return { supplierId: supplier.id, clientId: client.id };
};
const closure = (parties: { supplierId: string; clientId: string }): OperationInput => ({
  ...parties,
  closedOn: '2026-11-10',
  amount: '100000',
  currency: 'USDT',
  internationalPricePerOunce: '2000',
  clientPercentage: '96',
  supplierPercentage: '97',
});

beforeAll(() => {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList;
  globalThis.ResizeObserver = class {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
  };
});

/** Node 26 trae su propio localStorage vacío: cada test arranca con uno en memoria y vacío. */
beforeEach(async () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    },
  });
  const repositories = [operationsRepository, clientsRepository, suppliersRepository] as const;
  for (const repository of repositories) {
    for (const record of await repository.list()) await repository.remove(record.id);
  }
});

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

/** Monta la app completa (router, PrimeVue, vue-query): con la suite en paralelo puede tardar. */
describe('OperationsView', { timeout: 20_000 }, () => {
  it('sin clientes ni proveedores explica que la operación necesita ambos y enlaza a sus pantallas', async () => {
    const wrapper = await render();
    expect(wrapper.get('h1').text()).toBe('Operaciones');
    expect(bodyText()).toContain('Necesitas un cliente y un proveedor de fondeo activos');
    const links = wrapper.findAll('a').map((link) => link.attributes('href'));
    expect(links).toEqual(expect.arrayContaining(['/clientes', '/proveedores']));
    expect(buttonByText('Nueva operación').disabled).toBe(true);
  });

  it('con un proveedor pero sin clientes sigue pidiendo el cliente', async () => {
    await suppliersRepository.create({
      name: 'Proveedor Ficticio',
      kind: 'FONDEO',
      currency: 'USD',
    });
    await render();
    expect(bodyText()).toContain('Necesitas un cliente y un proveedor de fondeo activos');
  });

  it('con partes registradas y sin operaciones invita a crear la primera', async () => {
    await seedParties();
    await render();
    expect(bodyText()).toContain('Todavía no hay operaciones');
    const buttons = [...document.querySelectorAll('button')].filter(
      (button) => button.textContent?.trim() === 'Nueva operación',
    );
    expect(buttons).toHaveLength(2);
    buttons[1]?.click();
    await flushPromises();
    expect(document.querySelector('[data-testid="closure-preview"]')).not.toBeNull();
  });

  it('lista cada cierre con sus gramos, margen en verde, estado y totales de las abiertas', async () => {
    const parties = await seedParties();
    await operationsRepository.create(closure(parties));
    const wrapper = await render();
    const text = wrapper.text().replace(/\s+/g, ' ');
    expect(text).toContain('Cliente Ficticio');
    expect(text).toContain('Proveedor Ficticio');
    expect(text).toContain('100.000,00 USDT');
    expect(text).toContain('2.000,00 USD');
    expect(text).toContain('96,0 %');
    expect(text).toContain('1.619,97 g');
    expect(text).toContain('1.603,27 g');
    expect(text).toContain('Abierta');
    expect(text).toContain('Abiertas (1)');
    const margin = wrapper.get('[data-testid="row-margin"]');
    expect(margin.text()).toBe('16,70 g');
    expect(margin.classes()).toContain('text-success');
    expect(wrapper.get('[data-testid="total-margin"]').text()).toBe('16,70 g');
  });

  it('marca en rojo un margen negativo', async () => {
    const parties = await seedParties();
    await operationsRepository.create({ ...closure(parties), clientPercentage: '98' });
    const wrapper = await render();
    const margin = wrapper.get('[data-testid="row-margin"]');
    expect(margin.text()).toMatch(/^-/);
    expect(margin.classes()).toContain('text-danger');
  });

  it('registra una operación desde el diálogo y lo confirma con un toast', async () => {
    const parties = await seedParties();
    await operationsRepository.create(closure(parties));
    await render();
    await click('Nueva operación');
    const field = (id: string) =>
      new DOMWrapper(document.getElementById(`operation-${id}`) as HTMLElement);
    const choose = async (id: string, label: string) => {
      if (!document.querySelector('[role="option"]')) await field(id).trigger('click');
      await flushPromises();
      [...document.querySelectorAll<HTMLElement>('[role="option"]')]
        .find((option) => option.textContent?.trim() === label)
        ?.click();
      await flushPromises();
    };
    await choose('supplierId', 'Proveedor Ficticio');
    await choose('clientId', 'Cliente Ficticio');
    await field('amount').setValue('50000');
    await field('internationalPricePerOunce').setValue('4000');
    await click('Registrar operación');
    expect(bodyText()).toContain('Operación registrada');
    expect(await operationsRepository.list()).toHaveLength(2);
  });

  it('si el registro falla lo avisa y deja el diálogo abierto', async () => {
    const parties = await seedParties();
    await operationsRepository.create(closure(parties));
    vi.spyOn(operationsRepository, 'create').mockRejectedValueOnce(new Error('sin conexión'));
    const wrapper = await render();
    const dialog = wrapper.findComponent({ name: 'OperationFormDialog' });
    dialog.vm.$emit('submit', closure(parties));
    await flushPromises();
    expect(bodyText()).toContain('No se pudo registrar la operación');
    expect(bodyText()).toContain('Tus datos siguen en el formulario: vuelve a intentarlo.');
  });

  it('marca una operación como cumplida solo después de confirmar', async () => {
    const parties = await seedParties();
    await operationsRepository.create(closure(parties));
    const wrapper = await render();
    await click('Marcar como cumplida');
    expect(bodyText()).toContain('queda cumplida y deja de sumar en los gramos abiertos');
    expect((await operationsRepository.list())[0]?.status).toBe('ABIERTA');
    const confirmButtons = [...document.querySelectorAll<HTMLButtonElement>('button')].filter(
      (button) => button.textContent?.trim() === 'Marcar como cumplida',
    );
    confirmButtons.at(-1)?.click();
    await flushPromises();
    expect((await operationsRepository.list())[0]?.status).toBe('CUMPLIDA');
    expect(bodyText()).toContain('Operación marcada como cumplida');
    expect(wrapper.text()).toContain('Cumplida');
    expect(wrapper.text()).toContain('Abiertas (0)');
  });

  it('al cancelar pide confirmación; "Volver" no cambia nada y confirmar la cancela', async () => {
    const parties = await seedParties();
    await operationsRepository.create(closure(parties));
    const wrapper = await render();
    await click('Cancelar');
    await click('Volver');
    expect((await operationsRepository.list())[0]?.status).toBe('ABIERTA');
    await click('Cancelar');
    await click('Cancelar operación');
    expect((await operationsRepository.list())[0]?.status).toBe('CANCELADA');
    expect(bodyText()).toContain('Operación cancelada');
    expect(wrapper.text()).toContain('Cancelada');
  });

  it('si el cambio de estado falla lo avisa y la operación sigue abierta', async () => {
    const parties = await seedParties();
    await operationsRepository.create(closure(parties));
    vi.spyOn(operationsRepository, 'update').mockRejectedValueOnce(new Error('sin conexión'));
    await render();
    await click('Cancelar');
    await click('Cancelar operación');
    expect(bodyText()).toContain('No se pudo cambiar el estado');
    expect((await operationsRepository.list())[0]?.status).toBe('ABIERTA');
  });

  it('las operaciones cerradas van con fondo atenuado, sin opacidad y sin acciones', async () => {
    const parties = await seedParties();
    const closed = await operationsRepository.create(closure(parties));
    await operationsRepository.update(closed.id, { status: 'CANCELADA' });
    const wrapper = await render();
    const row = wrapper.get('tbody tr');
    expect(row.classes()).toEqual(expect.arrayContaining(['bg-surface-50!', 'text-muted']));
    expect(row.html()).not.toMatch(/opacity-/);
    expect(row.text()).toContain('Cancelada');
    expect(row.text()).not.toContain('Marcar como cumplida');
    expect(wrapper.text()).toContain('Abiertas (0)');
  });
});

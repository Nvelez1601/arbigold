import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import ConfirmDialog from 'primevue/confirmdialog';
import Select from 'primevue/select';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Toast from 'primevue/toast';
import { type VNode, defineComponent, h } from 'vue';
import { RouterView } from 'vue-router';
import { mountWithApp } from '../../../../test/support/mount.ts';
import { clientsRepository, packingListsRepository } from '../../../shared/data/repositories.ts';
import PackingListEditorView from './PackingListEditorView.vue';

/** Monta PrimeVue y el router completos: con la máquina cargada, 5 s no alcanzan. */
vi.setConfig({ testTimeout: 30_000 });

enableAutoUnmount(afterEach);
afterEach(() => vi.restoreAllMocks());

/** jsdom no trae matchMedia y el Select de PrimeVue lo consulta para su panel. */
window.matchMedia = (media: string) =>
  ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
  }) as unknown as MediaQueryList;

/** La salida del editor carga otra pantalla bajo demanda: se precalienta para no esperar. */
beforeAll(async () => {
  await import('../../../app/views/PanelView.vue');
}, 60_000);

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

/** Como en la app: el editor más el ConfirmDialog (que se teletransporta a document.body). */
const withAppChrome = (content: () => VNode) =>
  defineComponent({ render: () => [content(), h(ConfirmDialog), h(Toast)] });
const mountEditor = async (route = '/packing-lists/nuevo', id?: string) =>
  mountWithApp(
    withAppChrome(() => h(PackingListEditorView, id ? { id } : {})),
    { route },
  );
type Mounted = Awaited<ReturnType<typeof mountEditor>>;

const button = (text: string, scope: ParentNode = document.body) =>
  [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  );
const click = async (element: HTMLElement | undefined) => {
  if (!element) throw new Error('No existe el botón');
  element.click();
  await flushPromises();
};
const confirmButton = (text: string) =>
  button(text, document.body.querySelector('.p-confirmdialog') ?? document.body);
const balance = ({ wrapper }: Mounted) =>
  Object.fromEntries(
    wrapper.findAll('dl > div').map((block) => [block.get('dt').text(), block.get('dd').text()]),
  );
type PieceReading = [number: number, gross: string, ley: string];
const typePiece = async ({ wrapper }: Mounted, [number, gross, ley]: PieceReading) => {
  await wrapper.get(`input[aria-label="Peso bruto de la pieza ${number}"]`).setValue(gross);
  await wrapper.get(`input[aria-label="Ley de la pieza ${number}"]`).setValue(ley);
};
const typeThreePieces = async (mounted: Mounted) => {
  await typePiece(mounted, [1, '1000', '950']);
  await click(button('Agregar pieza'));
  await typePiece(mounted, [2, '2000', '0.9']);
  await click(button('Agregar pieza'));
  await typePiece(mounted, [3, '1500.5', '92']);
};
const chooseClient = async ({ wrapper }: Mounted, id: string) => {
  wrapper.findComponent(Select).vm.$emit('update:modelValue', id);
  await flushPromises();
};
const seedDraft = async () => {
  const client = await clientsRepository.create({ name: 'Cliente Norte', kind: 'PERSONA' });
  const draft = await packingListsRepository.create({
    clientId: client.id,
    issuedOn: '2026-11-10',
    pieces: [{ number: 1, grossWeight: '500', fineness: '920' }],
  });
  return { client, draft };
};

describe('PackingListEditorView: alta', () => {
  it('arranca como borrador con la fecha de hoy y una pieza numerada', async () => {
    const mounted = await mountEditor();
    expect(mounted.wrapper.get('h1').text()).toBe('Nuevo packing list');
    expect(mounted.wrapper.text()).toContain('Borrador');
    const date = mounted.wrapper.get<HTMLInputElement>('input[type="date"]').element.value;
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      mounted.wrapper.get<HTMLInputElement>('input[aria-label="Número de la pieza 1"]').element
        .value,
    ).toBe('1');
    expect(mounted.wrapper.text()).toContain('No hay clientes activos');
  });

  it('la balanza suma 3 piezas con la ley en tres escalas', async () => {
    const mounted = await mountEditor();
    await typeThreePieces(mounted);
    expect(balance(mounted)).toEqual({
      Piezas: '3',
      'Peso bruto': '4.500,50g',
      'Peso fino': '4.130,46g',
    });
  });

  it('la viruta se registra aparte y no cambia el conteo ni los totales', async () => {
    const mounted = await mountEditor();
    await typeThreePieces(mounted);
    const before = balance(mounted);
    await click(button('Registrar viruta o fundición'));
    document.body.querySelector<HTMLInputElement>('input[type="checkbox"][value="2"]')?.click();
    const gross = [...document.body.querySelectorAll('label')]
      .find((label) => label.textContent?.trim().startsWith('Peso bruto'))
      ?.querySelector('input');
    if (gross) gross.value = '15';
    gross?.dispatchEvent(new Event('input'));
    await click(button('Registrar'));
    expect(mounted.wrapper.text()).toContain('Viruta de pieza 2');
    expect(mounted.wrapper.text()).toContain('15,00 g');
    expect(mounted.wrapper.text()).toContain(
      'No suman al conteo ni a los totales: salen de las mismas piezas.',
    );
    expect(balance(mounted)).toEqual(before);
  });

  it('no guarda sin cliente y marca qué corregir', async () => {
    const mounted = await mountEditor();
    await typePiece(mounted, [1, '10.1234', '1200']);
    expect(mounted.wrapper.text()).toContain('Máximo 3 decimales');
    expect(mounted.wrapper.text()).toContain('La ley va entre 0 y 1000 ‰');
    await click(button('Guardar borrador'));
    expect(mounted.wrapper.text()).toContain('Elige el cliente que entrega');
    expect(await packingListsRepository.list()).toEqual([]);
  });

  it('guarda el borrador y pasa a la dirección del packing list', async () => {
    const client = await clientsRepository.create({ name: 'Cliente Norte', kind: 'PERSONA' });
    const mounted = await mountEditor();
    const replace = vi.spyOn(mounted.router, 'replace').mockResolvedValue(undefined);
    await chooseClient(mounted, client.id);
    await typeThreePieces(mounted);
    await click(button('Guardar borrador'));
    const [saved] = await packingListsRepository.list();
    expect(saved).toMatchObject({ clientId: client.id, status: 'BORRADOR' });
    expect(saved?.pieces.map((p) => p.fineness)).toEqual(['950', '0.9', '92']);
    expect(replace).toHaveBeenCalledWith(`/packing-lists/${saved?.id}`);
  });
});

describe('PackingListEditorView: al guardar', () => {
  it('nombra el selector de cliente con su etiqueta visible', async () => {
    const mounted = await mountEditor();
    const combobox = mounted.wrapper.get('[role="combobox"]');
    const labelId = combobox.attributes('aria-labelledby');
    expect(document.getElementById(labelId ?? '')?.textContent).toBe('Cliente');
  });

  it('deshabilita el botón mientras guarda', async () => {
    const client = await clientsRepository.create({ name: 'Cliente Norte', kind: 'PERSONA' });
    vi.spyOn(packingListsRepository, 'create').mockReturnValue(new Promise(() => {}));
    const mounted = await mountEditor();
    await chooseClient(mounted, client.id);
    await typePiece(mounted, [1, '100', '900']);
    button('Guardar borrador')?.click();
    await flushPromises();
    expect(button('Guardar borrador')?.disabled).toBe(true);
    expect(button('Marcar como recibido')?.disabled).toBe(true);
  });

  it('si el guardado falla, lo dice y conserva los datos en pantalla', async () => {
    const client = await clientsRepository.create({ name: 'Cliente Norte', kind: 'PERSONA' });
    vi.spyOn(packingListsRepository, 'create').mockRejectedValue(new Error('sin conexión'));
    const mounted = await mountEditor();
    await chooseClient(mounted, client.id);
    await typePiece(mounted, [1, '100', '900']);
    await click(button('Guardar borrador'));
    expect(document.body.textContent).toContain('No se pudo guardar el packing list');
    expect(document.body.textContent).toContain(
      'Tus datos siguen en pantalla: vuelve a intentarlo.',
    );
    expect(
      mounted.wrapper.get<HTMLInputElement>('input[aria-label="Peso bruto de la pieza 1"]').element
        .value,
    ).toBe('100');
  });

  it('si falta corregir algo, lo avisa sin culpar a la conexión', async () => {
    await mountEditor();
    await click(button('Guardar borrador'));
    expect(document.body.textContent).toContain('Falta corregir el packing list');
    expect(document.body.textContent).toContain('Corrige los campos marcados y vuelve a guardar');
  });

  it('el aviso de éxito repite el verbo de la acción', async () => {
    const { draft } = await seedDraft();
    await mountEditor(`/packing-lists/${draft.id}`, draft.id);
    await click(button('Guardar borrador'));
    expect(document.body.textContent).toContain('Borrador guardado');
  });
});

describe('PackingListEditorView: packing list guardado', () => {
  it('marca como recibido tras confirmar y queda en solo lectura', async () => {
    const { draft } = await seedDraft();
    const mounted = await mountEditor(`/packing-lists/${draft.id}`, draft.id);
    expect(mounted.wrapper.get('h1').text()).toMatch(/^Packing list del 10 nov/);
    await click(button('Marcar como recibido'));
    expect(document.body.textContent).toContain('queda listo para exportar');
    await click(confirmButton('Marcar como recibido'));
    expect((await packingListsRepository.get(draft.id))?.status).toBe('RECIBIDO');
    expect(mounted.wrapper.text()).toContain('Recibido');
    expect(button('Guardar borrador')).toBeUndefined();
    expect(button('Agregar pieza')).toBeUndefined();
  });

  it('si no se confirma, sigue en borrador', async () => {
    const { draft } = await seedDraft();
    await mountEditor(`/packing-lists/${draft.id}`, draft.id);
    await click(button('Marcar como recibido'));
    await click(confirmButton('Seguir editando'));
    expect((await packingListsRepository.get(draft.id))?.status).toBe('BORRADOR');
  });

  it('muestra en solo lectura un packing list ya exportado, con su viruta', async () => {
    const { draft } = await seedDraft();
    await packingListsRepository.update(draft.id, {
      status: 'EXPORTADO',
      residues: [
        { kind: 'FUNDICION', fromPieces: [1], grossWeight: '2', fineness: '0.9', note: 'Muestra' },
      ],
    });
    const mounted = await mountEditor(`/packing-lists/${draft.id}`, draft.id);
    expect(mounted.wrapper.text()).toContain('Exportado');
    expect(mounted.wrapper.text()).toContain('Fundición de pieza 1');
    expect(mounted.wrapper.text()).toContain('900,0 ‰');
    expect(button('Marcar como recibido')).toBeUndefined();
    expect(mounted.wrapper.find('button[aria-label^="Quitar"]').exists()).toBe(false);
  });

  it('avisa si la viruta queda sin su pieza de origen y deja quitarla', async () => {
    const { draft } = await seedDraft();
    await packingListsRepository.update(draft.id, {
      pieces: [
        { number: 1, grossWeight: '500', fineness: '920' },
        { number: 2, grossWeight: '100', fineness: '900' },
      ],
      residues: [{ kind: 'VIRUTA', fromPieces: [2], grossWeight: '1', note: undefined }],
    });
    const mounted = await mountEditor(`/packing-lists/${draft.id}`, draft.id);
    await mounted.wrapper.get('button[aria-label="Quitar pieza 2"]').trigger('click');
    expect(mounted.wrapper.text()).toContain('Alguna pieza de origen ya no existe');
    await mounted.wrapper.get('button[aria-label="Quitar viruta de pieza 2"]').trigger('click');
    expect(mounted.wrapper.text()).toContain('Sin viruta ni fundición registradas.');
  });

  it('si el packing list no existe, lo dice y enlaza a la lista', async () => {
    const mounted = await mountEditor('/packing-lists/no-existe', 'no-existe');
    expect(mounted.wrapper.text()).toContain('No encontramos este packing list');
    expect(mounted.wrapper.find('a[href="/packing-lists"]').exists()).toBe(true);
  });
});

/** El aviso de salida es un guard de ruta: el editor tiene que estar dentro de RouterView. */
const mountRouted = () =>
  mountWithApp(
    withAppChrome(() => h(RouterView)),
    { route: '/packing-lists/nuevo' },
  );

describe('PackingListEditorView: salir con cambios sin guardar', () => {
  it('pide confirmación y solo sale si se acepta', async () => {
    const mounted = await mountRouted();
    await typePiece(mounted, [1, '100', '900']);
    const leaving = mounted.router.push('/');
    await flushPromises();
    expect(document.body.textContent).toContain('Si sales ahora, se pierden los cambios');
    await click(confirmButton('Seguir editando'));
    await leaving;
    expect(mounted.router.currentRoute.value.path).toBe('/packing-lists/nuevo');

    const leavingAgain = mounted.router.push('/');
    await flushPromises();
    await click(confirmButton('Salir sin guardar'));
    await leavingAgain;
    expect(mounted.router.currentRoute.value.path).toBe('/');
  });

  it('sin cambios sale sin preguntar', async () => {
    const mounted = await mountRouted();
    await mounted.router.push('/');
    expect(mounted.router.currentRoute.value.path).toBe('/');
  });
});

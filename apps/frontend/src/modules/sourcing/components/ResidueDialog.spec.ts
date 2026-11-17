import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, beforeAll, vi } from 'vitest';
import { mountWithApp } from '../../../../test/support/mount.ts';
import ResidueDialog from './ResidueDialog.vue';

/** Monta PrimeVue y el router completos: con la máquina cargada, 5 s no alcanzan. */
vi.setConfig({ testTimeout: 30_000 });

/** mountWithApp navega con el router real: se precargan sus pantallas para no medir el import en frío. */
beforeAll(async () => {
  await Promise.all([
    import('../../../app/views/PanelView.vue'),
    import('../views/PackingListEditorView.vue'),
  ]);
}, 60_000);

enableAutoUnmount(afterEach);

/** El diálogo se teletransporta a document.body: se busca ahí. */
const body = () => document.body;
const buttonByText = (text: string) =>
  [...body().querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.trim() === text,
  );
const fieldByLabel = (text: string) =>
  [...body().querySelectorAll('label')]
    .find((label) => label.textContent?.trim().startsWith(text))
    ?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
const type = async (label: string, value: string) => {
  const field = fieldByLabel(label);
  if (!field) throw new Error(`No existe el campo ${label}`);
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await flushPromises();
};
const click = async (element: HTMLElement | undefined) => {
  element?.click();
  await flushPromises();
};
const pieceOption = (number: number) =>
  body().querySelector<HTMLInputElement>(`input[type="checkbox"][value="${number}"]`) ?? undefined;

const openDialog = async (pieceNumbers: number[] = [1, 2, 3]) => {
  const { wrapper } = await mountWithApp(ResidueDialog, {
    props: {
      visible: false,
      pieceNumbers,
      'onUpdate:visible': (value: boolean) => wrapper.setProps({ visible: value }),
    },
  });
  await wrapper.setProps({ visible: true });
  await flushPromises();
  return wrapper;
};

describe('ResidueDialog', () => {
  it('ofrece como origen solo las piezas que existen en el packing list', async () => {
    await openDialog([1, 2, 5]);
    const options = [...body().querySelectorAll('input[type="checkbox"]')].map((input) =>
      input.closest('label')?.textContent?.trim(),
    );
    expect(options).toEqual(['Pieza 1', 'Pieza 2', 'Pieza 5']);
  });

  it('registra una fundición de varias piezas con peso, ley y nota', async () => {
    const wrapper = await openDialog();
    await click(buttonByText('Fundición'));
    await click(pieceOption(3));
    await click(pieceOption(1));
    await type('Peso bruto', '12.5');
    await type('Ley', '0.9');
    await type('Nota', 'Muestra para ensayo');
    await click(buttonByText('Registrar'));
    const residue = wrapper.emitted('save')?.[0]?.[0];
    expect(residue).toMatchObject({
      kind: 'FUNDICION',
      fromPieces: [1, 3],
      grossWeight: '12.5',
      fineness: '0.9',
      note: 'Muestra para ensayo',
    });
    expect(wrapper.props('visible')).toBe(false);
  });

  it('la ley es opcional: registra viruta solo con piezas y peso', async () => {
    const wrapper = await openDialog();
    await click(pieceOption(2));
    await type('Peso bruto', '3');
    await click(buttonByText('Registrar'));
    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ kind: 'VIRUTA', fineness: '' });
  });

  it('pide de qué piezas sale y un peso válido, sin cerrar', async () => {
    const wrapper = await openDialog();
    await type('Peso bruto', '1.2345');
    await type('Ley', '1200');
    await click(buttonByText('Registrar'));
    expect(body().textContent).toContain('Indica de qué piezas sale');
    expect(body().textContent).toContain('Máximo 3 decimales');
    expect(body().textContent).toContain('La ley va entre 0 y 1000 ‰');
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.props('visible')).toBe(true);
  });

  it('vuelve a abrir en limpio: sin datos ni errores', async () => {
    const wrapper = await openDialog();
    await click(pieceOption(1));
    await type('Peso bruto', '1.2345');
    await click(buttonByText('Registrar'));
    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    await flushPromises();
    expect(fieldByLabel('Peso bruto')?.value).toBe('');
    expect(pieceOption(1)?.checked).toBe(false);
    expect(body().textContent).not.toContain('Máximo 3 decimales');
    expect(body().textContent).not.toContain('Indica de qué piezas sale');
  });

  it('sin piezas explica que primero hay que agregarlas', async () => {
    await openDialog([]);
    expect(body().textContent).toContain('Primero agrega piezas al packing list');
  });

  it('nombra el tipo con su etiqueta visible y las piezas con su leyenda', async () => {
    await openDialog();
    const kind = body().querySelector('[aria-labelledby="residue-kind"]');
    expect(kind).not.toBeNull();
    expect(body().querySelector('#residue-kind')?.textContent).toBe('Tipo');
    expect(pieceOption(1)?.closest('fieldset')?.querySelector('legend')?.textContent).toBe(
      'Sale de las piezas',
    );
  });

  it('con datos escritos, pide confirmar antes de cerrar', async () => {
    const wrapper = await openDialog();
    await type('Peso bruto', '4');
    await click(buttonByText('Cancelar'));
    expect(body().textContent).toContain('se pierde la viruta o fundición');
    expect(wrapper.props('visible')).toBe(true);
    await click(buttonByText('Seguir registrando'));
    expect(wrapper.props('visible')).toBe(true);
    expect(fieldByLabel('Peso bruto')?.value).toBe('4');
    await click(buttonByText('Cancelar'));
    await click(buttonByText('Descartar'));
    expect(wrapper.props('visible')).toBe(false);
  });

  it('cancelar cierra sin registrar', async () => {
    const wrapper = await openDialog();
    await click(buttonByText('Cancelar'));
    expect(wrapper.props('visible')).toBe(false);
    expect(wrapper.emitted('save')).toBeUndefined();
  });
});

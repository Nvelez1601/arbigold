import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, beforeAll, vi } from 'vitest';
import { mountWithApp } from '../../../../test/support/mount.ts';
import { type PieceErrors, type PieceRow, newRowKey } from '../composables/usePackingListEditor.ts';
import PieceRowsEditor from './PieceRowsEditor.vue';

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

const piece = (number: string, grossWeight: string, fineness: string): PieceRow => ({
  key: newRowKey(),
  number,
  grossWeight,
  fineness,
});

/** Datos ficticios: la ley llega en milésimas, fracción y porcentaje. */
const THREE_PIECES = () => [
  piece('1', '1000', '950'),
  piece('2', '2000', '0.9'),
  piece('3', '1500.5', '92'),
];

const mountEditor = async (
  rows: PieceRow[],
  extra: { errors?: PieceErrors; readonly?: boolean } = {},
) => {
  const { wrapper } = await mountWithApp(PieceRowsEditor, {
    props: {
      modelValue: rows,
      ...extra,
      'onUpdate:modelValue': (value: PieceRow[]) => wrapper.setProps({ modelValue: value }),
    },
  });
  return wrapper;
};

const cellsOf = (wrapper: Awaited<ReturnType<typeof mountEditor>>, index: number) =>
  wrapper.findAll('tbody tr')[index]?.findAll('td') ?? [];

describe('PieceRowsEditor', () => {
  it('lee cada pieza como un ensayo: sello con la ley en ‰ y peso fino en vivo', async () => {
    const wrapper = await mountEditor(THREE_PIECES());
    expect(wrapper.findAll('[data-hallmark]').map((stamp) => stamp.text())).toEqual([
      '950,0 ‰',
      '900,0 ‰',
      '920,0 ‰',
    ]);
    expect(cellsOf(wrapper, 0)[4]?.text()).toBe('950,00 g');
    expect(cellsOf(wrapper, 1)[4]?.text()).toBe('1.800,00 g');
    expect(cellsOf(wrapper, 2)[4]?.text()).toBe('1.380,46 g');
  });

  it('recalcula el sello y el fino mientras se escribe la ley', async () => {
    const wrapper = await mountEditor([piece('1', '500', '')]);
    expect(wrapper.find('[data-hallmark]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Sin ley');
    await wrapper.get('input[aria-label="Ley de la pieza 1"]').setValue('0.92');
    expect(wrapper.get('[data-hallmark]').text()).toBe('920,0 ‰');
    expect(cellsOf(wrapper, 0)[4]?.text()).toBe('460,00 g');
  });

  it('usa teclado decimal y campos de texto para pesos y leyes', async () => {
    const wrapper = await mountEditor([piece('1', '', '')]);
    const gross = wrapper.get('input[aria-label="Peso bruto de la pieza 1"]');
    expect(gross.attributes('inputmode')).toBe('decimal');
    expect(gross.attributes('type')).toBe('text');
    expect(wrapper.get('input[aria-label="Número de la pieza 1"]').attributes('inputmode')).toBe(
      'numeric',
    );
  });

  it('agrega una pieza con el número siguiente', async () => {
    const wrapper = await mountEditor(THREE_PIECES());
    await wrapper.get('button:not([aria-label])').trigger('click');
    const rows = wrapper.props('modelValue');
    expect(rows).toHaveLength(4);
    expect(rows.at(-1)).toMatchObject({ number: '4', grossWeight: '', fineness: '' });
  });

  it('Enter en la última fila agrega otra pieza y lleva el foco a su peso bruto', async () => {
    const wrapper = await mountEditor([piece('1', '10', '900')]);
    await wrapper.get('input[aria-label="Ley de la pieza 1"]').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    await vi.waitFor(
      () => {
        expect(wrapper.props('modelValue')).toHaveLength(2);
        expect(document.activeElement?.getAttribute('aria-label')).toBe('Peso bruto de la pieza 2');
      },
      { timeout: 5000, interval: 20 },
    );
  });

  it('Enter en una fila intermedia pasa a la siguiente sin agregar', async () => {
    const wrapper = await mountEditor(THREE_PIECES());
    await wrapper.get('input[aria-label="Número de la pieza 1"]').trigger('keydown', {
      key: 'Enter',
    });
    await flushPromises();
    expect(wrapper.props('modelValue')).toHaveLength(3);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Peso bruto de la pieza 2');
  });

  it('quita una pieza con su botón etiquetado', async () => {
    const wrapper = await mountEditor(THREE_PIECES());
    await wrapper.get('button[aria-label="Quitar pieza 2"]').trigger('click');
    expect(wrapper.props('modelValue').map((row) => row.number)).toEqual(['1', '3']);
  });

  it('muestra los errores junto a su campo y los asocia para lectores de pantalla', async () => {
    const rows = [piece('1', '10.1234', '1200')];
    const errors = {
      [rows[0]?.key ?? '']: {
        grossWeight: 'Máximo 3 decimales',
        fineness: 'La ley va entre 0 y 1000 ‰',
      },
    };
    const wrapper = await mountEditor(rows, { errors });
    const gross = wrapper.get('input[aria-label="Peso bruto de la pieza 1"]');
    expect(gross.attributes('aria-invalid')).toBe('true');
    const message = wrapper.get(`#${gross.attributes('aria-describedby')}`);
    expect(message.text()).toBe('Máximo 3 decimales');
    expect(wrapper.text()).toContain('La ley va entre 0 y 1000 ‰');
  });

  it('en solo lectura no deja agregar ni quitar piezas', async () => {
    const wrapper = await mountEditor(THREE_PIECES(), { readonly: true });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(
      wrapper.get('input[aria-label="Peso bruto de la pieza 1"]').attributes('readonly'),
    ).toBeDefined();
  });

  it('nombra la pieza por su posición mientras no tiene número', async () => {
    const wrapper = await mountEditor([piece('', '', '')]);
    expect(wrapper.find('button[aria-label="Quitar pieza 1"]').exists()).toBe(true);
    expect(wrapper.get('tbody td:last-child').text()).toBe('');
    expect(cellsOf(wrapper, 0)[4]?.text()).toBe('—');
  });
});

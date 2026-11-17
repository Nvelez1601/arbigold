import { beforeEach, describe, expect, it, beforeAll, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mountWithApp } from '../../../../test/support/mount.ts';
import { clientsRepository, packingListsRepository } from '../../../shared/data/repositories.ts';
import {
  type PieceRow,
  createPieceRow,
  describePieces,
  newRowKey,
  nextPieceNumber,
  pieceTotals,
  todayIso,
  usePackingListEditor,
} from './usePackingListEditor.ts';
import { pieceFormatErrors, pieceMissingErrors } from './pieceValidation.ts';

/** Monta PrimeVue y el router completos: con la máquina cargada, 5 s no alcanzan. */
vi.setConfig({ testTimeout: 30_000 });

/** mountWithApp navega con el router real: se precargan sus pantallas para no medir el import en frío. */
beforeAll(async () => {
  await Promise.all([
    import('../../../app/views/PanelView.vue'),
    import('../views/PackingListsView.vue'),
  ]);
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

const piece = (number: string, grossWeight: string, fineness: string): PieceRow => ({
  key: newRowKey(),
  number,
  grossWeight,
  fineness,
});

/** Datos ficticios: tres piezas con la ley escrita en tres escalas distintas. */
const THREE_PIECES = () => [
  piece('1', '1000', '950'),
  piece('2', '2000', '0.9'),
  piece('3', '1500.5', '92'),
];

describe('vista previa de la balanza', () => {
  it('suma bruto y fino de las piezas con la ley en milésimas, fracción y porcentaje', () => {
    expect(pieceTotals(THREE_PIECES())).toEqual({ count: 3, gross: '4500.5', fine: '4130.46' });
  });

  it('ignora en los totales lo que todavía no es un número', () => {
    expect(pieceTotals([piece('1', '', ''), piece('2', '10', 'x')])).toEqual({
      count: 1,
      gross: '10',
      fine: '0',
    });
  });
});

describe('numeración de piezas', () => {
  it('propone el número siguiente al mayor, empezando por 1', () => {
    expect(nextPieceNumber([])).toBe(1);
    expect(nextPieceNumber([piece('4', '', ''), piece('abc', '', '')])).toBe(5);
    expect(createPieceRow(THREE_PIECES())).toMatchObject({
      number: '4',
      grossWeight: '',
      fineness: '',
    });
  });
});

describe('validación de cada pieza', () => {
  it('marca más de 3 decimales, ley fuera de 0–1000 y números repetidos o inválidos', () => {
    const rows = [
      piece('1', '10.1234', '1200'),
      piece('1', 'diez', '950'),
      piece('0', '5', '0.75'),
    ];
    const errors = pieceFormatErrors(rows);
    expect(errors[rows[0]?.key ?? '']).toEqual({
      number: 'La pieza 1 ya existe: usa otro número',
      grossWeight: 'Máximo 3 decimales',
      fineness: 'La ley va entre 0 y 1000 ‰',
    });
    expect(errors[rows[1]?.key ?? '']?.grossWeight).toBe('Ingresa un número, p. ej. 1250.50');
    expect(errors[rows[2]?.key ?? '']).toEqual({ number: 'Usa un número entero desde 1' });
  });

  it('no marca lo vacío como error de formato, pero sí como faltante', () => {
    const rows = [piece('', '', '')];
    expect(pieceFormatErrors(rows)[rows[0]?.key ?? '']).toEqual({});
    expect(pieceMissingErrors(rows)[rows[0]?.key ?? '']).toEqual({
      number: 'Escribe el número de la pieza',
      grossWeight: 'Escribe el peso bruto en gramos',
      fineness: 'Escribe la ley, p. ej. 920 o 0.92',
    });
  });
});

describe('textos de apoyo', () => {
  it('describe de qué piezas sale un residuo', () => {
    expect(describePieces([2])).toBe('pieza 2');
    expect(describePieces([1, 2, 3])).toBe('piezas 1, 2 y 3');
  });

  it('propone la fecha de hoy como AAAA-MM-DD', () => {
    expect(todayIso(new Date(2026, 10, 17, 9, 30))).toBe('2026-11-17');
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

const mountEditor = async (id?: string) => {
  const captured: { editor?: ReturnType<typeof usePackingListEditor> } = {};
  const Host = defineComponent({
    setup() {
      captured.editor = usePackingListEditor(ref(id));
      return () => null;
    },
  });
  await mountWithApp(Host);
  if (!captured.editor) throw new Error('El editor no se montó');
  return captured.editor;
};

describe('usePackingListEditor', () => {
  it('no guarda sin cliente ni piezas completas y dice qué corregir', async () => {
    const editor = await mountEditor();
    expect(editor.isEditable.value).toBe(true);
    const result = await editor.saveDraft();
    expect(result.problem).toBe('Corrige los campos marcados y vuelve a guardar');
    expect(editor.headerErrors.value.clientId).toBe('Elige el cliente que entrega');
    const [first] = editor.pieces.value;
    expect(editor.pieceErrors.value[first?.key ?? '']?.grossWeight).toBe(
      'Escribe el peso bruto en gramos',
    );
  });

  it('pide una fecha AAAA-MM-DD', async () => {
    const editor = await mountEditor();
    editor.header.value.issuedOn = '17/11/2026';
    await editor.saveDraft();
    expect(editor.headerErrors.value.issuedOn).toBe('Escribe la fecha como AAAA-MM-DD');
  });

  it('guarda el borrador con las piezas y la viruta, que no cambia los totales', async () => {
    const client = await clientsRepository.create({ name: 'Cliente Ejemplo', kind: 'PERSONA' });
    const editor = await mountEditor();
    editor.header.value.clientId = client.id;
    editor.pieces.value = THREE_PIECES();
    const before = editor.totals.value;
    editor.residues.value.push({
      key: newRowKey(),
      kind: 'VIRUTA',
      fromPieces: [1, 3],
      grossWeight: '12.5',
      fineness: '',
      note: '',
    });
    expect(editor.totals.value).toEqual(before);
    expect(editor.isDirty.value).toBe(true);
    const { record } = await editor.saveDraft();
    expect(record).toMatchObject({ status: 'BORRADOR', clientId: client.id });
    expect(record?.pieces).toHaveLength(3);
    expect(record?.residues[0]).toMatchObject({ kind: 'VIRUTA', fromPieces: [1, 3] });
    expect(editor.isDirty.value).toBe(false);
  });

  it('no guarda viruta de piezas que ya no existen', async () => {
    const client = await clientsRepository.create({ name: 'Cliente Ejemplo', kind: 'PERSONA' });
    const editor = await mountEditor();
    editor.header.value.clientId = client.id;
    editor.pieces.value = [piece('1', '100', '900')];
    editor.residues.value = [
      { key: 'r', kind: 'FUNDICION', fromPieces: [7], grossWeight: '1', fineness: '', note: '' },
    ];
    expect(editor.orphanResidues.value).toHaveLength(1);
    expect((await editor.saveDraft()).problem).toMatch(/piezas que ya no existen/);
  });

  it('carga un packing list guardado, lo actualiza y lo marca como recibido', async () => {
    const client = await clientsRepository.create({ name: 'Cliente Ejemplo', kind: 'PERSONA' });
    const saved = await packingListsRepository.create({
      clientId: client.id,
      issuedOn: '2026-11-10',
      notes: 'Entrega de prueba',
      pieces: [{ number: 1, grossWeight: '500', fineness: '920' }],
      residues: [{ kind: 'FUNDICION', fromPieces: [1], grossWeight: '2', fineness: '900' }],
    });
    const editor = await mountEditor(saved.id);
    expect(editor.header.value).toEqual({
      clientId: client.id,
      issuedOn: '2026-11-10',
      notes: 'Entrega de prueba',
    });
    expect(editor.totals.value).toEqual({ count: 1, gross: '500', fine: '460' });
    expect(editor.isDirty.value).toBe(false);
    const { record } = await editor.markReceived();
    expect(record?.status).toBe('RECIBIDO');
    expect(record?.id).toBe(saved.id);
  });

  it('no marca como recibido si el borrador no es válido', async () => {
    const editor = await mountEditor();
    expect((await editor.markReceived()).problem).toBeDefined();
  });

  it('ofrece solo clientes activos, salvo el que ya tiene el packing list', async () => {
    const active = await clientsRepository.create({ name: 'Cliente Activo', kind: 'PERSONA' });
    const retired = await clientsRepository.create({ name: 'Cliente Retirado', kind: 'EMPRESA' });
    await clientsRepository.update(retired.id, { active: false });
    const editor = await mountEditor();
    expect(editor.clientOptions.value.map((c) => c.id)).toEqual([active.id]);
    editor.header.value.clientId = retired.id;
    await nextTick();
    expect(editor.clientOptions.value).toHaveLength(2);
  });

  it('reconoce un :id que no existe', async () => {
    const editor = await mountEditor('no-existe');
    expect(editor.isMissing.value).toBe(true);
  });
});

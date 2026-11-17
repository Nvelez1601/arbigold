import { describe, expect, it } from 'vitest';
import {
  mergeErrors,
  pieceFormatErrors,
  pieceMissingErrors,
  pieceNumberOf,
  type PieceRow,
} from './pieceValidation.ts';

const row = (
  key: string,
  { number = '', grossWeight = '', fineness = '' }: Partial<Omit<PieceRow, 'key'>> = {},
): PieceRow => ({ key, number, grossWeight, fineness });

describe('pieceNumberOf', () => {
  it('lee el número de pieza como entero desde 1, o nada si no lo es', () => {
    expect(pieceNumberOf(row('a', { number: '3' }))).toBe(3);
    expect(pieceNumberOf(row('a', { number: ' 12 ' }))).toBe(12);
    expect(pieceNumberOf(row('a', { number: 'x' }))).toBeNull();
    expect(pieceNumberOf(row('a', { number: '1.5' }))).toBeNull();
    expect(pieceNumberOf(row('a', {}))).toBeNull();
  });
});

describe('pieceFormatErrors', () => {
  it('no marca lo que está vacío (eso espera al intento de guardar)', () => {
    // La clave existe pero sin mensajes: el componente no muestra nada.
    expect(pieceFormatErrors([row('a', {})])).toEqual({ a: {} });
  });

  it('explica un número repetido aunque el resto esté bien escrito', () => {
    const rows = [
      row('a', { number: '1', grossWeight: '100.5', fineness: '920' }),
      row('b', { number: '1', grossWeight: '200', fineness: '0.9' }),
    ];
    const errors = pieceFormatErrors(rows);
    expect(errors.a?.number).toContain('ya existe');
    expect(errors.b?.number).toContain('ya existe');
    expect(errors.a?.grossWeight).toBeUndefined();
  });

  it('rechaza un número que no es entero desde 1', () => {
    const errors = pieceFormatErrors([
      row('a', { number: '0', grossWeight: '10', fineness: '900' }),
    ]);
    expect(errors.a?.number).toBe('Usa un número entero desde 1');
  });

  it('traduce el mensaje de la ley/peso al escribir valores fuera de rango', () => {
    const errors = pieceFormatErrors([
      row('a', { number: '7', grossWeight: '-5', fineness: '1200' }),
    ]);
    expect(errors.a?.grossWeight).toBeTruthy();
    expect(errors.a?.fineness).toBeTruthy();
  });
});

describe('pieceMissingErrors', () => {
  it('marca solo lo que quedó vacío y deja pasar lo escrito', () => {
    const rows = [row('a', { number: '3', fineness: '900' }), row('b', { grossWeight: '10' })];
    const errors = pieceMissingErrors(rows);
    expect(errors.a?.grossWeight).toBe('Escribe el peso bruto en gramos');
    expect(errors.a?.fineness).toBeUndefined();
    expect(errors.b?.number).toBe('Escribe el número de la pieza');
    expect(errors.b?.fineness).toBe('Escribe la ley, p. ej. 920 o 0.92');
    expect(errors.b?.grossWeight).toBeUndefined();
  });
});

describe('mergeErrors', () => {
  it('el error de formato manda sobre el de falta, y no inventa claves nuevas', () => {
    const base = { a: { number: 'repetida' }, b: {} };
    const extra = {
      a: { number: 'Vacío', fineness: 'falta la ley' },
      b: { grossWeight: 'falta el peso' },
      c: { number: 'no existe en base' },
    };
    expect(mergeErrors(base, extra)).toEqual({
      a: { number: 'repetida', fineness: 'falta la ley' },
      b: { grossWeight: 'falta el peso' },
    });
  });
});

import { describe, expect, it } from 'vitest';
import { ValidationError } from '../shared/domain-error.ts';
import { Fineness } from '../shared/fineness.vo.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import { GoldPiece, MAX_MEASUREMENT_DECIMALS } from './gold-piece.vo.ts';

const piece = (number: number, gross = '1000', ley = '950.5') =>
  GoldPiece.create({
    number,
    grossWeight: GoldWeight.ofGrams(gross),
    fineness: Fineness.parse(ley),
  });

describe('GoldPiece', () => {
  it('calcula su peso fino a partir del bruto y la ley', () => {
    const p = piece(1);
    expect(p.number).toBe(1);
    expect(p.grossWeight.grams.toString()).toBe('1000');
    expect(p.fineness.perMille.toString()).toBe('950.5');
    expect(p.fineWeight.grams.toString()).toBe('950.5');
  });

  it.each([0, -1, 1.5])('rechaza un número de pieza inválido (%s)', (number) => {
    expect(() => piece(number)).toThrow(ValidationError);
  });

  it('rechaza una pieza de 0 gramos', () => {
    expect(() => piece(1, '0')).toThrow('Una pieza debe pesar más de 0 gramos');
  });

  it('acepta medidas con hasta 3 decimales, como las reportan las refinerías', () => {
    expect(MAX_MEASUREMENT_DECIMALS).toBe(3);
    expect(piece(1, '1000.125', '950.375').fineWeight.grams.toString()).toBe('950.493796875');
  });

  it('acepta una ley en fracción de 4 decimales (queda en milésimas con 1)', () => {
    expect(piece(1, '1000', '0.9743').fineness.perMille.toString()).toBe('974.3');
  });

  it('rechaza un peso bruto con más de 3 decimales', () => {
    expect(() => piece(2, '1000.1234')).toThrow(
      'El peso bruto de la pieza 2 admite hasta 3 decimales',
    );
  });

  it('rechaza una ley con más de 3 decimales en milésimas', () => {
    expect(() => piece(3, '1000', '950.1234')).toThrow(
      'La ley de la pieza 3 admite hasta 3 decimales',
    );
  });
});

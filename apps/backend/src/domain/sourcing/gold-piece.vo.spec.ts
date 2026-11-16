import { describe, expect, it } from 'vitest';
import { ValidationError } from '../shared/domain-error.ts';
import { Fineness } from '../shared/fineness.vo.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import { GoldPiece } from './gold-piece.vo.ts';

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
});

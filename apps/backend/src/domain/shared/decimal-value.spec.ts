import { Decimal } from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { ValidationError } from './domain-error.ts';
import { toDecimal } from './decimal-value.ts';

describe('toDecimal', () => {
  it('convierte textos y números sin perder precisión', () => {
    expect(toDecimal('1234.56', 'peso').toString()).toBe('1234.56');
    expect(toDecimal(0.1, 'peso').plus(0.2).toString()).toBe('0.3');
    expect(toDecimal(new Decimal('920.5'), 'ley').toString()).toBe('920.5');
  });

  it('rechaza textos no numéricos indicando el campo', () => {
    expect(() => toDecimal('abc', 'peso bruto')).toThrow(ValidationError);
    expect(() => toDecimal('abc', 'peso bruto')).toThrow('peso bruto no es un número válido');
  });

  it('rechaza NaN e infinito', () => {
    expect(() => toDecimal(Number.NaN, 'ley')).toThrow(ValidationError);
    expect(() => toDecimal(Number.POSITIVE_INFINITY, 'ley')).toThrow(ValidationError);
  });
});

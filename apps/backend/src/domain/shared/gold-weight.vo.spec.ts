import { describe, expect, it } from 'vitest';
import { ValidationError } from './domain-error.ts';
import { GoldWeight, TROY_OUNCE_IN_GRAMS } from './gold-weight.vo.ts';

describe('GoldWeight', () => {
  it('representa gramos exactos y los suma sin error de coma flotante', () => {
    const total = GoldWeight.ofGrams('0.1').plus(GoldWeight.ofGrams('0.2'));
    expect(total.grams.toString()).toBe('0.3');
  });

  it('parte de cero para acumular totales', () => {
    expect(GoldWeight.zero().grams.isZero()).toBe(true);
  });

  it('rechaza un peso negativo', () => {
    expect(() => GoldWeight.ofGrams('-1')).toThrow(ValidationError);
  });

  it('calcula la diferencia con signo: negativa cuando hay merma', () => {
    const original = GoldWeight.ofGrams('500.25');
    const refinery = GoldWeight.ofGrams('499.5');
    expect(refinery.differenceFrom(original).toString()).toBe('-0.75');
  });

  it('convierte a onzas troy con la constante que usa el negocio (31.1035)', () => {
    expect(TROY_OUNCE_IN_GRAMS.toString()).toBe('31.1035');
    expect(GoldWeight.ofGrams('31.1035').toTroyOunces().toString()).toBe('1');
  });

  it('compara pesos por valor', () => {
    expect(GoldWeight.ofGrams('10.50').equals(GoldWeight.ofGrams('10.5'))).toBe(true);
    expect(GoldWeight.ofGrams('10.5').equals(GoldWeight.ofGrams('10.6'))).toBe(false);
  });
});

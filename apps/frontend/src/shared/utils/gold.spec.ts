import { describe, expect, it } from 'vitest';
import { closedGrams, fineWeight, sumDecimals, toDecimalOrNull, toPerMille } from './gold.ts';

describe('vista previa de oro (réplica del dominio)', () => {
  it('lee números con coma o punto, y descarta lo que no es número', () => {
    expect(toDecimalOrNull('1250,5')?.toString()).toBe('1250.5');
    expect(toDecimalOrNull('')).toBeNull();
    expect(toDecimalOrNull(undefined)).toBeNull();
    expect(toDecimalOrNull('12a')).toBeNull();
  });

  it.each([
    ['0.875', '875'],
    ['94.5', '945'],
    ['920.5', '920.5'],
  ])('normaliza la ley %s a %s ‰', (input, expected) => {
    expect(toPerMille(input)?.toString()).toBe(expected);
  });

  it('una ley de 0 o mayor a 1000 no es válida', () => {
    expect(toPerMille('0')).toBeNull();
    expect(toPerMille('1200')).toBeNull();
  });

  it('calcula el peso fino de una pieza', () => {
    expect(fineWeight('500', '920')?.toString()).toBe('460');
    expect(fineWeight('500', '')).toBeNull();
  });

  it('calcula los gramos de un cierre con la onza troy del negocio', () => {
    expect(closedGrams('100000', '4000', '95')?.toDecimalPlaces(4).toString()).toBe('818.5132');
    expect(closedGrams('100000', '0', '95')).toBeNull();
    expect(closedGrams('100000', '4000', '')).toBeNull();
  });

  it('suma ignorando los valores incompletos', () => {
    expect(
      sumDecimals([fineWeight('500', '920'), null, fineWeight('100', '1000')]).toString(),
    ).toBe('560');
  });
});

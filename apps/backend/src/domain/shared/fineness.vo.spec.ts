import { describe, expect, it } from 'vitest';
import { ValidationError } from './domain-error.ts';
import { Fineness } from './fineness.vo.ts';
import { GoldWeight } from './gold-weight.vo.ts';

describe('Fineness (ley)', () => {
  it('calcula el peso fino como bruto × ley / 1000', () => {
    const fine = Fineness.ofPerMille('920').fineWeightOf(GoldWeight.ofGrams('500'));
    expect(fine.grams.toString()).toBe('460');
  });

  it.each([
    ['fracción', '0.875', '875'],
    ['porcentaje', '94.5', '945'],
    ['milésimas', '920.25', '920.25'],
    ['oro puro como fracción', '1', '1000'],
    ['oro puro en milésimas', '1000', '1000'],
  ])('normaliza una ley escrita como %s (%s → %s ‰)', (_formato, input, expected) => {
    expect(Fineness.parse(input).perMille.toString()).toBe(expected);
  });

  it('da el mismo fino sin importar en qué escala se escribió la ley', () => {
    const gross = GoldWeight.ofGrams('1200.5');
    const fromFraction = Fineness.parse('0.875').fineWeightOf(gross);
    const fromPerMille = Fineness.parse('875').fineWeightOf(gross);
    expect(fromFraction.equals(fromPerMille)).toBe(true);
    expect(fromFraction.grams.toString()).toBe('1050.4375');
  });

  it.each(['0', '-5', '1000.01', '1200'])('rechaza una ley fuera de rango (%s)', (value) => {
    expect(() => Fineness.ofPerMille(value)).toThrow(ValidationError);
  });

  it('rechaza al normalizar una ley mayor a 1000', () => {
    expect(() => Fineness.parse('1200')).toThrow('La ley debe estar entre 0 y 1000 ‰');
  });

  it('expone la ley como fracción para mostrarla', () => {
    expect(Fineness.ofPerMille('918').asFraction().toString()).toBe('0.918');
  });
});

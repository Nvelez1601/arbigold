import { describe, expect, it } from 'vitest';
import { ValidationError } from '../shared/domain-error.ts';
import { Money } from '../shared/money.vo.ts';
import { PriceClosure } from './price-closure.vo.ts';

const usdt = (amount: string) => Money.of(amount, 'USDT');

describe('PriceClosure (cierre de precio)', () => {
  it('convierte el monto consignado en gramos finos al precio negociado', () => {
    const closure = PriceClosure.create({
      amount: usdt('100000'),
      internationalPricePerOunce: '4000',
      percentage: '95',
    });
    // Con la onza troy exacta (31.1034768 g); ver la pregunta abierta 1 del modelo operativo.
    expect(closure.pricePerGram.toDecimalPlaces(4).toString()).toBe('128.603');
    expect(closure.agreedPricePerGram.toDecimalPlaces(4).toString()).toBe('122.1728');
    expect(closure.closedFineWeight.grams.toDecimalPlaces(4).toString()).toBe('818.5125');
  });

  it('a menor porcentaje, el mismo dinero cierra más gramos', () => {
    const base = { amount: usdt('5000'), internationalPricePerOunce: '3900' };
    const at92 = PriceClosure.create({ ...base, percentage: '92' }).closedFineWeight;
    const at96 = PriceClosure.create({ ...base, percentage: '96' }).closedFineWeight;
    expect(at92.grams.toDecimalPlaces(4).toString()).toBe('43.3438');
    expect(at96.grams.toDecimalPlaces(4).toString()).toBe('41.5378');
    expect(at92.grams.greaterThan(at96.grams)).toBe(true);
  });

  it('conserva los datos del cierre para el registro', () => {
    const closure = PriceClosure.create({
      amount: usdt('25000'),
      internationalPricePerOunce: '4100.5',
      percentage: '96',
    });
    expect(closure.amount.equals(usdt('25000'))).toBe(true);
    expect(closure.internationalPricePerOunce.toString()).toBe('4100.5');
    expect(closure.percentage.toString()).toBe('96');
  });

  it.each([
    ['precio internacional en 0', { internationalPricePerOunce: '0', percentage: '96' }],
    ['porcentaje en 0', { internationalPricePerOunce: '4000', percentage: '0' }],
    ['porcentaje mayor a 100', { internationalPricePerOunce: '4000', percentage: '100.5' }],
  ])('rechaza un cierre con %s', (_caso, props) => {
    expect(() => PriceClosure.create({ amount: usdt('1000'), ...props })).toThrow(ValidationError);
  });

  it('rechaza un cierre sin monto', () => {
    expect(() =>
      PriceClosure.create({
        amount: usdt('0'),
        internationalPricePerOunce: '4000',
        percentage: '97',
      }),
    ).toThrow('El monto del cierre debe ser mayor a 0');
  });
});

import { describe, expect, it } from 'vitest';
import { Money } from '../shared/money.vo.ts';
import { computeOperationSpread } from './operation-spread.service.ts';

const base = { amount: Money.of('200000', 'USDT'), internationalPricePerOunce: '4000' };

describe('computeOperationSpread', () => {
  it('con el mismo dinero, el cliente debe más gramos que los que se deben al proveedor', () => {
    const spread = computeOperationSpread({
      ...base,
      clientPercentage: '96',
      providerPercentage: '97',
    });
    expect(spread.providerClosure.closedFineWeight.grams.toDecimalPlaces(2).toString()).toBe(
      '1603.27',
    );
    expect(spread.clientClosure.closedFineWeight.grams.toDecimalPlaces(2).toString()).toBe(
      '1619.97',
    );
    expect(spread.marginFineGrams.toDecimalPlaces(2).toString()).toBe('16.7');
  });

  it('sin diferencia de porcentaje no hay margen', () => {
    const spread = computeOperationSpread({
      ...base,
      clientPercentage: '97',
      providerPercentage: '97',
    });
    expect(spread.marginFineGrams.isZero()).toBe(true);
  });

  it('reporta un margen negativo sin ocultarlo (operación a pérdida)', () => {
    const spread = computeOperationSpread({
      ...base,
      clientPercentage: '98',
      providerPercentage: '97',
    });
    expect(spread.marginFineGrams.isNegative()).toBe(true);
  });
});

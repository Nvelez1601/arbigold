import { Decimal } from 'decimal.js';
import { toDecimal } from '../shared/decimal-value.ts';
import { ValidationError } from '../shared/domain-error.ts';
import { GoldWeight, TROY_OUNCE_IN_GRAMS } from '../shared/gold-weight.vo.ts';
import type { Money } from '../shared/money.vo.ts';

const HUNDRED = new Decimal(100);

export interface PriceClosureProps {
  /** Monto consignado (normalmente USDT). */
  readonly amount: Money;
  /** Precio internacional del oro en USD por onza troy al momento del cierre ("P. INT"). */
  readonly internationalPricePerOunce: Decimal.Value;
  /** Porcentaje negociado sobre el precio internacional (p. ej. 96.5). */
  readonly percentage: Decimal.Value;
}

/**
 * Cierre de precio: fija cuántos gramos FINOS vale un monto de dinero.
 *   precio por gramo  = P. INT / 31.1035 (onza troy del negocio)
 *   precio negociado  = precio por gramo × porcentaje / 100
 *   gramos cerrados   = monto / precio negociado
 */
export class PriceClosure {
  readonly pricePerGram: Decimal;
  readonly agreedPricePerGram: Decimal;
  readonly closedFineWeight: GoldWeight;

  private constructor(
    readonly amount: Money,
    readonly internationalPricePerOunce: Decimal,
    readonly percentage: Decimal,
  ) {
    this.pricePerGram = internationalPricePerOunce.dividedBy(TROY_OUNCE_IN_GRAMS);
    this.agreedPricePerGram = this.pricePerGram.times(percentage).dividedBy(HUNDRED);
    this.closedFineWeight = GoldWeight.ofGrams(amount.amount.dividedBy(this.agreedPricePerGram));
  }

  static create(props: PriceClosureProps): PriceClosure {
    const price = toDecimal(props.internationalPricePerOunce, 'precio internacional');
    const percentage = toDecimal(props.percentage, 'porcentaje');
    assertPositive(
      price,
      'INVALID_INTERNATIONAL_PRICE',
      'El precio internacional debe ser mayor a 0',
    );
    assertPercentage(percentage);
    assertPositive(
      props.amount.amount,
      'INVALID_CLOSURE_AMOUNT',
      'El monto del cierre debe ser mayor a 0',
    );
    return new PriceClosure(props.amount, price, percentage);
  }
}

const assertPositive = (value: Decimal, code: string, message: string): void => {
  if (value.greaterThan(0)) return;
  throw new ValidationError(code, message, { value: value.toString() });
};

const assertPercentage = (percentage: Decimal): void => {
  if (percentage.greaterThan(0) && percentage.lessThanOrEqualTo(HUNDRED)) return;
  throw new ValidationError('INVALID_PERCENTAGE', 'El porcentaje debe estar entre 0 y 100', {
    percentage: percentage.toString(),
  });
};

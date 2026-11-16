import { Decimal } from 'decimal.js';
import { toDecimal } from './decimal-value.ts';
import { ValidationError } from './domain-error.ts';

/** Onza troy en gramos: el precio internacional del oro se cotiza en USD por onza troy. */
export const TROY_OUNCE_IN_GRAMS = new Decimal('31.1034768');

/** Peso físico de oro en GRAMOS (todo el negocio opera en gramos). Nunca negativo. */
export class GoldWeight {
  private constructor(readonly grams: Decimal) {}

  static ofGrams(value: Decimal.Value): GoldWeight {
    const grams = toDecimal(value, 'peso en gramos');
    if (grams.isNegative()) {
      throw new ValidationError('NEGATIVE_WEIGHT', 'Un peso no puede ser negativo', {
        grams: grams.toString(),
      });
    }
    return new GoldWeight(grams);
  }

  static zero(): GoldWeight {
    return new GoldWeight(new Decimal(0));
  }

  plus(other: GoldWeight): GoldWeight {
    return new GoldWeight(this.grams.plus(other.grams));
  }

  /** Diferencia con signo (this − other), p. ej. refinería − original. Negativo = merma. */
  differenceFrom(other: GoldWeight): Decimal {
    return this.grams.minus(other.grams);
  }

  toTroyOunces(): Decimal {
    return this.grams.dividedBy(TROY_OUNCE_IN_GRAMS);
  }

  equals(other: GoldWeight): boolean {
    return this.grams.equals(other.grams);
  }
}

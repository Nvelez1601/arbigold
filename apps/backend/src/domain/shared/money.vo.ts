import { Decimal } from 'decimal.js';
import { toDecimal } from './decimal-value.ts';
import { BusinessRuleError } from './domain-error.ts';

/** Monedas con las que opera el negocio (fondeo en USDT, gastos en USD y BRL, VES local). */
export const CURRENCIES = ['USDT', 'USD', 'VES', 'BRL'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Monto de dinero con su moneda. Puede ser negativo (saldos). Nunca mezcla monedas. */
export class Money {
  private constructor(
    readonly amount: Decimal,
    readonly currency: Currency,
  ) {}

  static of(amount: Decimal.Value, currency: Currency): Money {
    return new Money(toDecimal(amount, 'monto'), currency);
  }

  static zero(currency: Currency): Money {
    return new Money(new Decimal(0), currency);
  }

  plus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  minus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.minus(other.amount), this.currency);
  }

  isPositive(): boolean {
    return this.amount.greaterThan(0);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount.equals(other.amount);
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency === this.currency) return;
    throw new BusinessRuleError(
      'CURRENCY_MISMATCH',
      'No se pueden operar montos de monedas distintas sin una tasa de cambio',
      { left: this.currency, right: other.currency },
    );
  }
}

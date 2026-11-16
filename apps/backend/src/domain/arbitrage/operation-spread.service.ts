import type { Decimal } from 'decimal.js';
import type { Money } from '../shared/money.vo.ts';
import { PriceClosure } from './price-closure.vo.ts';

export interface OperationSpreadInput {
  /** Fondos que el proveedor adelanta y que se le consignan al cliente. */
  readonly amount: Money;
  readonly internationalPricePerOunce: Decimal.Value;
  /** % al que compra el cliente (p. ej. 96.5): fija cuántos gramos nos debe. */
  readonly clientPercentage: Decimal.Value;
  /** % al que se cierra con el proveedor (p. ej. 97): fija cuántos gramos le debemos. */
  readonly providerPercentage: Decimal.Value;
}

export interface OperationSpread {
  readonly clientClosure: PriceClosure;
  readonly providerClosure: PriceClosure;
  /** Gramos finos de margen = lo que debe el cliente − lo que se le debe al proveedor. */
  readonly marginFineGrams: Decimal;
}

/**
 * El arbitraje de una operación: con el MISMO dinero, el cliente queda debiendo más gramos
 * (compra a menor %) que los que se le deben al proveedor. Esa diferencia es la ganancia.
 * Un margen negativo es posible (mal negocio) y se reporta tal cual, no se oculta.
 */
export const computeOperationSpread = (input: OperationSpreadInput): OperationSpread => {
  const base = {
    amount: input.amount,
    internationalPricePerOunce: input.internationalPricePerOunce,
  };
  const clientClosure = PriceClosure.create({ ...base, percentage: input.clientPercentage });
  const providerClosure = PriceClosure.create({ ...base, percentage: input.providerPercentage });
  return {
    clientClosure,
    providerClosure,
    marginFineGrams: clientClosure.closedFineWeight.differenceFrom(
      providerClosure.closedFineWeight,
    ),
  };
};

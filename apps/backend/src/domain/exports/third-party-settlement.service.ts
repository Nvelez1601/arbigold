import type { Decimal } from 'decimal.js';
import { ValidationError } from '../shared/domain-error.ts';
import { type Currency, Money } from '../shared/money.vo.ts';
import {
  type ExportProfit,
  type ExportProfitInput,
  computeExportProfit,
} from './export-profit.service.ts';

/**
 * Material de terceros (piezas con token y custodio de los compradores árabes): se liquida según
 * el trato, por UTILIDAD (gramos finos netos) o por COBRO_TOTAL (dinero: todo el costo de la operación).
 */
export const SETTLEMENT_MODES = ['UTILIDAD', 'COBRO_TOTAL'] as const;
export type SettlementMode = (typeof SETTLEMENT_MODES)[number];

/** Conceptos que forman el costo total de una operación de terceros. */
export const OPERATION_COST_CONCEPTS = ['PIEZAS', 'ENVIO', 'CUSTODIOS', 'OTROS'] as const;
export type OperationCostConcept = (typeof OPERATION_COST_CONCEPTS)[number];

export interface OperationCost {
  readonly concept: OperationCostConcept;
  readonly amount: Money;
}

export type ThirdPartySettlementInput =
  | { readonly mode: 'UTILIDAD'; readonly profit: ExportProfitInput }
  | {
      readonly mode: 'COBRO_TOTAL';
      readonly currency: Currency;
      readonly costs: readonly OperationCost[];
    };

export type ThirdPartySettlement =
  | {
      readonly mode: 'UTILIDAD';
      readonly netProfitFineGrams: Decimal;
      readonly detail: ExportProfit;
    }
  | {
      readonly mode: 'COBRO_TOTAL';
      readonly total: Money;
      readonly byConcept: Readonly<Partial<Record<OperationCostConcept, Money>>>;
    };

type InputOf<M extends SettlementMode> = Extract<ThirdPartySettlementInput, { mode: M }>;
type ResultOf<M extends SettlementMode> = Extract<ThirdPartySettlement, { mode: M }>;

const settleByProfit = ({ profit }: InputOf<'UTILIDAD'>): ResultOf<'UTILIDAD'> => {
  const detail = computeExportProfit(profit);
  return { mode: 'UTILIDAD', netProfitFineGrams: detail.netProfit, detail };
};

const settleByFullCharge = ({
  currency,
  costs,
}: InputOf<'COBRO_TOTAL'>): ResultOf<'COBRO_TOTAL'> => {
  if (costs.length === 0) {
    throw new ValidationError(
      'NO_OPERATION_COSTS',
      'El cobro total necesita los costos de la operación',
    );
  }
  const byConcept: Partial<Record<OperationCostConcept, Money>> = {};
  for (const { concept, amount } of costs) {
    assertPositive(amount, concept);
    byConcept[concept] = (byConcept[concept] ?? Money.zero(currency)).plus(amount);
  }
  const total = Object.values(byConcept).reduce(
    (acc, amount) => acc.plus(amount),
    Money.zero(currency),
  );
  return { mode: 'COBRO_TOTAL', total, byConcept };
};

const assertPositive = (amount: Money, concept: OperationCostConcept): void => {
  if (amount.isPositive()) return;
  throw new ValidationError('INVALID_OPERATION_COST', `El costo de ${concept} debe ser mayor a 0`, {
    concept,
    amount: amount.amount.toString(),
  });
};

const STRATEGIES: { readonly [M in SettlementMode]: (input: InputOf<M>) => ResultOf<M> } = {
  UTILIDAD: settleByProfit,
  COBRO_TOTAL: settleByFullCharge,
};

/** Liquida el material de terceros con la estrategia del trato (mapa, no if/else). */
export const settleThirdPartyExport = <M extends SettlementMode>(input: InputOf<M>): ResultOf<M> =>
  (STRATEGIES[input.mode] as (input: InputOf<M>) => ResultOf<M>)(input);

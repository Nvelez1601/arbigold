import { Decimal } from 'decimal.js';
import { toDecimal } from '../shared/decimal-value.ts';
import { ValidationError } from '../shared/domain-error.ts';
import type { GoldWeight } from '../shared/gold-weight.vo.ts';

const HUNDRED = new Decimal(100);

/**
 * Deducciones obligatorias sobre el PESO FINO exportado, en % (respuesta del negocio 2026-11-16):
 * 1 % CVM y 0.3 % de exportación. Las paga la empresa. Un trato puede pactar otras.
 */
export const STANDARD_EXPORT_DEDUCTIONS = { CVM: '1', EXPORT: '0.3' } as const;

export interface ExportProfitInput {
  readonly fineWeight: GoldWeight;
  /** % de utilidad negociado en el trato (p. ej. 2, 2.5 o 1.5). */
  readonly grossPercentage: Decimal.Value;
  /** Deducciones en % sobre el fino. Por defecto, las estándar. */
  readonly deductions?: Readonly<Record<string, Decimal.Value>>;
}

export interface ExportProfit {
  /** Gramos finos de utilidad bruta = fino × % negociado. */
  readonly grossProfit: Decimal;
  /** Gramos finos por cada deducción (CVM, exportación…). */
  readonly deductions: Readonly<Record<string, Decimal>>;
  readonly totalDeductions: Decimal;
  /** Utilidad neta en gramos finos. Puede ser negativa si el trato no cubre las deducciones. */
  readonly netProfit: Decimal;
  readonly netPercentage: Decimal;
}

/** Utilidad de una exportación: % negociado − deducciones, todo sobre el peso fino. */
export const computeExportProfit = (input: ExportProfitInput): ExportProfit => {
  const grossPercentage = percentage(input.grossPercentage, 'utilidad negociada');
  const fine = input.fineWeight.grams;
  const deductions = Object.fromEntries(
    Object.entries(input.deductions ?? STANDARD_EXPORT_DEDUCTIONS).map(([concept, value]) => [
      concept,
      fine.times(percentage(value, `deducción ${concept}`)).dividedBy(HUNDRED),
    ]),
  );
  const grossProfit = fine.times(grossPercentage).dividedBy(HUNDRED);
  const totalDeductions = Object.values(deductions).reduce((acc, v) => acc.plus(v), new Decimal(0));
  const netProfit = grossProfit.minus(totalDeductions);
  return {
    grossProfit,
    deductions,
    totalDeductions,
    netProfit,
    netPercentage: fine.isZero() ? new Decimal(0) : netProfit.dividedBy(fine).times(HUNDRED),
  };
};

const percentage = (value: Decimal.Value, field: string): Decimal => {
  const decimal = toDecimal(value, field);
  if (decimal.greaterThanOrEqualTo(0) && decimal.lessThanOrEqualTo(HUNDRED)) return decimal;
  throw new ValidationError('INVALID_PERCENTAGE', `El % de ${field} debe estar entre 0 y 100`, {
    field,
    value: decimal.toString(),
  });
};

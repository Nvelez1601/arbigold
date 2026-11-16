import { Decimal } from 'decimal.js';
import { ValidationError } from './domain-error.ts';

/**
 * Convierte una entrada numérica a Decimal sin pasar nunca por float.
 * Acepta string, number o Decimal; rechaza NaN, infinitos y textos no numéricos.
 */
export const toDecimal = (value: Decimal.Value, field: string): Decimal => {
  const decimal = tryDecimal(value);
  if (!decimal?.isFinite()) {
    throw new ValidationError('INVALID_NUMBER', `${field} no es un número válido`, {
      field,
      value: String(value),
    });
  }
  return decimal;
};

const tryDecimal = (value: Decimal.Value): Decimal | null => {
  try {
    return new Decimal(value);
  } catch {
    return null;
  }
};

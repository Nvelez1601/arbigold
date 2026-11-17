import { Decimal } from 'decimal.js';

/**
 * Cálculos de VISTA PREVIA (lo que ve el usuario mientras escribe). La fuente de verdad es el
 * dominio del backend (apps/backend/src/domain); estas fórmulas lo replican y nunca usan float.
 */
export const TROY_OUNCE_IN_GRAMS = new Decimal('31.1035');
const THOUSAND = new Decimal(1000);
const HUNDRED = new Decimal(100);

/** Convierte un texto a Decimal o null si está vacío o no es un número. */
export const toDecimalOrNull = (value: string | undefined | null): Decimal | null => {
  const text = value?.trim().replace(',', '.');
  if (!text || !/^\d+(\.\d+)?$/.test(text)) return null;
  return new Decimal(text);
};

/** Ley escrita como fracción (≤1), porcentaje (≤100) o milésimas (≤1000) → milésimas. */
export const toPerMille = (value: string | undefined | null): Decimal | null => {
  const raw = toDecimalOrNull(value);
  if (!raw || raw.isZero() || raw.greaterThan(THOUSAND)) return null;
  if (raw.lessThanOrEqualTo(1)) return raw.times(THOUSAND);
  return raw.lessThanOrEqualTo(HUNDRED) ? raw.times(10) : raw;
};

/** Peso fino = bruto × ley ‰ / 1000. */
export const fineWeight = (
  gross: string | undefined,
  fineness: string | undefined,
): Decimal | null => {
  const grams = toDecimalOrNull(gross);
  const perMille = toPerMille(fineness);
  return grams && perMille ? grams.times(perMille).dividedBy(THOUSAND) : null;
};

/** Gramos finos que cierra un monto: monto / (P. INT / 31.1035 × % / 100). */
export const closedGrams = (
  amount: string | undefined,
  pricePerOunce: string | undefined,
  percentage: string | undefined,
): Decimal | null => {
  const money = toDecimalOrNull(amount);
  const price = toDecimalOrNull(pricePerOunce);
  const pct = toDecimalOrNull(percentage);
  if (!money || !price || !pct || price.isZero() || pct.isZero()) return null;
  return money.dividedBy(price.dividedBy(TROY_OUNCE_IN_GRAMS).times(pct).dividedBy(HUNDRED));
};

export const sumDecimals = (values: readonly (Decimal | null)[]): Decimal =>
  values.reduce<Decimal>((acc, value) => (value ? acc.plus(value) : acc), new Decimal(0));

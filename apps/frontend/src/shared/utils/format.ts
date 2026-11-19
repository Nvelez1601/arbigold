/** Formato de cifras y fechas con Intl (nunca formatos a mano). Locale del negocio: es-VE. */
const LOCALE = 'es-VE';

type NumericInput = string | number;

const numberFormat = (min: number, max: number) =>
  new Intl.NumberFormat(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max });

const GRAMS = numberFormat(2, 2);
const PER_MILLE = numberFormat(1, 3);
const PERCENT = numberFormat(1, 2);
const DATE = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Intl acepta strings numéricos exactos: los decimales de dinero y peso no pasan por float. */
const asNumeric = (value: NumericInput) => value as unknown as number;

export const formatGrams = (value: NumericInput): string => `${GRAMS.format(asNumeric(value))} g`;

/** Gramos de un cálculo que puede faltar (datos incompletos): guion en lugar de "NaN g". */
export const formatGramsOrDash = (value: { toString(): string } | null | undefined): string =>
  value ? formatGrams(value.toString()) : '—';

export const formatPerMille = (value: NumericInput): string =>
  `${PER_MILLE.format(asNumeric(value))} ‰`;

export const formatPercent = (value: NumericInput): string =>
  `${PERCENT.format(asNumeric(value))} %`;

export const formatMoney = (value: NumericInput, currency: string): string =>
  `${GRAMS.format(asNumeric(value))} ${currency}`;

/** Fecha de calendario AAAA-MM-DD → "17 nov 2026". */
export const formatDate = (isoDate: string): string =>
  DATE.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));

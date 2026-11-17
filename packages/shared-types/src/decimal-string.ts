import { z } from 'zod';

const DECIMAL = /^\d+(\.\d+)?$/;
const decimalsOf = (value: string): number => value.split('.')[1]?.length ?? 0;

/** Número decimal como TEXTO (montos, pesos, leyes nunca viajan como number). Admite coma decimal. */
export const decimalString = z
  .string()
  .trim()
  .transform((value) => value.replace(',', '.'))
  .refine((value) => DECIMAL.test(value), { message: 'Ingresa un número, p. ej. 1250.50' });

/** Medida física (peso bruto en gramos o ley en ‰): mayor a 0 y hasta 3 decimales. */
export const measurementString = decimalString
  .refine((value) => Number.parseFloat(value) > 0, { message: 'Debe ser mayor a 0' })
  .refine((value) => decimalsOf(value) <= 3, { message: 'Máximo 3 decimales' });

/** Ley tal como la escriben (fracción 0.875, % 94.5 o ‰ 920.5): hasta 1000 y 4 decimales. */
export const finenessString = decimalString
  .refine((value) => Number.parseFloat(value) > 0 && Number.parseFloat(value) <= 1000, {
    message: 'La ley va entre 0 y 1000 ‰',
  })
  .refine((value) => decimalsOf(value) <= 4, { message: 'Máximo 4 decimales' });

/** Porcentaje negociado: mayor a 0 y hasta 100. */
export const percentageString = decimalString.refine(
  (value) => Number.parseFloat(value) > 0 && Number.parseFloat(value) <= 100,
  { message: 'El porcentaje va entre 0 y 100' },
);

/** Monto de dinero positivo, hasta 2 decimales. */
export const amountString = decimalString
  .refine((value) => Number.parseFloat(value) > 0, { message: 'Debe ser mayor a 0' })
  .refine((value) => decimalsOf(value) <= 2, { message: 'Máximo 2 decimales' });

export const CURRENCIES = ['USDT', 'USD', 'VES', 'BRL'] as const;
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;

/** Fecha de calendario AAAA-MM-DD (sin hora: el negocio registra por día). */
export const isoDate = z.iso.date({ message: 'Fecha inválida (AAAA-MM-DD)' });

export const idSchema = z.string().min(1);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Máximo ${max} caracteres` })
    .optional()
    .transform((value) => (value ? value : undefined));
export const notesSchema = optionalText(500);
export const shortText = optionalText(120);

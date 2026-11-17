import { describe, expect, it } from 'vitest';
import {
  amountString,
  currencySchema,
  decimalString,
  finenessString,
  isoDate,
  measurementString,
  notesSchema,
  percentageString,
} from './decimal-string.ts';

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;

describe('números como texto', () => {
  it('normaliza la coma decimal y los espacios', () => {
    expect(decimalString.parse(' 1250,50 ')).toBe('1250.50');
  });

  it('rechaza lo que no es un número', () => {
    expect(ok(decimalString, '12a')).toBe(false);
    expect(ok(decimalString, '-5')).toBe(false);
  });

  it('una medida es positiva y tiene hasta 3 decimales', () => {
    expect(ok(measurementString, '1000.125')).toBe(true);
    expect(ok(measurementString, '0')).toBe(false);
    expect(ok(measurementString, '10.1234')).toBe(false);
  });

  it('la ley acepta fracción, porcentaje o milésimas hasta 1000', () => {
    expect(['0.9205', '94.5', '920.5'].every((v) => ok(finenessString, v))).toBe(true);
    expect(ok(finenessString, '1000.5')).toBe(false);
    expect(ok(finenessString, '0')).toBe(false);
    expect(ok(finenessString, '0.92055')).toBe(false);
  });

  it('un porcentaje va entre 0 y 100', () => {
    expect(ok(percentageString, '96.5')).toBe(true);
    expect(ok(percentageString, '0')).toBe(false);
    expect(ok(percentageString, '100.1')).toBe(false);
  });

  it('un monto es positivo con hasta 2 decimales', () => {
    expect(ok(amountString, '100000.25')).toBe(true);
    expect(ok(amountString, '0')).toBe(false);
    expect(ok(amountString, '1.255')).toBe(false);
  });
});

describe('otros campos', () => {
  it('acepta solo las monedas del negocio', () => {
    expect(ok(currencySchema, 'USDT')).toBe(true);
    expect(ok(currencySchema, 'EUR')).toBe(false);
  });

  it('las fechas van como AAAA-MM-DD', () => {
    expect(ok(isoDate, '2026-11-17')).toBe(true);
    expect(ok(isoDate, '17/11/2026')).toBe(false);
  });

  it('las notas vacías se omiten y las largas se rechazan', () => {
    expect(notesSchema.parse('')).toBeUndefined();
    expect(notesSchema.parse('  ok ')).toBe('ok');
    expect(ok(notesSchema, 'x'.repeat(501))).toBe(false);
  });
});

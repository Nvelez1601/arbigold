import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatGrams,
  formatGramsOrDash,
  formatMoney,
  formatPerMille,
  formatPercent,
} from './format.ts';

describe('formato es-VE', () => {
  it('gramos con 2 decimales y separadores locales', () => {
    expect(formatGrams('1234567.891')).toBe('1.234.567,89 g');
    expect(formatGrams(0)).toBe('0,00 g');
  });

  it('ley en milésimas', () => {
    expect(formatPerMille('920.5')).toBe('920,5 ‰');
    expect(formatPerMille('999.125')).toBe('999,125 ‰');
  });

  it('porcentajes y montos', () => {
    expect(formatPercent('96.5')).toBe('96,5 %');
    expect(formatMoney('100000', 'USDT')).toBe('100.000,00 USDT');
  });

  it('fechas de calendario sin desfase de zona horaria', () => {
    expect(formatDate('2026-11-17')).toMatch(/^17 nov\.? 2026$/);
    expect(formatDate('2026-01-01T23:00:00Z')).toMatch(/^01 ene\.? 2026$/);
  });

  it('gramos que pueden faltar: guion en vez de un número inválido', () => {
    expect(formatGramsOrDash('1234.5')).toBe('1.234,50 g');
    expect(formatGramsOrDash(null)).toBe('—');
    expect(formatGramsOrDash(undefined)).toBe('—');
  });
});

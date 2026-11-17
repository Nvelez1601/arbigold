import { describe, expect, it } from 'vitest';
import { ValidationError } from '../shared/domain-error.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import { STANDARD_EXPORT_DEDUCTIONS, computeExportProfit } from './export-profit.service.ts';

const fineWeight = GoldWeight.ofGrams('10000');

describe('computeExportProfit (utilidad de una exportación)', () => {
  it('descuenta siempre 1 % de CVM y 0.3 % de exportación sobre el fino', () => {
    const profit = computeExportProfit({ fineWeight, grossPercentage: '2' });
    expect(profit.grossProfit.toString()).toBe('200');
    expect(profit.deductions['CVM']?.toString()).toBe('100');
    expect(profit.deductions['EXPORT']?.toString()).toBe('30');
    expect(profit.totalDeductions.toString()).toBe('130');
    expect(profit.netProfit.toString()).toBe('70');
    expect(profit.netPercentage.toString()).toBe('0.7');
  });

  it.each([
    ['2.5', '120'],
    ['1.5', '20'],
  ])('con un trato al %s %% la utilidad neta es %s g', (grossPercentage, net) => {
    expect(computeExportProfit({ fineWeight, grossPercentage }).netProfit.toString()).toBe(net);
  });

  it('reporta una utilidad negativa si el trato no cubre las deducciones', () => {
    const profit = computeExportProfit({ fineWeight, grossPercentage: '1' });
    expect(profit.netProfit.toString()).toBe('-30');
  });

  it('respeta deducciones pactadas en otro trato', () => {
    const profit = computeExportProfit({
      fineWeight,
      grossPercentage: '2',
      deductions: { CVM: '1' },
    });
    expect(profit.netProfit.toString()).toBe('100');
    expect(Object.keys(profit.deductions)).toEqual(['CVM']);
  });

  it('un envío sin fino no divide por cero', () => {
    const profit = computeExportProfit({ fineWeight: GoldWeight.zero(), grossPercentage: '2' });
    expect(profit.netProfit.isZero()).toBe(true);
    expect(profit.netPercentage.isZero()).toBe(true);
  });

  it('declara las deducciones estándar', () => {
    expect(STANDARD_EXPORT_DEDUCTIONS).toEqual({ CVM: '1', EXPORT: '0.3' });
  });

  it.each([
    [{ grossPercentage: '101' }, 'El % de utilidad negociada debe estar entre 0 y 100'],
    [{ grossPercentage: '-1' }, 'El % de utilidad negociada debe estar entre 0 y 100'],
    [
      { grossPercentage: '2', deductions: { CVM: '150' } },
      'El % de deducción CVM debe estar entre 0 y 100',
    ],
  ])('rechaza porcentajes fuera de rango (%o)', (input, message) => {
    expect(() => computeExportProfit({ fineWeight, ...input })).toThrow(ValidationError);
    expect(() => computeExportProfit({ fineWeight, ...input })).toThrow(message);
  });
});

import { describe, expect, it } from 'vitest';
import { BusinessRuleError, ValidationError } from '../shared/domain-error.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import { Money } from '../shared/money.vo.ts';
import {
  OPERATION_COST_CONCEPTS,
  SETTLEMENT_MODES,
  settleThirdPartyExport,
} from './third-party-settlement.service.ts';

const usdt = (amount: string) => Money.of(amount, 'USDT');

describe('settleThirdPartyExport (material de terceros)', () => {
  it('por UTILIDAD: entra al balance la utilidad neta en gramos finos', () => {
    const result = settleThirdPartyExport({
      mode: 'UTILIDAD',
      profit: { fineWeight: GoldWeight.ofGrams('10000'), grossPercentage: '2' },
    });
    expect(result.mode).toBe('UTILIDAD');
    expect(result.netProfitFineGrams.toString()).toBe('70');
    expect(result.detail.totalDeductions.toString()).toBe('130');
  });

  it('por COBRO_TOTAL: entra al balance todo el costo de la operación, en dinero', () => {
    const result = settleThirdPartyExport({
      mode: 'COBRO_TOTAL',
      currency: 'USDT',
      costs: [
        { concept: 'PIEZAS', amount: usdt('50000') },
        { concept: 'ENVIO', amount: usdt('1200') },
        { concept: 'CUSTODIOS', amount: usdt('800') },
        { concept: 'CUSTODIOS', amount: usdt('200') },
        { concept: 'OTROS', amount: usdt('150.50') },
      ],
    });
    expect(result.mode).toBe('COBRO_TOTAL');
    expect(result.total.equals(usdt('52350.5'))).toBe(true);
    expect(result.byConcept.CUSTODIOS?.equals(usdt('1000'))).toBe(true);
    expect(result.byConcept.PIEZAS?.equals(usdt('50000'))).toBe(true);
  });

  it('el cobro total necesita al menos un costo', () => {
    expect(() =>
      settleThirdPartyExport({ mode: 'COBRO_TOTAL', currency: 'USDT', costs: [] }),
    ).toThrow(ValidationError);
  });

  it('rechaza un costo en cero o negativo', () => {
    expect(() =>
      settleThirdPartyExport({
        mode: 'COBRO_TOTAL',
        currency: 'USDT',
        costs: [{ concept: 'ENVIO', amount: usdt('0') }],
      }),
    ).toThrow('El costo de ENVIO debe ser mayor a 0');
  });

  it('no mezcla monedas en el cobro total', () => {
    expect(() =>
      settleThirdPartyExport({
        mode: 'COBRO_TOTAL',
        currency: 'USDT',
        costs: [{ concept: 'ENVIO', amount: Money.of('100', 'USD') }],
      }),
    ).toThrow(BusinessRuleError);
  });

  it('declara los modos y los conceptos de costo', () => {
    expect(SETTLEMENT_MODES).toEqual(['UTILIDAD', 'COBRO_TOTAL']);
    expect(OPERATION_COST_CONCEPTS).toEqual(['PIEZAS', 'ENVIO', 'CUSTODIOS', 'OTROS']);
  });
});

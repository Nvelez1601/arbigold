import { describe, expect, it } from 'vitest';
import { BusinessRuleError } from './domain-error.ts';
import { CURRENCIES, Money } from './money.vo.ts';

describe('Money', () => {
  it('suma y resta montos de la misma moneda con precisión exacta', () => {
    const balance = Money.of('100000', 'USDT').minus(Money.of('25000.10', 'USDT'));
    expect(balance.amount.toString()).toBe('74999.9');
    expect(Money.zero('USDT').plus(balance).equals(balance)).toBe(true);
  });

  it('permite saldos negativos', () => {
    expect(Money.of('-50000', 'USDT').isPositive()).toBe(false);
    expect(Money.of('1', 'USDT').isPositive()).toBe(true);
  });

  it('nunca mezcla monedas: exige una tasa de cambio explícita', () => {
    expect(() => Money.of('10', 'USD').plus(Money.of('10', 'BRL'))).toThrow(BusinessRuleError);
    expect(() => Money.of('10', 'USD').minus(Money.of('10', 'VES'))).toThrow(
      'No se pueden operar montos de monedas distintas sin una tasa de cambio',
    );
  });

  it('dos montos son iguales solo si coinciden monto y moneda', () => {
    expect(Money.of('10', 'USD').equals(Money.of('10', 'USDT'))).toBe(false);
  });

  it('declara las monedas del negocio', () => {
    expect(CURRENCIES).toEqual(['USDT', 'USD', 'VES', 'BRL']);
  });
});

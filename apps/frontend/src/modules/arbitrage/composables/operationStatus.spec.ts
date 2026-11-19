import { describe, expect, it } from 'vitest';
import {
  OPERATION_AMOUNT_COLUMNS,
  OPERATION_ROW_ACTIONS,
  STATUS_CHANGES,
  statusChangeMessage,
} from './operationStatus.ts';

describe('STATUS_CHANGES', () => {
  it('cubre solo cumplida y cancelada, con texto en español accionable', () => {
    expect(Object.keys(STATUS_CHANGES).sort()).toEqual(['CANCELADA', 'CUMPLIDA']);
    for (const change of Object.values(STATUS_CHANGES)) {
      expect(change.header.length).toBeGreaterThan(0);
      expect(change.accept.length).toBeGreaterThan(0);
      expect(change.consequence.length).toBeGreaterThan(0);
      expect(change.done.length).toBeGreaterThan(0);
    }
  });

  it('cumplida usa severidad primaria y cancelar la de peligro', () => {
    expect(STATUS_CHANGES.CUMPLIDA.severity).toBe('primary');
    expect(STATUS_CHANGES.CANCELADA.severity).toBe('danger');
  });
});

describe('statusChangeMessage', () => {
  const row = { clientName: 'Cliente Ficticio', amount: '25000.5', currency: 'USDT' as const };

  it('nombra al cliente, el monto y lo que deja de sumar', () => {
    expect(statusChangeMessage(row, 'CUMPLIDA')).toBe(
      'La operación de Cliente Ficticio por 25.000,50 USDT queda cumplida y deja de sumar en los gramos abiertos. No se puede deshacer.',
    );
  });

  it('para cancelar avisa que se anula y tampoco se deshace', () => {
    expect(statusChangeMessage(row, 'CANCELADA')).toBe(
      'La operación de Cliente Ficticio por 25.000,50 USDT se anula y deja de sumar en los gramos abiertos. No se puede deshacer.',
    );
  });
});

describe('fila de una operación', () => {
  it('ofrece cumplir o cancelar, cada una con su estado destino', () => {
    expect(OPERATION_ROW_ACTIONS.map((action) => [action.verb, action.status])).toEqual([
      ['Marcar como cumplida', 'CUMPLIDA'],
      ['Cancelar', 'CANCELADA'],
    ]);
  });

  it('formatea el monto (con su P. INT debajo) y los porcentajes con encabezados cortos', () => {
    const operation = {
      amount: '25000.5',
      currency: 'USDT',
      internationalPricePerOunce: '4000',
      clientPercentage: '96',
      supplierPercentage: '97',
    } as Parameters<(typeof OPERATION_AMOUNT_COLUMNS)[number]['value']>[0];
    expect(OPERATION_AMOUNT_COLUMNS.map((c) => [c.header, c.value(operation)])).toEqual([
      ['Monto', '25.000,50 USDT'],
      ['% cli. / prov.', '96,0 % / 97,0 %'],
    ]);
    expect(OPERATION_AMOUNT_COLUMNS[0]?.detail?.(operation)).toBe('a 4.000,00 USD/oz');
    expect(OPERATION_AMOUNT_COLUMNS[1]?.detail).toBeUndefined();
  });
});

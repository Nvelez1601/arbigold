import { describe, expect, it } from 'vitest';
import { STATUS_CHANGES, statusChangeMessage } from './operationStatus.ts';

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

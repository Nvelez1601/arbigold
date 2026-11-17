import { describe, expect, it } from 'vitest';
import { OPERATION_STATUSES, operationInputSchema, operationSchema } from './operations.ts';

const valid = {
  supplierId: 's-1',
  clientId: 'c-1',
  closedOn: '2026-11-17',
  amount: '100000',
  currency: 'USDT',
  internationalPricePerOunce: '4000',
  clientPercentage: '96',
  supplierPercentage: '97',
};

describe('contrato de operación (cierre de precio)', () => {
  it('acepta un cierre completo', () => {
    expect(operationInputSchema.parse(valid).amount).toBe('100000');
  });

  it('exige un precio internacional positivo', () => {
    expect(
      operationInputSchema.safeParse({ ...valid, internationalPricePerOunce: '0' }).success,
    ).toBe(false);
  });

  it('valida los porcentajes del cliente y del proveedor', () => {
    expect(operationInputSchema.safeParse({ ...valid, clientPercentage: '101' }).success).toBe(
      false,
    );
  });

  it('el registro guardado lleva su estado', () => {
    expect(OPERATION_STATUSES).toEqual(['ABIERTA', 'CUMPLIDA', 'CANCELADA']);
    const record = { ...valid, id: 'op-1', status: 'ABIERTA', createdAt: '2026-11-17T10:00:00Z' };
    expect(operationSchema.parse(record).status).toBe('ABIERTA');
  });
});

import { describe, expect, it } from 'vitest';
import { SUPPLIER_KINDS, supplierInputSchema, supplierSchema } from './suppliers.ts';

describe('contrato de proveedor', () => {
  it('distingue proveedores de fondeo y de material de terceros', () => {
    expect(SUPPLIER_KINDS).toEqual(['FONDEO', 'TERCEROS']);
  });

  it('acepta un proveedor con su moneda y su % habitual', () => {
    const parsed = supplierInputSchema.parse({
      name: 'Proveedor Ejemplo',
      kind: 'FONDEO',
      currency: 'USDT',
      defaultPercentage: '97',
    });
    expect(parsed.currency).toBe('USDT');
    expect(parsed.defaultPercentage).toBe('97');
  });

  it('rechaza una moneda que el negocio no usa', () => {
    expect(
      supplierInputSchema.safeParse({ name: 'Ab', kind: 'FONDEO', currency: 'EUR' }).success,
    ).toBe(false);
  });

  it('el registro guardado lleva id, estado y fecha de alta', () => {
    const record = {
      name: 'Ab',
      kind: 'TERCEROS',
      currency: 'USD',
      id: 's-1',
      active: false,
      createdAt: '2026-11-17T10:00:00Z',
    };
    expect(supplierSchema.parse(record).active).toBe(false);
  });
});

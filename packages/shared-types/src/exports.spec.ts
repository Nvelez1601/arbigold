import { describe, expect, it } from 'vitest';
import { EXPORT_STATUSES, SETTLEMENT_MODES, exportInputSchema, exportSchema } from './exports.ts';

const valid = { supplierId: 's-1', shippedOn: '2026-11-17', packingListIds: ['pl-1', 'pl-2'] };

describe('contrato de exportación', () => {
  it('va a un proveedor y agrupa al menos un packing list', () => {
    expect(exportInputSchema.parse(valid).packingListIds).toHaveLength(2);
    expect(exportInputSchema.safeParse({ ...valid, packingListIds: [] }).success).toBe(false);
  });

  it('el % de utilidad y el modo de liquidación son opcionales', () => {
    const parsed = exportInputSchema.parse({
      ...valid,
      grossProfitPercentage: '2',
      settlementMode: 'COBRO_TOTAL',
    });
    expect(parsed.settlementMode).toBe('COBRO_TOTAL');
    expect(SETTLEMENT_MODES).toEqual(['UTILIDAD', 'COBRO_TOTAL']);
  });

  it('el registro guardado lleva su estado', () => {
    expect(EXPORT_STATUSES.at(-1)).toBe('LIQUIDADA');
    const record = {
      ...valid,
      id: 'ex-1',
      status: 'PREPARACION',
      createdAt: '2026-11-17T10:00:00Z',
    };
    expect(exportSchema.parse(record).status).toBe('PREPARACION');
  });
});

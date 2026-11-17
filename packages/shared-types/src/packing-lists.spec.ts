import { describe, expect, it } from 'vitest';
import {
  PACKING_LIST_STATUSES,
  packingListInputSchema,
  packingListSchema,
  residueSchema,
} from './packing-lists.ts';

const pieces = [
  { number: 1, grossWeight: '1000', fineness: '950' },
  { number: 2, grossWeight: '2000.125', fineness: '0.9' },
];

describe('contrato de packing list', () => {
  it('acepta piezas con ley en cualquier escala y sin viruta por defecto', () => {
    const parsed = packingListInputSchema.parse({
      clientId: 'c-1',
      issuedOn: '2026-11-17',
      pieces,
    });
    expect(parsed.pieces).toHaveLength(2);
    expect(parsed.residues).toEqual([]);
  });

  it('exige al menos una pieza y números sin repetir', () => {
    expect(
      packingListInputSchema.safeParse({ clientId: 'c-1', issuedOn: '2026-11-17', pieces: [] })
        .success,
    ).toBe(false);
    const repeated = [pieces[0], { ...pieces[1], number: 1 }];
    const result = packingListInputSchema.safeParse({
      clientId: 'c-1',
      issuedOn: '2026-11-17',
      pieces: repeated,
    });
    expect(result.error?.issues[0]?.message).toBe('Hay números de pieza repetidos');
  });

  it('la viruta o fundición indica de qué piezas sale', () => {
    expect(
      residueSchema.safeParse({ kind: 'VIRUTA', fromPieces: [2], grossWeight: '8.6' }).success,
    ).toBe(true);
    expect(
      residueSchema.safeParse({ kind: 'FUNDICION', fromPieces: [], grossWeight: '1' }).success,
    ).toBe(false);
  });

  it('el registro guardado lleva estado y, si salió, su exportación', () => {
    expect(PACKING_LIST_STATUSES[0]).toBe('BORRADOR');
    const record = {
      clientId: 'c-1',
      issuedOn: '2026-11-17',
      pieces,
      id: 'pl-1',
      status: 'EXPORTADO',
      exportId: 'ex-1',
      createdAt: '2026-11-17T10:00:00Z',
    };
    expect(packingListSchema.parse(record).exportId).toBe('ex-1');
  });
});

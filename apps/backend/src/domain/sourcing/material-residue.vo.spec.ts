import { describe, expect, it } from 'vitest';
import { ValidationError } from '../shared/domain-error.ts';
import { Fineness } from '../shared/fineness.vo.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import { MaterialResidue, RESIDUE_KINDS, RESIDUE_LABELS } from './material-residue.vo.ts';

describe('MaterialResidue (viruta / fundición)', () => {
  it('registra de qué piezas proviene, su peso y su fino si se analizó', () => {
    const residue = MaterialResidue.create({
      kind: 'VIRUTA',
      fromPieces: [2, 3],
      grossWeight: GoldWeight.ofGrams('8.5'),
      fineness: Fineness.parse('900'),
      note: 'Corte para muestra',
    });
    expect(residue.kind).toBe('VIRUTA');
    expect(residue.fromPieces).toEqual([2, 3]);
    expect(residue.grossWeight.grams.toString()).toBe('8.5');
    expect(residue.fineWeight?.grams.toString()).toBe('7.65');
    expect(residue.note).toBe('Corte para muestra');
  });

  it('sin análisis no inventa un fino ni una nota', () => {
    const residue = MaterialResidue.create({
      kind: 'FUNDICION',
      fromPieces: [1],
      grossWeight: GoldWeight.ofGrams('3'),
    });
    expect(residue.fineWeight).toBeNull();
    expect(residue.note).toBeNull();
  });

  it('no repite piezas de origen', () => {
    const residue = MaterialResidue.create({
      kind: 'VIRUTA',
      fromPieces: [4, 4, 5],
      grossWeight: GoldWeight.ofGrams('1'),
    });
    expect(residue.fromPieces).toEqual([4, 5]);
  });

  it('exige indicar al menos una pieza de origen', () => {
    expect(() =>
      MaterialResidue.create({
        kind: 'VIRUTA',
        fromPieces: [],
        grossWeight: GoldWeight.ofGrams('1'),
      }),
    ).toThrow(ValidationError);
  });

  it('declara los tipos de residuo', () => {
    expect(RESIDUE_KINDS).toEqual(['VIRUTA', 'FUNDICION']);
    expect(RESIDUE_LABELS).toEqual({ VIRUTA: 'viruta', FUNDICION: 'fundición' });
  });
});

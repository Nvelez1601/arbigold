import { describe, expect, it } from 'vitest';
import { BusinessRuleError, ValidationError } from '../shared/domain-error.ts';
import { Fineness } from '../shared/fineness.vo.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import { GoldPiece } from './gold-piece.vo.ts';
import { MaterialResidue } from './material-residue.vo.ts';
import { PackingList } from './packing-list.entity.ts';

const ISSUED_ON = new Date('2026-10-22T00:00:00Z');
const piece = (number: number, gross: string, ley: string) =>
  GoldPiece.create({
    number,
    grossWeight: GoldWeight.ofGrams(gross),
    fineness: Fineness.parse(ley),
  });
const emptyList = () =>
  PackingList.create({ id: 'pl-1', clientId: 'cliente-a', issuedOn: ISSUED_ON });

describe('PackingList', () => {
  it('nace vacío, con su cliente y su fecha', () => {
    const list = emptyList();
    expect(list.id).toBe('pl-1');
    expect(list.clientId).toBe('cliente-a');
    expect(list.issuedOn).toBe(ISSUED_ON);
    expect(list.pieces).toEqual([]);
    expect(list.totals().pieces).toBe(0);
    expect(list.totals().fineWeight.grams.isZero()).toBe(true);
  });

  it('suma piezas, peso bruto y peso fino como la hoja semanal', () => {
    const list = emptyList()
      .addPiece(piece(1, '1000', '950'))
      .addPiece(piece(2, '2000', '900'))
      .addPiece(piece(3, '1500.5', '920'));
    const totals = list.totals();
    expect(totals.pieces).toBe(3);
    expect(totals.grossWeight.grams.toString()).toBe('4500.5');
    expect(totals.fineWeight.grams.toString()).toBe('4130.46');
  });

  it('es inmutable: agregar una pieza no modifica el original', () => {
    const original = emptyList();
    original.addPiece(piece(1, '100', '900'));
    expect(original.pieces).toHaveLength(0);
  });

  it('no permite repetir un número de pieza', () => {
    const list = emptyList().addPiece(piece(1, '100', '900'));
    expect(() => list.addPiece(piece(1, '200', '910'))).toThrow(BusinessRuleError);
    expect(() => list.addPiece(piece(1, '200', '910'))).toThrow(
      'La pieza 1 ya está en el packing list',
    );
  });

  it.each([
    { id: ' ', clientId: 'cliente-a' },
    { id: 'pl-1', clientId: '' },
  ])('exige id y cliente', (props) => {
    expect(() => PackingList.create({ ...props, issuedOn: ISSUED_ON })).toThrow(ValidationError);
  });

  describe('viruta y fundición', () => {
    const list = emptyList()
      .addPiece(piece(1, '1000', '950'))
      .addPiece(piece(2, '2000', '900'));
    const viruta = MaterialResidue.create({
      kind: 'VIRUTA',
      fromPieces: [2],
      grossWeight: GoldWeight.ofGrams('8.6'),
    });

    it('se registran como consideración de las piezas existentes, no como piezas nuevas', () => {
      const withResidue = list.addResidue(viruta);
      expect(withResidue.residues).toEqual([viruta]);
      expect(withResidue.pieces).toHaveLength(2);
      expect(withResidue.totals().pieces).toBe(2);
      expect(withResidue.totals().grossWeight.grams.toString()).toBe('3000');
      expect(list.residues).toEqual([]);
    });

    it('no pueden venir de piezas que no están en el packing list', () => {
      const ajena = MaterialResidue.create({
        kind: 'FUNDICION',
        fromPieces: [2, 11],
        grossWeight: GoldWeight.ofGrams('5'),
      });
      expect(() => list.addResidue(ajena)).toThrow(
        'La fundición viene de piezas que no están en el packing list: 11',
      );
    });
  });
});

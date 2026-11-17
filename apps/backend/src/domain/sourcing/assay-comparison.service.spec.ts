import { describe, expect, it } from 'vitest';
import { BusinessRuleError } from '../shared/domain-error.ts';
import { Fineness } from '../shared/fineness.vo.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import { GoldPiece } from './gold-piece.vo.ts';
import { ASSAY_SOURCES, compareWithAssay } from './assay-comparison.service.ts';
import { PackingList } from './packing-list.entity.ts';

const piece = (number: number, gross: string, ley: string) =>
  GoldPiece.create({
    number,
    grossWeight: GoldWeight.ofGrams(gross),
    fineness: Fineness.parse(ley),
  });

/** Packing list del cliente: el peso no cambia en el análisis, solo la ley. */
const original = PackingList.create({
  id: 'pl-7',
  clientId: 'cliente-x',
  issuedOn: new Date('2026-11-14T00:00:00Z'),
})
  .addPiece(piece(1, '1000', '930'))
  .addPiece(piece(2, '500', '940'))
  .addPiece(piece(3, '2000', '900'));

const assay = [piece(1, '1000', '925'), piece(2, '500', '944'), piece(3, '2000', '898')];

describe('compareWithAssay (el comparativo)', () => {
  const result = compareWithAssay({ original, source: 'CARACAS', assay });

  it('compara pieza por pieza: análisis − original', () => {
    expect(result.pieces.map((p) => p.difference.toString())).toEqual(['-5', '2', '-4']);
  });

  it('totaliza el fino original, el del análisis y la diferencia a cobrar', () => {
    expect(result.originalFine.grams.toString()).toBe('3200');
    expect(result.assayFine.grams.toString()).toBe('3193');
    expect(result.difference.toString()).toBe('-7');
  });

  it('expresa la diferencia como % sobre el fino del análisis', () => {
    expect(result.differencePercentage.toDecimalPlaces(2).toString()).toBe('-0.22');
  });

  it('conserva de quién es el packing list y quién hizo el análisis', () => {
    expect(result.packingListId).toBe('pl-7');
    expect(result.clientId).toBe('cliente-x');
    expect(result.source).toBe('CARACAS');
    expect(ASSAY_SOURCES).toEqual(['CARACAS', 'REFINERY']);
  });

  it('acepta el análisis en cualquier orden', () => {
    const reversed = compareWithAssay({
      original,
      source: 'REFINERY',
      assay: [...assay].reverse(),
    });
    expect(reversed.difference.toString()).toBe('-7');
  });

  it('un análisis mejor que el original es un crédito para el cliente', () => {
    const better = [piece(1, '1000', '940'), piece(2, '500', '940'), piece(3, '2000', '900')];
    expect(
      compareWithAssay({ original, source: 'REFINERY', assay: better }).difference.isPositive(),
    ).toBe(true);
  });

  it.each([
    ['falta una pieza', assay.slice(0, 2)],
    ['sobra una pieza', [...assay, piece(4, '100', '900')]],
    ['cambia una pieza por otra', [assay[0], assay[1], piece(9, '2000', '898')]],
    ['repite una pieza', [assay[0], assay[1], assay[2], assay[2]]],
  ])('rechaza el análisis si %s', (_caso, pieces) => {
    expect(() =>
      compareWithAssay({
        original,
        source: 'CARACAS',
        assay: pieces.filter((p) => p !== undefined),
      }),
    ).toThrow(BusinessRuleError);
  });

  it('rechaza comparar un packing list vacío', () => {
    const empty = PackingList.create({ id: 'pl-8', clientId: 'cliente-x', issuedOn: new Date(0) });
    expect(() => compareWithAssay({ original: empty, source: 'CARACAS', assay: [] })).toThrow(
      'El análisis debe traer exactamente las mismas piezas que el packing list',
    );
  });
});

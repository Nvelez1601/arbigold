import type { Decimal } from 'decimal.js';
import { BusinessRuleError } from '../shared/domain-error.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import type { GoldPiece } from './gold-piece.vo.ts';
import type { PackingList } from './packing-list.entity.ts';

/** Quién analizó la pureza: la verificación en Caracas o la refinería en destino. */
export const ASSAY_SOURCES = ['CARACAS', 'REFINERY'] as const;
export type AssaySource = (typeof ASSAY_SOURCES)[number];

export interface AssayComparisonInput {
  /** El packing list que envió el cliente (su ley, normalmente de pistola). */
  readonly original: PackingList;
  readonly source: AssaySource;
  /** Las mismas piezas, con el peso y la ley del análisis. */
  readonly assay: readonly GoldPiece[];
}

export interface PieceComparison {
  readonly number: number;
  readonly originalFine: GoldWeight;
  readonly assayFine: GoldWeight;
  /** análisis − original. Negativo: se le cobra al cliente; positivo: se le acredita. */
  readonly difference: Decimal;
}

export interface AssayComparison {
  readonly packingListId: string;
  readonly clientId: string;
  readonly source: AssaySource;
  readonly pieces: readonly PieceComparison[];
  readonly originalFine: GoldWeight;
  readonly assayFine: GoldWeight;
  readonly difference: Decimal;
  /** difference / fino del análisis × 100 (p. ej. −0.37 %). */
  readonly differencePercentage: Decimal;
}

/**
 * El comparativo: contrasta pieza por pieza el packing list del cliente con el análisis de
 * Caracas o de la refinería. La diferencia total se le cobra (o acredita) al cliente cuando
 * llegan los resultados.
 */
export const compareWithAssay = (input: AssayComparisonInput): AssayComparison => {
  const pieces = pairWithAssay(input).map(([original, assayed]) => comparePiece(original, assayed));
  const originalFine = sum(pieces.map((p) => p.originalFine));
  const assayFine = sum(pieces.map((p) => p.assayFine));
  const difference = assayFine.differenceFrom(originalFine);
  return {
    packingListId: input.original.id,
    clientId: input.original.clientId,
    source: input.source,
    pieces,
    originalFine,
    assayFine,
    difference,
    differencePercentage: difference.dividedBy(assayFine.grams).times(100),
  };
};

/** Empareja cada pieza original con su análisis. Exige exactamente las mismas piezas. */
const pairWithAssay = ({ original, assay }: AssayComparisonInput): [GoldPiece, GoldPiece][] => {
  const assayByNumber = new Map(assay.map((piece) => [piece.number, piece]));
  const pairs = original.pieces.flatMap((piece): [GoldPiece, GoldPiece][] => {
    const assayed = assayByNumber.get(piece.number);
    return assayed ? [[piece, assayed]] : [];
  });
  const complete = pairs.length > 0 && pairs.length === original.pieces.length;
  if (complete && assay.length === pairs.length) return pairs;
  throw new BusinessRuleError(
    'ASSAY_PIECES_MISMATCH',
    'El análisis debe traer exactamente las mismas piezas que el packing list',
    {
      packingListId: original.id,
      expected: original.pieces.map((p) => p.number),
      received: assay.map((p) => p.number),
    },
  );
};

const comparePiece = (original: GoldPiece, assayed: GoldPiece): PieceComparison => ({
  number: original.number,
  originalFine: original.fineWeight,
  assayFine: assayed.fineWeight,
  difference: assayed.fineWeight.differenceFrom(original.fineWeight),
});

const sum = (weights: readonly GoldWeight[]): GoldWeight =>
  weights.reduce((acc, weight) => acc.plus(weight), GoldWeight.zero());

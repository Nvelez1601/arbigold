import { Decimal } from 'decimal.js';
import { ValidationError } from '../shared/domain-error.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';

/** Fino de una pieza según el packing list original y según el análisis de la refinería. */
export interface AssayedPiece {
  readonly clientId: string;
  readonly number: number;
  readonly originalFine: GoldWeight;
  readonly refineryFine: GoldWeight;
}

export interface ClientReconciliation {
  readonly clientId: string;
  readonly originalFine: GoldWeight;
  readonly refineryFine: GoldWeight;
  /** refinería − original. Negativo = merma que se le cobra al cliente; positivo = se le acredita. */
  readonly difference: Decimal;
  /** Participación del cliente en el fino original del envío (0..1). */
  readonly share: Decimal;
}

export interface ShipmentReconciliation {
  readonly byClient: readonly ClientReconciliation[];
  readonly originalFine: GoldWeight;
  readonly refineryFine: GoldWeight;
  readonly difference: Decimal;
}

interface ClientFine {
  readonly clientId: string;
  readonly originalFine: GoldWeight;
  readonly refineryFine: GoldWeight;
}

/** La refinería analizó pieza por pieza: la diferencia de cada cliente es la suma de sus piezas. */
export const reconcileByPiece = (pieces: readonly AssayedPiece[]): ShipmentReconciliation => {
  assertNotEmpty(pieces.length);
  const grouped = new Map<string, ClientFine>();
  for (const piece of pieces) {
    const current = grouped.get(piece.clientId) ?? emptyClient(piece.clientId);
    grouped.set(piece.clientId, {
      clientId: piece.clientId,
      originalFine: current.originalFine.plus(piece.originalFine),
      refineryFine: current.refineryFine.plus(piece.refineryFine),
    });
  }
  return summarize([...grouped.values()]);
};

/**
 * La refinería fundió el envío en bloque y solo informa un fino total: el resultado se reparte
 * entre clientes en proporción a su fino original.
 */
export const reconcileBlockMelt = (
  originalByClient: readonly { readonly clientId: string; readonly originalFine: GoldWeight }[],
  refineryTotalFine: GoldWeight,
): ShipmentReconciliation => {
  assertNotEmpty(originalByClient.length);
  const totalOriginal = sumWeights(originalByClient.map(({ originalFine }) => originalFine));
  return summarize(
    originalByClient.map(({ clientId, originalFine }) => ({
      clientId,
      originalFine,
      refineryFine: GoldWeight.ofGrams(
        refineryTotalFine.grams.times(shareOf(originalFine, totalOriginal)),
      ),
    })),
  );
};

const summarize = (clients: readonly ClientFine[]): ShipmentReconciliation => {
  const originalFine = sumWeights(clients.map((c) => c.originalFine));
  const refineryFine = sumWeights(clients.map((c) => c.refineryFine));
  return {
    byClient: clients.map((c) => ({
      ...c,
      difference: c.refineryFine.differenceFrom(c.originalFine),
      share: shareOf(c.originalFine, originalFine),
    })),
    originalFine,
    refineryFine,
    difference: refineryFine.differenceFrom(originalFine),
  };
};

const sumWeights = (weights: readonly GoldWeight[]): GoldWeight =>
  weights.reduce((acc, weight) => acc.plus(weight), GoldWeight.zero());

const shareOf = (part: GoldWeight, total: GoldWeight): Decimal =>
  total.grams.isZero() ? new Decimal(0) : part.grams.dividedBy(total.grams);

const emptyClient = (clientId: string): ClientFine => ({
  clientId,
  originalFine: GoldWeight.zero(),
  refineryFine: GoldWeight.zero(),
});

const assertNotEmpty = (count: number): void => {
  if (count > 0) return;
  throw new ValidationError('EMPTY_SHIPMENT', 'Un envío sin piezas no se puede conciliar');
};

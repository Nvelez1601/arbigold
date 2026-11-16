import { BusinessRuleError, ValidationError } from '../shared/domain-error.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import type { GoldPiece } from './gold-piece.vo.ts';

export interface PackingListTotals {
  readonly pieces: number;
  readonly grossWeight: GoldWeight;
  readonly fineWeight: GoldWeight;
}

export interface CreatePackingListProps {
  readonly id: string;
  /** Cliente que entrega el oro. */
  readonly clientId: string;
  /** Fecha del packing list (la fija quien lo emite; el dominio no lee el reloj). */
  readonly issuedOn: Date;
}

interface PackingListState extends CreatePackingListProps {
  readonly pieces: readonly GoldPiece[];
}

/**
 * Packing list (lista de empaque): el detalle pieza por pieza del oro que entrega un cliente.
 * Es la unidad que después se agrupa en una exportación. Inmutable: cada cambio devuelve una nueva.
 */
export class PackingList {
  private constructor(private readonly state: PackingListState) {}

  static create(props: CreatePackingListProps): PackingList {
    if (!props.id.trim() || !props.clientId.trim()) {
      throw new ValidationError('PACKING_LIST_INCOMPLETE', 'El packing list necesita id y cliente');
    }
    return new PackingList({ ...props, pieces: [] });
  }

  get id(): string {
    return this.state.id;
  }

  get clientId(): string {
    return this.state.clientId;
  }

  get issuedOn(): Date {
    return this.state.issuedOn;
  }

  get pieces(): readonly GoldPiece[] {
    return this.state.pieces;
  }

  addPiece(piece: GoldPiece): PackingList {
    if (this.state.pieces.some(({ number }) => number === piece.number)) {
      throw new BusinessRuleError(
        'PIECE_NUMBER_DUPLICATED',
        `La pieza ${piece.number} ya está en el packing list`,
        { packingListId: this.state.id, number: piece.number },
      );
    }
    return new PackingList({ ...this.state, pieces: [...this.state.pieces, piece] });
  }

  /** Sumatoria de piezas, peso bruto y peso fino (lo que se revisa cada semana). */
  totals(): PackingListTotals {
    return this.state.pieces.reduce<PackingListTotals>(
      (acc, piece) => ({
        pieces: acc.pieces + 1,
        grossWeight: acc.grossWeight.plus(piece.grossWeight),
        fineWeight: acc.fineWeight.plus(piece.fineWeight),
      }),
      { pieces: 0, grossWeight: GoldWeight.zero(), fineWeight: GoldWeight.zero() },
    );
  }
}

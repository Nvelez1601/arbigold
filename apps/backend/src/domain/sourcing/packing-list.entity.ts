import { BusinessRuleError, ValidationError } from '../shared/domain-error.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import type { GoldPiece } from './gold-piece.vo.ts';
import { type MaterialResidue, RESIDUE_LABELS } from './material-residue.vo.ts';

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
  readonly residues: readonly MaterialResidue[];
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
    return new PackingList({ ...props, pieces: [], residues: [] });
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

  /** Viruta y fundición: consideraciones sobre piezas existentes, fuera de los totales. */
  get residues(): readonly MaterialResidue[] {
    return this.state.residues;
  }

  /** Registra viruta o fundición de piezas que YA están en el packing list. No agrega piezas. */
  addResidue(residue: MaterialResidue): PackingList {
    const numbers = new Set(this.state.pieces.map(({ number }) => number));
    const unknown = residue.fromPieces.filter((number) => !numbers.has(number));
    if (unknown.length > 0) {
      throw new BusinessRuleError(
        'RESIDUE_FROM_UNKNOWN_PIECES',
        `La ${RESIDUE_LABELS[residue.kind]} viene de piezas que no están en el packing list: ${unknown.join(', ')}`,
        { packingListId: this.state.id, unknown },
      );
    }
    return new PackingList({ ...this.state, residues: [...this.state.residues, residue] });
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

  /** Sumatoria de piezas, peso bruto y peso fino. La viruta y la fundición NO suman aquí. */
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

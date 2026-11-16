import { ValidationError } from '../shared/domain-error.ts';
import type { Fineness } from '../shared/fineness.vo.ts';
import type { GoldWeight } from '../shared/gold-weight.vo.ts';

export interface GoldPieceProps {
  /** Número de la pieza dentro de su packing list (1, 2, 3…). */
  readonly number: number;
  /** Peso bruto en gramos: lo que marca la balanza, sin aplicar la ley. */
  readonly grossWeight: GoldWeight;
  /** Ley medida con el análisis (pistola o refinería). */
  readonly fineness: Fineness;
}

/** Una pieza física de oro. Su valor real es el peso fino = bruto × ley / 1000. */
export class GoldPiece {
  readonly fineWeight: GoldWeight;

  private constructor(private readonly props: GoldPieceProps) {
    this.fineWeight = props.fineness.fineWeightOf(props.grossWeight);
  }

  static create(props: GoldPieceProps): GoldPiece {
    if (!Number.isInteger(props.number) || props.number < 1) {
      throw new ValidationError('INVALID_PIECE_NUMBER', 'El número de pieza es un entero desde 1', {
        number: props.number,
      });
    }
    if (props.grossWeight.grams.isZero()) {
      throw new ValidationError('EMPTY_PIECE', 'Una pieza debe pesar más de 0 gramos', {
        number: props.number,
      });
    }
    return new GoldPiece(props);
  }

  get number(): number {
    return this.props.number;
  }

  get grossWeight(): GoldWeight {
    return this.props.grossWeight;
  }

  get fineness(): Fineness {
    return this.props.fineness;
  }
}

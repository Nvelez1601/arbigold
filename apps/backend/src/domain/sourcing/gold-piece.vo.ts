import type { Decimal } from 'decimal.js';
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

/**
 * Decimales máximos de una MEDIDA (peso bruto y ley en ‰): en Venezuela se registran 2 y las
 * refinerías reportan de 1 a 3. Los valores calculados (fino, diferencias) no se truncan.
 */
export const MAX_MEASUREMENT_DECIMALS = 3;

/** Una pieza física de oro. Su valor real es el peso fino = bruto × ley / 1000. */
export class GoldPiece {
  readonly fineWeight: GoldWeight;

  private constructor(private readonly props: GoldPieceProps) {
    this.fineWeight = props.fineness.fineWeightOf(props.grossWeight);
  }

  static create(props: GoldPieceProps): GoldPiece {
    assertPieceNumber(props.number);
    if (props.grossWeight.grams.isZero()) {
      throw new ValidationError('EMPTY_PIECE', 'Una pieza debe pesar más de 0 gramos', {
        number: props.number,
      });
    }
    assertMeasurement(props.grossWeight.grams, 'El peso bruto', props.number);
    assertMeasurement(props.fineness.perMille, 'La ley', props.number);
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

const assertPieceNumber = (number: number): void => {
  if (Number.isInteger(number) && number >= 1) return;
  throw new ValidationError('INVALID_PIECE_NUMBER', 'El número de pieza es un entero desde 1', {
    number,
  });
};

const assertMeasurement = (value: Decimal, field: string, number: number): void => {
  if (value.decimalPlaces() <= MAX_MEASUREMENT_DECIMALS) return;
  throw new ValidationError(
    'TOO_MANY_DECIMALS',
    `${field} de la pieza ${number} admite hasta ${MAX_MEASUREMENT_DECIMALS} decimales`,
    { number, field, value: value.toString() },
  );
};

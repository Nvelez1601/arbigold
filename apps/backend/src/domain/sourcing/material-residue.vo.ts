import { ValidationError } from '../shared/domain-error.ts';
import type { Fineness } from '../shared/fineness.vo.ts';
import type { GoldWeight } from '../shared/gold-weight.vo.ts';

/** Tipos de material residual: salen de las MISMAS piezas, nunca son piezas nuevas. */
export const RESIDUE_KINDS = ['VIRUTA', 'FUNDICION'] as const;
export type ResidueKind = (typeof RESIDUE_KINDS)[number];

export const RESIDUE_LABELS: Record<ResidueKind, string> = {
  VIRUTA: 'viruta',
  FUNDICION: 'fundición',
};

export interface MaterialResidueProps {
  readonly kind: ResidueKind;
  /** Números de las piezas del packing list de las que proviene. */
  readonly fromPieces: readonly number[];
  readonly grossWeight: GoldWeight;
  /** Ley, si se analizó. */
  readonly fineness?: Fineness;
  readonly note?: string;
}

/**
 * Viruta o fundición: una CONSIDERACIÓN sobre piezas existentes del packing list o del envío.
 * No es una pieza: no suma al conteo ni a los totales del packing list (10 piezas siguen siendo 10).
 */
export class MaterialResidue {
  private constructor(private readonly props: MaterialResidueProps) {}

  static create(props: MaterialResidueProps): MaterialResidue {
    if (props.fromPieces.length === 0) {
      throw new ValidationError(
        'RESIDUE_WITHOUT_PIECES',
        'La viruta o fundición debe indicar de qué piezas proviene',
        { kind: props.kind },
      );
    }
    return new MaterialResidue({ ...props, fromPieces: [...new Set(props.fromPieces)] });
  }

  get kind(): ResidueKind {
    return this.props.kind;
  }

  get fromPieces(): readonly number[] {
    return this.props.fromPieces;
  }

  get grossWeight(): GoldWeight {
    return this.props.grossWeight;
  }

  /** Peso fino si se conoce la ley; null si no se analizó. */
  get fineWeight(): GoldWeight | null {
    return this.props.fineness?.fineWeightOf(this.props.grossWeight) ?? null;
  }

  get note(): string | null {
    return this.props.note ?? null;
  }
}

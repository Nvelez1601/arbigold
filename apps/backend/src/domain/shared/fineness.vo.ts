import { Decimal } from 'decimal.js';
import { toDecimal } from './decimal-value.ts';
import { ValidationError } from './domain-error.ts';
import { GoldWeight } from './gold-weight.vo.ts';

const PER_MILLE = new Decimal(1000);
const PERCENT_SCALE = new Decimal(100);

/**
 * Escala en la que llega una ley escrita a mano, decidida por su magnitud:
 *   ≤ 1     → fracción   (0.9205 = 920.5 ‰)
 *   ≤ 100   → porcentaje (94.5   = 945 ‰)  — una ley real menor a 100 ‰ no existe en el negocio
 *   ≤ 1000  → milésimas  (920.5  = 920.5 ‰, la forma canónica)
 */
const SCALES = [
  { upTo: new Decimal(1), toPerMille: (v: Decimal) => v.times(PER_MILLE) },
  { upTo: PERCENT_SCALE, toPerMille: (v: Decimal) => v.times(10) },
  { upTo: PER_MILLE, toPerMille: (v: Decimal) => v },
] as const;

/**
 * Ley (pureza) del oro, guardada SIEMPRE en milésimas (‰): 0 < ley ≤ 1000.
 * peso fino = peso bruto × ley / 1000.
 */
export class Fineness {
  private constructor(readonly perMille: Decimal) {}

  /** Ley ya expresada en milésimas (forma canónica del sistema). */
  static ofPerMille(value: Decimal.Value): Fineness {
    const perMille = toDecimal(value, 'ley');
    if (perMille.lessThanOrEqualTo(0) || perMille.greaterThan(PER_MILLE)) {
      throw new ValidationError('FINENESS_OUT_OF_RANGE', 'La ley debe estar entre 0 y 1000 ‰', {
        perMille: perMille.toString(),
      });
    }
    return new Fineness(perMille);
  }

  /** Normaliza una ley escrita como fracción, porcentaje o milésimas (como llega en los Excel). */
  static parse(value: Decimal.Value): Fineness {
    const raw = toDecimal(value, 'ley');
    const scale = SCALES.find(({ upTo }) => raw.lessThanOrEqualTo(upTo));
    return Fineness.ofPerMille(scale ? scale.toPerMille(raw) : raw);
  }

  /** Peso fino del oro: lo que realmente vale de una pieza. */
  fineWeightOf(gross: GoldWeight): GoldWeight {
    return GoldWeight.ofGrams(gross.grams.times(this.perMille).dividedBy(PER_MILLE));
  }

  asFraction(): Decimal {
    return this.perMille.dividedBy(PER_MILLE);
  }
}

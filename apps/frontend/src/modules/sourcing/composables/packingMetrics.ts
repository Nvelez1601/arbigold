import type { PackingList } from '@arbigold/shared-types';
import { Boxes, ClipboardList, Clock3, Scale } from 'lucide-vue-next';
import { type Metric, type MetricRow, toMetric } from '../../../shared/components/metric.ts';
import { formatGrams } from '../../../shared/utils/format.ts';
import { sumDecimals, toDecimalOrNull } from '../../../shared/utils/gold.ts';
import { pieceTotals } from './usePackingListEditor.ts';

const pieceRowsOf = (list: PackingList) =>
  list.pieces.map((piece) => ({ ...piece, key: '', number: '' }));

export const packingTotalsOf = (list: PackingList) => pieceTotals(pieceRowsOf(list));

/** El inventario en curso: cuántos packing lists hay, cuánto oro fino representan y qué falta recibir. */
export const packingMetrics = (lists: readonly PackingList[]): Metric[] => {
  const totals = lists.map(packingTotalsOf);
  const pending = lists.filter(
    (list) => list.status === 'BORRADOR' || list.status === 'RECIBIDO',
  ).length;
  const drafts = lists.filter((list) => list.status === 'BORRADOR').length;
  const rows: readonly MetricRow[] = [
    ['Packing lists', String(lists.length), `${pending} por recibir`, ClipboardList, true],
    [
      'Piezas registradas',
      String(totals.reduce((sum, total) => sum + total.count, 0)),
      'En todas las entregas',
      Boxes,
    ],
    [
      'Oro fino',
      formatGrams(sumDecimals(totals.map((total) => toDecimalOrNull(total.fine))).toString()),
      'Suma de piezas y leyes',
      Scale,
    ],
    ['Borradores', String(drafts), 'Sin confirmar piezas', Clock3],
  ];
  return rows.map(toMetric);
};

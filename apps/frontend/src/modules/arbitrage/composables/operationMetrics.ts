import type { Operation } from '@arbigold/shared-types';
import { CircleCheckBig, Clock3, Scale, TrendingUp } from 'lucide-vue-next';
import { type Metric, type MetricRow, toMetric } from '../../../shared/components/metric.ts';
import { formatGrams } from '../../../shared/utils/format.ts';
import { openOperationsTotals } from './useOperationForm.ts';

/** El pulso del arbitraje: oro comprometido, margen vivo y en qué punto está cada cierre. */
export const operationMetrics = (operations: readonly Operation[]): Metric[] => {
  const totals = openOperationsTotals(operations);
  const done = operations.filter((operation) => operation.status === 'CUMPLIDA').length;
  const rows: readonly MetricRow[] = [
    [
      'Oro por entregar',
      formatGrams(totals.clientGrams.toString()),
      `${totals.count} operaciones abiertas`,
      Scale,
      true,
    ],
    [
      'Margen abierto',
      formatGrams(totals.margin.toString()),
      'Diferencia entre porcentajes',
      TrendingUp,
    ],
    ['Abiertas', String(totals.count), 'Pendientes de entrega', Clock3],
    ['Cumplidas', String(done), 'Cerradas con entrega', CircleCheckBig],
  ];
  return rows.map(toMetric);
};

import { PackageOpen, PlaneTakeoff, Scale, Truck } from 'lucide-vue-next';
import { type Metric, type MetricRow, toMetric } from '../../../shared/components/metric.ts';
import { formatGrams } from '../../../shared/utils/format.ts';
import { sumDecimals } from '../../../shared/utils/gold.ts';
import type { ExportRow } from './exportTable.ts';

/** El balance de los envíos: qué está en curso, cuánto oro va y cuántas piezas lo componen. */
export const exportMetrics = (rows: readonly ExportRow[]): Metric[] => {
  const preparing = rows.filter(
    (row) => row.record.status === 'PREPARACION' || row.record.status === 'DOCUMENTACION',
  ).length;
  const transit = rows.filter((row) => row.record.status === 'ENVIADA').length;
  const pieces = rows.reduce((sum, row) => sum + row.pieceCount, 0);
  const readings: readonly MetricRow[] = [
    ['Exportaciones', String(rows.length), `${preparing} en preparación`, PlaneTakeoff, true],
    ['En tránsito', String(transit), 'Enviadas al proveedor', Truck],
    [
      'Peso fino',
      formatGrams(sumDecimals(rows.map((row) => row.fine)).toString()),
      'En todas las exportaciones',
      Scale,
    ],
    ['Piezas', String(pieces), 'Empacadas para salir', PackageOpen],
  ];
  return readings.map(toMetric);
};

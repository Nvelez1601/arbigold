import type { Supplier } from '@arbigold/shared-types';
import { CircleAlert, HandCoins, Landmark, Users } from 'lucide-vue-next';
import { type Metric, type MetricRow, toMetric } from '../../../shared/components/metric.ts';

/** Lectura rápida del directorio: cuántos hay, cuántos operan y qué falta completar. */
export const supplierMetrics = (suppliers: readonly Supplier[]): Metric[] => {
  const active = suppliers.filter((supplier) => supplier.active).length;
  const funding = suppliers.filter(
    (supplier) => supplier.active && supplier.kind === 'FONDEO',
  ).length;
  const missing = suppliers.filter(
    (supplier) => supplier.active && !supplier.defaultPercentage,
  ).length;
  const rows: readonly MetricRow[] = [
    ['Proveedores', String(suppliers.length), `${active} activos`, Landmark, true],
    ['Fondeo activo', String(funding), 'Adelantan fondos para operar', HandCoins],
    ['Terceros activos', String(active - funding), 'Traen material propio', Users],
    ['Sin % habitual', String(missing), 'Se negocian a mano', CircleAlert],
  ];
  return rows.map(toMetric);
};

import type { Client } from '@arbigold/shared-types';
import { BadgePercent, Building2, UserRound, Users } from 'lucide-vue-next';
import { type Metric, type MetricRow, toMetric } from '../../../shared/components/metric.ts';

/** Lectura rápida de la cartera: tamaño, mezcla de tipo y quiénes tienen % precargado. */
export const clientMetrics = (clients: readonly Client[]): Metric[] => {
  const active = clients.filter((client) => client.active).length;
  const companies = clients.filter((client) => client.kind === 'EMPRESA').length;
  const withPercent = clients.filter((client) => client.defaultPercentage).length;
  const rows: readonly MetricRow[] = [
    ['Clientes', String(clients.length), `${active} activos`, Users, true],
    ['Empresas', String(companies), 'Compran con RIF', Building2],
    ['Personas', String(clients.length - companies), 'Compran con cédula', UserRound],
    ['Con % habitual', String(withPercent), 'Precarga el cierre', BadgePercent],
  ];
  return rows.map(toMetric);
};

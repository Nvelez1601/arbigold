import type { Component } from 'vue';

/** Una lectura de la franja de métricas de un módulo. */
export interface Metric {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly icon: Component;
  readonly hero?: boolean | undefined;
}

/** Tupla compacta con la que cada módulo declara sus métricas. */
export type MetricRow = readonly [
  label: string,
  value: string,
  detail: string,
  icon: Component,
  hero?: boolean,
];

export const toMetric = ([label, value, detail, icon, hero]: MetricRow): Metric => ({
  label,
  value,
  detail,
  icon,
  hero,
});

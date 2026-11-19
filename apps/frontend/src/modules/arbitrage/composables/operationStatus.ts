import type { Operation } from '@arbigold/shared-types';
import { CircleCheck, CircleX } from 'lucide-vue-next';
import { formatMoney, formatPercent } from '../../../shared/utils/format.ts';

export type StatusChange = Extract<Operation['status'], 'CUMPLIDA' | 'CANCELADA'>;

/** Textos del flujo de cierre/cancelación: qué pasa, cómo se acepta y qué se notifica. */
export const STATUS_CHANGES: Record<
  StatusChange,
  { header: string; consequence: string; accept: string; severity: string; done: string }
> = {
  CUMPLIDA: {
    header: 'Marcar como cumplida',
    consequence: 'queda cumplida y deja de sumar en los gramos abiertos',
    accept: 'Marcar como cumplida',
    severity: 'primary',
    done: 'Operación marcada como cumplida',
  },
  CANCELADA: {
    header: 'Cancelar operación',
    consequence: 'se anula y deja de sumar en los gramos abiertos',
    accept: 'Cancelar operación',
    severity: 'danger',
    done: 'Operación cancelada',
  },
};

/** Mensaje de confirmación antes de tocar el estado: el cambio no se puede deshacer. */
export const statusChangeMessage = (
  row: Pick<Operation, 'amount' | 'currency'> & { clientName: string },
  status: StatusChange,
) =>
  `La operación de ${row.clientName} por ${formatMoney(row.amount, row.currency)} ${STATUS_CHANGES[status].consequence}. No se puede deshacer.`;

/** Acciones de una operación ABIERTA en su fila: mapa declarativo (sin botones repetidos). */
export const OPERATION_ROW_ACTIONS = [
  { status: 'CUMPLIDA', verb: 'Marcar como cumplida', icon: CircleCheck, severity: 'success' },
  { status: 'CANCELADA', verb: 'Cancelar', icon: CircleX, severity: 'danger' },
] as const satisfies readonly {
  status: StatusChange;
  verb: string;
  icon: unknown;
  severity: string;
}[];

/** Columnas numéricas simples de la tabla de operaciones (encabezado corto + valor formateado). */
export const OPERATION_AMOUNT_COLUMNS: readonly {
  header: string;
  value: (operation: Operation) => string;
  /** Dato secundario bajo el valor (p. ej. el precio al que se cerró el monto). */
  detail?: (operation: Operation) => string;
}[] = [
  {
    header: 'Monto',
    value: (op) => formatMoney(op.amount, op.currency),
    detail: (op) => `a ${formatMoney(op.internationalPricePerOunce, 'USD')}/oz`,
  },
  {
    header: '% cli. / prov.',
    value: (op) =>
      `${formatPercent(op.clientPercentage)} / ${formatPercent(op.supplierPercentage)}`,
  },
];

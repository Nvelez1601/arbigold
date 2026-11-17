import type { Operation } from '@arbigold/shared-types';
import { formatMoney } from '../../../shared/utils/format.ts';

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

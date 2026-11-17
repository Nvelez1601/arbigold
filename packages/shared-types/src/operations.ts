import { z } from 'zod';
import {
  amountString,
  currencySchema,
  decimalString,
  idSchema,
  isoDate,
  notesSchema,
  percentageString,
} from './decimal-string.ts';

export const OPERATION_STATUSES = ['ABIERTA', 'CUMPLIDA', 'CANCELADA'] as const;

/** Cierre de precio: el proveedor fondea, el cliente queda debiendo gramos a su %. */
export const operationInputSchema = z.object({
  supplierId: idSchema,
  clientId: idSchema,
  closedOn: isoDate,
  amount: amountString,
  currency: currencySchema,
  /** P. INT: USD por onza troy al momento del cierre. */
  internationalPricePerOunce: decimalString.refine((v) => Number.parseFloat(v) > 0, {
    message: 'Debe ser mayor a 0',
  }),
  clientPercentage: percentageString,
  supplierPercentage: percentageString,
  notes: notesSchema,
});
export type OperationInput = z.input<typeof operationInputSchema>;

export const operationSchema = operationInputSchema.safeExtend({
  id: idSchema,
  status: z.enum(OPERATION_STATUSES),
  createdAt: z.iso.datetime(),
});
export type Operation = z.infer<typeof operationSchema>;

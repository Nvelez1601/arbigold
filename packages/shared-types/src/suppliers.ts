import { z } from 'zod';
import {
  currencySchema,
  idSchema,
  notesSchema,
  percentageString,
  shortText,
} from './decimal-string.ts';

/**
 * FONDEO: adelanta fondos y recibe el oro exportado.
 * TERCEROS: compradores con material propio (token/custodio) y negociación aparte.
 */
export const SUPPLIER_KINDS = ['FONDEO', 'TERCEROS'] as const;

export const supplierInputSchema = z.object({
  name: z.string().trim().min(2, { message: 'Escribe al menos 2 caracteres' }).max(120),
  kind: z.enum(SUPPLIER_KINDS),
  country: shortText,
  currency: currencySchema,
  /** % habitual del cierre con el proveedor (p. ej. 97) o de utilidad en tratos de terceros. */
  defaultPercentage: percentageString.optional(),
  notes: notesSchema,
});
export type SupplierInput = z.input<typeof supplierInputSchema>;

export const supplierSchema = supplierInputSchema.extend({
  id: idSchema,
  active: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type Supplier = z.infer<typeof supplierSchema>;

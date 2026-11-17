import { z } from 'zod';
import { idSchema, isoDate, notesSchema, percentageString, shortText } from './decimal-string.ts';

export const EXPORT_STATUSES = [
  'PREPARACION',
  'DOCUMENTACION',
  'ENVIADA',
  'CON_RESULTADO',
  'LIQUIDADA',
] as const;
export const SETTLEMENT_MODES = ['UTILIDAD', 'COBRO_TOTAL'] as const;

/** Una exportación va a UN proveedor y agrupa packing lists completos (nunca divididos). */
export const exportInputSchema = z.object({
  supplierId: idSchema,
  shippedOn: isoDate,
  destination: shortText,
  packingListIds: z.array(idSchema).min(1, { message: 'Selecciona al menos un packing list' }),
  /** % de utilidad negociado (se le restan 1 % CVM y 0.3 % de exportación). */
  grossProfitPercentage: percentageString.optional(),
  /** Solo para material de terceros. */
  settlementMode: z.enum(SETTLEMENT_MODES).optional(),
  notes: notesSchema,
});
export type ExportInput = z.input<typeof exportInputSchema>;

export const exportSchema = exportInputSchema.extend({
  id: idSchema,
  status: z.enum(EXPORT_STATUSES),
  createdAt: z.iso.datetime(),
});
export type Export = z.infer<typeof exportSchema>;

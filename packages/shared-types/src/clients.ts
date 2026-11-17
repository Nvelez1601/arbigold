import { z } from 'zod';
import { idSchema, notesSchema, percentageString, shortText } from './decimal-string.ts';

export const CLIENT_KINDS = ['PERSONA', 'EMPRESA'] as const;

/** Lo que se captura al registrar o editar un cliente (quien recibe fondos y entrega oro). */
export const clientInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Escribe al menos 2 caracteres' })
    .max(120, { message: 'Máximo 120 caracteres' }),
  kind: z.enum(CLIENT_KINDS),
  documentId: shortText,
  location: shortText,
  phone: shortText,
  /** % habitual al que compra (p. ej. 96.5); cada operación puede negociar otro. */
  defaultPercentage: percentageString.optional(),
  notes: notesSchema,
});
export type ClientInput = z.input<typeof clientInputSchema>;

export const clientSchema = clientInputSchema.extend({
  id: idSchema,
  active: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type Client = z.infer<typeof clientSchema>;

import { z } from 'zod';
import {
  idSchema,
  isoDate,
  measurementString,
  finenessString,
  notesSchema,
} from './decimal-string.ts';

export const PACKING_LIST_STATUSES = [
  'BORRADOR',
  'RECIBIDO',
  'EN_EXPORTACION',
  'EXPORTADO',
  'CONCILIADO',
] as const;

export const pieceSchema = z.object({
  number: z
    .number({ message: 'Número de pieza inválido' })
    .int({ message: 'El número de pieza es entero' })
    .min(1, { message: 'Las piezas se numeran desde 1' }),
  grossWeight: measurementString,
  /** Ley como la escriben (fracción, % o ‰); el sistema la normaliza a ‰. */
  fineness: finenessString,
});
export type PieceInput = z.input<typeof pieceSchema>;

/** Viruta o fundición: sale de piezas existentes; NO es una pieza ni suma a los totales. */
export const RESIDUE_KINDS = ['VIRUTA', 'FUNDICION'] as const;
export const residueSchema = z.object({
  kind: z.enum(RESIDUE_KINDS),
  fromPieces: z.array(z.number().int().min(1)).min(1, { message: 'Indica de qué piezas sale' }),
  grossWeight: measurementString,
  fineness: finenessString.optional(),
  note: notesSchema,
});
export type ResidueInput = z.input<typeof residueSchema>;

const uniqueNumbers = (pieces: readonly { number: number }[]) =>
  new Set(pieces.map((p) => p.number)).size === pieces.length;

export const packingListInputSchema = z.object({
  clientId: idSchema,
  issuedOn: isoDate,
  pieces: z
    .array(pieceSchema)
    .min(1, { message: 'Agrega al menos una pieza' })
    .refine(uniqueNumbers, { message: 'Hay números de pieza repetidos' }),
  residues: z.array(residueSchema).default([]),
  notes: notesSchema,
});
export type PackingListInput = z.input<typeof packingListInputSchema>;

export const packingListSchema = packingListInputSchema.safeExtend({
  id: idSchema,
  status: z.enum(PACKING_LIST_STATUSES),
  exportId: idSchema.optional(),
  createdAt: z.iso.datetime(),
});
export type PackingList = z.infer<typeof packingListSchema>;

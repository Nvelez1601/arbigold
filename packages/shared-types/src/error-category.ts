import { z } from 'zod';

/**
 * Categorías de error compartidas backend ↔ frontend (instructions/error-handling.md).
 * El backend traduce cada categoría a un status HTTP con un mapa; el frontend decide la UX con otro.
 */
export const ERROR_CATEGORIES = [
  'VALIDATION',
  'NOT_FOUND',
  'CONFLICT',
  'FORBIDDEN',
  'UNAUTHENTICATED',
  'BUSINESS_RULE',
  'EXTERNAL_SERVICE',
] as const;

export const errorCategorySchema = z.enum(ERROR_CATEGORIES);
export type ErrorCategory = z.infer<typeof errorCategorySchema>;

/** Forma única de toda respuesta de error de la API. */
export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

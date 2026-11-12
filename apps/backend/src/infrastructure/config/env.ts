import { z } from 'zod';

const DEFAULT_PORT = 3000;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((value) => value.split(',').map((origin) => origin.trim())),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valida la configuración al arrancar (fail fast). El error lista solo los NOMBRES de las
 * variables inválidas, nunca sus valores: pueden ser secretos.
 */
export const loadEnv = (source: Record<string, string | undefined> = process.env): Env => {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;
  const invalidKeys = result.error.issues.map((issue) => issue.path.join('.'));
  throw new Error(`Configuración inválida: ${invalidKeys.join(', ')}`);
};

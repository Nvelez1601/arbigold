import { z } from 'zod';

const DEFAULT_PORT = 3000;
const DEFAULT_POOL_MAX = 10;
const MAX_POOL = 50;

const urlList = z
  .string()
  .min(1)
  .transform((value) => value.split(',').map((origin) => origin.trim()))
  .pipe(z.array(z.url()).min(1));

const postgresUrl = z.url({ protocol: /^postgres(ql)?$/ });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    /** Saltos de proxy confiables (0 en local; 1 detrás de un balanceador). */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    CORS_ORIGINS: urlList,
    DATABASE_URL: postgresUrl,
    DATABASE_SSL: z.stringbool().default(false),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(MAX_POOL).default(DEFAULT_POOL_MAX),
    SUPABASE_URL: z.url(),
    /** Clave pública del proyecto (sb_publishable_…). La secret key NO va en runtime. */
    SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'),
    /** Claves públicas para verificar los JWT de Auth. Por defecto se deriva de SUPABASE_URL. */
    SUPABASE_JWKS_URL: z.url().optional(),
    SUPABASE_JWT_AUDIENCE: z.string().min(1).default('authenticated'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    const insecure = [
      !env.DATABASE_SSL && 'DATABASE_SSL',
      !env.SUPABASE_URL.startsWith('https://') && 'SUPABASE_URL',
      env.SUPABASE_JWKS_URL?.startsWith('http://') && 'SUPABASE_JWKS_URL',
      env.CORS_ORIGINS.some((origin) => !origin.startsWith('https://')) && 'CORS_ORIGINS',
    ].filter((key): key is string => typeof key === 'string');
    for (const key of insecure) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'inseguro en producción' });
    }
  });

export type Env = Omit<z.infer<typeof envSchema>, 'SUPABASE_JWKS_URL'> & {
  readonly SUPABASE_JWKS_URL: string;
};

const JWKS_PATH = '/auth/v1/.well-known/jwks.json';

/**
 * Valida la configuración al arrancar (fail fast). El error lista solo los NOMBRES de las
 * variables inválidas, nunca sus valores: pueden ser secretos (p. ej. DATABASE_URL).
 * En producción exige TLS hacia la base de datos y HTTPS en Supabase y en CORS.
 */
export const loadEnv = (source: Record<string, string | undefined> = process.env): Env => {
  const result = envSchema.safeParse(source);
  if (result.success) {
    const jwksUrl =
      result.data.SUPABASE_JWKS_URL ?? new URL(JWKS_PATH, result.data.SUPABASE_URL).href;
    return { ...result.data, SUPABASE_JWKS_URL: jwksUrl };
  }
  const invalidKeys = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
  throw new Error(`Configuración inválida: ${invalidKeys.join(', ')}`);
};

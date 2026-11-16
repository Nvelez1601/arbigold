import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.ts';

const LOCAL = {
  CORS_ORIGINS: 'http://localhost:5173',
  DATABASE_URL:
    'postgresql://postgres.ejemplo:clave@aws-0-ejemplo.pooler.supabase.com:6543/postgres',
  SUPABASE_URL: 'https://ejemplo-dev.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_clave-de-ejemplo',
};

const PRODUCTION = {
  NODE_ENV: 'production',
  CORS_ORIGINS: 'https://app.arbigold.example',
  DATABASE_URL: 'postgresql://user:secreto@db.example.com:6543/postgres',
  DATABASE_SSL: 'true',
  SUPABASE_URL: 'https://proyecto.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_clave-de-ejemplo',
  TRUST_PROXY: '1',
};

describe('loadEnv', () => {
  it('carga la configuración local con valores por defecto seguros', () => {
    expect(loadEnv(LOCAL)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      TRUST_PROXY: 0,
      CORS_ORIGINS: ['http://localhost:5173'],
      DATABASE_URL: LOCAL.DATABASE_URL,
      DATABASE_SSL: false,
      DATABASE_POOL_MAX: 10,
      SUPABASE_URL: LOCAL.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: LOCAL.SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_JWKS_URL: 'https://ejemplo-dev.supabase.co/auth/v1/.well-known/jwks.json',
      SUPABASE_JWT_AUDIENCE: 'authenticated',
    });
  });

  it('respeta una URL de JWKS explícita', () => {
    const jwks = 'https://otra.example/jwks.json';
    expect(loadEnv({ ...LOCAL, SUPABASE_JWKS_URL: jwks }).SUPABASE_JWKS_URL).toBe(jwks);
  });

  it('rechaza una secret key puesta por error en lugar de la publishable', () => {
    expect(() => loadEnv({ ...LOCAL, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_no-va-aqui' })).toThrow(
      'Configuración inválida: SUPABASE_PUBLISHABLE_KEY',
    );
  });

  it('separa la allowlist de CORS por comas', () => {
    const env = loadEnv({ ...LOCAL, CORS_ORIGINS: 'https://a.example, https://b.example' });
    expect(env.CORS_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
  });

  it('acepta una configuración de producción segura', () => {
    const env = loadEnv(PRODUCTION);
    expect(env.DATABASE_SSL).toBe(true);
    expect(env.TRUST_PROXY).toBe(1);
  });

  it('en producción rechaza conexiones sin TLS o sin HTTPS', () => {
    const insecure = {
      ...PRODUCTION,
      DATABASE_SSL: 'false',
      SUPABASE_URL: 'http://proyecto.supabase.co',
      SUPABASE_JWKS_URL: 'http://proyecto.supabase.co/jwks.json',
      CORS_ORIGINS: 'http://app.arbigold.example',
    };
    expect(() => loadEnv(insecure)).toThrow(
      'Configuración inválida: DATABASE_SSL, SUPABASE_URL, SUPABASE_JWKS_URL, CORS_ORIGINS',
    );
  });

  it('rechaza una URL de base de datos que no es Postgres', () => {
    expect(() => loadEnv({ ...LOCAL, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      'Configuración inválida: DATABASE_URL',
    );
  });

  it('falla al arrancar si falta configuración obligatoria, sin exponer valores', () => {
    const run = () => loadEnv({ PORT: 'secreto-no-numerico' });
    expect(run).toThrow('Configuración inválida: PORT, CORS_ORIGINS, DATABASE_URL, SUPABASE_URL');
    expect(run).not.toThrow(/secreto/);
  });
});

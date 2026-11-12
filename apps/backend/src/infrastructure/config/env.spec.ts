import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.ts';

describe('loadEnv', () => {
  it('carga la configuración con valores por defecto seguros', () => {
    expect(loadEnv({ CORS_ORIGINS: 'http://localhost:5173' })).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:5173'],
    });
  });

  it('separa la allowlist de CORS por comas', () => {
    const env = loadEnv({ CORS_ORIGINS: 'https://a.example, https://b.example', PORT: '8080' });
    expect(env.CORS_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
    expect(env.PORT).toBe(8080);
  });

  it('falla al arrancar si falta configuración obligatoria, sin exponer valores', () => {
    expect(() => loadEnv({ PORT: 'secreto-no-numerico' })).toThrow(
      'Configuración inválida: PORT, CORS_ORIGINS',
    );
  });
});

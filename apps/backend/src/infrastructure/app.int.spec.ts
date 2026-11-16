import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.ts';

const app = createApp({ corsOrigins: ['https://erp.arbigold.test'] });

describe('createApp', () => {
  it('responde el health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('no revela la tecnología del servidor y envía headers de seguridad', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  it('solo autoriza CORS a los orígenes de la allowlist', async () => {
    const allowed = await request(app).get('/health').set('Origin', 'https://erp.arbigold.test');
    const denied = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://erp.arbigold.test');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('por defecto no confía en proxies; en producción confía en los saltos configurados', () => {
    expect(app.get('trust proxy')).toBe(0);
    expect(createApp({ corsOrigins: [], trustProxy: 1 }).get('trust proxy')).toBe(1);
  });

  it('rechaza cuerpos que superan el límite de tamaño', async () => {
    const response = await request(app)
      .post('/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(200_000) }));
    expect(response.status).toBe(413);
  });
});

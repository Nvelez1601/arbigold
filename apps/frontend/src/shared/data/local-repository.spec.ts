import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createLocalRepository } from './local-repository.ts';

const itemSchema = z.object({ id: z.string(), name: z.string(), createdAt: z.string() });
type Item = z.infer<typeof itemSchema>;

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
};

const repo = (storage = memoryStorage()) => {
  let n = 0;
  return createLocalRepository<Item, { name: string }>({
    key: 'items',
    schema: itemSchema,
    storage,
    newId: () => `id-${++n}`,
    now: () => new Date('2026-11-17T10:00:00Z'),
    build: (input, meta) => ({ ...input, ...meta }),
  });
};

describe('repositorio del modo demostración', () => {
  it('empieza vacío y crea registros con id y fecha del sistema', async () => {
    const items = repo();
    expect(await items.list()).toEqual([]);
    const created = await items.create({ name: 'Uno' });
    expect(created).toEqual({ id: 'id-1', name: 'Uno', createdAt: '2026-11-17T10:00:00.000Z' });
    expect(await items.get('id-1')).toEqual(created);
    expect(await items.get('nada')).toBeNull();
  });

  it('actualiza validando contra el esquema y conserva el id', async () => {
    const items = repo();
    await items.create({ name: 'Uno' });
    expect((await items.update('id-1', { name: 'Editado', id: 'otro' })).id).toBe('id-1');
    expect((await items.list())[0]?.name).toBe('Editado');
    await expect(items.update('falta', { name: 'x' })).rejects.toThrow(
      'No existe el registro falta',
    );
  });

  it('elimina registros', async () => {
    const items = repo();
    await items.create({ name: 'Uno' });
    await items.remove('id-1');
    expect(await items.list()).toEqual([]);
  });

  it('descarta datos corruptos sin romper', async () => {
    expect(await repo(memoryStorage({ items: '{no es json' })).list()).toEqual([]);
    expect(await repo(memoryStorage({ items: '{"a":1}' })).list()).toEqual([]);
    const mixed = JSON.stringify([{ id: 'a', name: 'ok', createdAt: 'x' }, { id: 'b' }]);
    expect(await repo(memoryStorage({ items: mixed })).list()).toHaveLength(1);
  });

  it('usa localStorage cuando existe y memoria si el navegador lo bloquea', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const fake = memoryStorage();
    const install = (get: () => unknown) =>
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get });
    const build = (input: { name: string }, meta: { id: string; createdAt: string }) => ({
      ...input,
      ...meta,
    });
    try {
      install(() => fake);
      const real = createLocalRepository<Item, { name: string }>({
        key: 'real',
        schema: itemSchema,
        build,
      });
      expect((await real.create({ name: 'Persistido' })).id).toMatch(/^[0-9a-f-]{36}$/);
      expect(fake.getItem('real')).toContain('Persistido');

      install(() => {
        throw new Error('bloqueado');
      });
      const blocked = createLocalRepository<Item, { name: string }>({
        key: 'b',
        schema: itemSchema,
        build,
      });
      await blocked.create({ name: 'En memoria' });
      expect(await blocked.list()).toHaveLength(1);
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });
});

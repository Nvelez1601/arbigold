import type { z } from 'zod';

/** Puerto de datos de un módulo: las pantallas no saben si detrás hay API o modo demostración. */
export interface Repository<TRecord extends { id: string }, TInput> {
  list(): Promise<TRecord[]>;
  get(id: string): Promise<TRecord | null>;
  create(input: TInput): Promise<TRecord>;
  update(id: string, patch: Partial<TRecord>): Promise<TRecord>;
  remove(id: string): Promise<void>;
}

export interface LocalRepositoryOptions<TRecord extends { id: string }, TInput> {
  /** Clave en el almacenamiento del navegador. */
  readonly key: string;
  readonly schema: z.ZodType<TRecord>;
  /** Cómo nace un registro a partir de lo que se capturó (id, estado y fecha los pone el sistema). */
  readonly build: (input: TInput, meta: { id: string; createdAt: string }) => TRecord;
  readonly storage?: Pick<Storage, 'getItem' | 'setItem'>;
  readonly now?: () => Date;
  readonly newId?: () => string;
}

/**
 * Adaptador del MODO DEMOSTRACIÓN: guarda en localStorage del navegador. Valida cada registro al
 * leerlo (lo corrupto se descarta) y nunca rompe si el almacenamiento no está disponible.
 */
export const createLocalRepository = <TRecord extends { id: string }, TInput>(
  options: LocalRepositoryOptions<TRecord, TInput>,
): Repository<TRecord, TInput> => {
  const store = createStore(options);
  return {
    list: async () => store.read(),
    get: async (id) => store.read().find((record) => record.id === id) ?? null,
    create: async (input) => {
      const record = options.build(input, store.meta());
      store.write([...store.read(), record]);
      return record;
    },
    update: async (id, patch) => {
      const current = store.read().find((record) => record.id === id);
      if (!current) throw new Error(`No existe el registro ${id}`);
      const updated = options.schema.parse({ ...current, ...patch, id });
      store.write(store.read().map((record) => (record.id === id ? updated : record)));
      return updated;
    },
    remove: async (id) => store.write(store.read().filter((record) => record.id !== id)),
  };
};

const createStore = <TRecord extends { id: string }, TInput>(
  options: LocalRepositoryOptions<TRecord, TInput>,
) => {
  const memory = { value: '[]' };
  // Se resuelve en cada acceso (no al importar): si el navegador o un test cambian el
  // almacenamiento, el repositorio usa el vigente.
  const storage = () => options.storage ?? safeLocalStorage(memory);
  return {
    read: (): TRecord[] => parseAll(storage().getItem(options.key), options.schema),
    write: (records: readonly TRecord[]) => storage().setItem(options.key, JSON.stringify(records)),
    meta: () => ({
      id: (options.newId ?? (() => crypto.randomUUID()))(),
      createdAt: (options.now ?? (() => new Date()))().toISOString(),
    }),
  };
};

const parseAll = <TRecord>(raw: string | null, schema: z.ZodType<TRecord>): TRecord[] => {
  const data: unknown = safeJson(raw);
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
};

const safeJson = (raw: string | null): unknown => {
  try {
    return JSON.parse(raw ?? '[]');
  } catch {
    return [];
  }
};

/** localStorage puede no existir o lanzar (modo privado): se cae a memoria sin romper la app. */
const safeLocalStorage = (memory: { value: string }): Pick<Storage, 'getItem' | 'setItem'> => {
  try {
    globalThis.localStorage.getItem('arbigold:probe');
    return globalThis.localStorage;
  } catch {
    return { getItem: () => memory.value, setItem: (_key, value) => void (memory.value = value) };
  }
};

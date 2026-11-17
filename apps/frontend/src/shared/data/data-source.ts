/** De dónde salen los datos. 'demo' = navegador (sin API todavía); 'api' = backend. */
export const DATA_SOURCES = ['demo', 'api'] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const resolveDataSource = (raw: string | undefined): DataSource =>
  DATA_SOURCES.find((source) => source === raw) ?? 'demo';

export const DATA_SOURCE: DataSource = resolveDataSource(import.meta.env.VITE_DATA_SOURCE);

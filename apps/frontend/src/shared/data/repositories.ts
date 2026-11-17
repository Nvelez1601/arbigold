import {
  type Client,
  type ClientInput,
  type Export,
  type ExportInput,
  type Operation,
  type OperationInput,
  type PackingList,
  type PackingListInput,
  type Supplier,
  type SupplierInput,
  clientInputSchema,
  clientSchema,
  exportInputSchema,
  exportSchema,
  operationInputSchema,
  operationSchema,
  packingListInputSchema,
  packingListSchema,
  supplierInputSchema,
  supplierSchema,
} from '@arbigold/shared-types';
import { type Repository, createLocalRepository } from './local-repository.ts';

/**
 * Repositorios de las cinco entidades. Hoy: modo demostración (navegador). Mañana: adaptador HTTP
 * con la misma interfaz, elegido por VITE_DATA_SOURCE. Lo capturado se valida con el contrato
 * compartido; el sistema pone id, fecha de alta y el estado inicial.
 */
export const clientsRepository: Repository<Client, ClientInput> = createLocalRepository({
  key: 'arbigold:clients',
  schema: clientSchema,
  build: (input, meta) => ({ ...clientInputSchema.parse(input), ...meta, active: true }),
});

export const suppliersRepository: Repository<Supplier, SupplierInput> = createLocalRepository({
  key: 'arbigold:suppliers',
  schema: supplierSchema,
  build: (input, meta) => ({ ...supplierInputSchema.parse(input), ...meta, active: true }),
});

export const operationsRepository: Repository<Operation, OperationInput> = createLocalRepository({
  key: 'arbigold:operations',
  schema: operationSchema,
  build: (input, meta) => ({ ...operationInputSchema.parse(input), ...meta, status: 'ABIERTA' }),
});

export const packingListsRepository: Repository<PackingList, PackingListInput> =
  createLocalRepository({
    key: 'arbigold:packing-lists',
    schema: packingListSchema,
    build: (input, meta) => ({
      ...packingListInputSchema.parse(input),
      ...meta,
      status: 'BORRADOR',
    }),
  });

export const exportsRepository: Repository<Export, ExportInput> = createLocalRepository({
  key: 'arbigold:exports',
  schema: exportSchema,
  build: (input, meta) => ({ ...exportInputSchema.parse(input), ...meta, status: 'PREPARACION' }),
});

/** Claves de vue-query: invalidar una clave refresca todas las pantallas que la leen. */
export const QUERY_KEYS = {
  clients: ['clients'],
  suppliers: ['suppliers'],
  operations: ['operations'],
  packingLists: ['packing-lists'],
  exports: ['exports'],
} as const;

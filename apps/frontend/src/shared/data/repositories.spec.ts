import { beforeEach, describe, expect, it } from 'vitest';
import {
  QUERY_KEYS,
  clientsRepository,
  exportsRepository,
  operationsRepository,
  packingListsRepository,
  suppliersRepository,
} from './repositories.ts';

/** Node 26 trae su propio localStorage vacío: los tests instalan uno en memoria. */
beforeEach(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    },
  });
});

describe('repositorios del modo demostración', () => {
  it('un cliente nace activo, con el contrato aplicado', async () => {
    const client = await clientsRepository.create({
      name: ' Cliente Ejemplo ',
      kind: 'PERSONA',
      phone: '',
    });
    expect(client).toMatchObject({ name: 'Cliente Ejemplo', kind: 'PERSONA', active: true });
    expect(client.phone).toBeUndefined();
    expect(await clientsRepository.list()).toHaveLength(1);
  });

  it('un proveedor nace activo', async () => {
    const supplier = await suppliersRepository.create({
      name: 'Proveedor Ejemplo',
      kind: 'FONDEO',
      currency: 'USDT',
    });
    expect(supplier.active).toBe(true);
  });

  it('una operación nace ABIERTA', async () => {
    const operation = await operationsRepository.create({
      supplierId: 's-1',
      clientId: 'c-1',
      closedOn: '2026-11-17',
      amount: '100000',
      currency: 'USDT',
      internationalPricePerOunce: '4000',
      clientPercentage: '96',
      supplierPercentage: '97',
    });
    expect(operation.status).toBe('ABIERTA');
  });

  it('un packing list nace en BORRADOR y una exportación en PREPARACION', async () => {
    const list = await packingListsRepository.create({
      clientId: 'c-1',
      issuedOn: '2026-11-17',
      pieces: [{ number: 1, grossWeight: '1000', fineness: '950' }],
    });
    expect(list.status).toBe('BORRADOR');
    const shipment = await exportsRepository.create({
      supplierId: 's-1',
      shippedOn: '2026-11-17',
      packingListIds: [list.id],
    });
    expect(shipment.status).toBe('PREPARACION');
  });

  it('rechaza lo que no cumple el contrato', async () => {
    await expect(clientsRepository.create({ name: 'A', kind: 'PERSONA' })).rejects.toThrow();
  });

  it('declara una clave de vue-query por entidad', () => {
    expect(Object.keys(QUERY_KEYS)).toEqual([
      'clients',
      'suppliers',
      'operations',
      'packingLists',
      'exports',
    ]);
  });
});

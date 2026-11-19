import { type Page, expect, test } from '@playwright/test';

/** Datos de operación para que las capturas muestren el sistema con trabajo real, no vacío. */
const SEED = {
  'arbigold:clients': [
    {
      id: 'c-1',
      name: 'Comercial Orinoco',
      kind: 'EMPRESA',
      documentId: 'J-40123456-7',
      location: 'Ciudad Bolívar',
      phone: '+58 414 555 0101',
      defaultPercentage: '96',
      active: true,
      createdAt: '2026-10-02T09:00:00.000Z',
    },
    {
      id: 'c-2',
      name: 'María Fernanda Rojas',
      kind: 'PERSONA',
      documentId: 'V-18765432',
      location: 'Puerto Ordaz',
      defaultPercentage: '96.5',
      active: true,
      createdAt: '2026-10-08T09:00:00.000Z',
    },
    {
      id: 'c-3',
      name: 'Inversiones Apure',
      kind: 'EMPRESA',
      documentId: 'J-40999888-1',
      location: 'San Fernando de Apure',
      active: false,
      createdAt: '2026-09-14T09:00:00.000Z',
    },
  ],
  'arbigold:suppliers': [
    {
      id: 's-1',
      name: 'Golden Bridge FZE',
      kind: 'FONDEO',
      country: 'Emiratos Árabes Unidos',
      currency: 'USD',
      defaultPercentage: '97',
      active: true,
      createdAt: '2026-09-20T09:00:00.000Z',
    },
    {
      id: 's-2',
      name: 'Custodia Andina',
      kind: 'TERCEROS',
      country: 'Colombia',
      currency: 'USDT',
      defaultPercentage: '3',
      active: true,
      createdAt: '2026-10-11T09:00:00.000Z',
    },
    {
      id: 's-3',
      name: 'Fondo del Sur',
      kind: 'FONDEO',
      country: 'Panamá',
      currency: 'USD',
      active: false,
      createdAt: '2026-08-05T09:00:00.000Z',
    },
  ],
  'arbigold:operations': [
    {
      id: 'o-1',
      supplierId: 's-1',
      clientId: 'c-1',
      closedOn: '2026-11-04',
      amount: '25000',
      currency: 'USD',
      internationalPricePerOunce: '2650.4',
      clientPercentage: '96',
      supplierPercentage: '97',
      status: 'ABIERTA',
      createdAt: '2026-11-04T14:10:00.000Z',
    },
    {
      id: 'o-2',
      supplierId: 's-1',
      clientId: 'c-2',
      closedOn: '2026-11-07',
      amount: '18000',
      currency: 'USD',
      internationalPricePerOunce: '2644.8',
      clientPercentage: '96.5',
      supplierPercentage: '97',
      status: 'ABIERTA',
      createdAt: '2026-11-07T11:30:00.000Z',
    },
    {
      id: 'o-3',
      supplierId: 's-1',
      clientId: 'c-1',
      closedOn: '2026-10-28',
      amount: '32000',
      currency: 'USD',
      internationalPricePerOunce: '2701.2',
      clientPercentage: '96',
      supplierPercentage: '97',
      status: 'CUMPLIDA',
      createdAt: '2026-10-28T16:45:00.000Z',
    },
    {
      id: 'o-4',
      supplierId: 's-2',
      clientId: 'c-2',
      closedOn: '2026-10-19',
      amount: '7500',
      currency: 'USDT',
      internationalPricePerOunce: '2688',
      clientPercentage: '96.5',
      supplierPercentage: '97',
      status: 'CANCELADA',
      createdAt: '2026-10-19T10:20:00.000Z',
    },
  ],
  'arbigold:packing-lists': [
    {
      id: 'p-1',
      clientId: 'c-1',
      issuedOn: '2026-11-10',
      pieces: [
        { number: 1, grossWeight: '1000', fineness: '995' },
        { number: 2, grossWeight: '500', fineness: '990' },
      ],
      residues: [{ kind: 'VIRUTA', fromPieces: [1], grossWeight: '4.2', note: 'Barrido de mesa' }],
      status: 'BORRADOR',
      createdAt: '2026-11-10T09:00:00.000Z',
    },
    {
      id: 'p-2',
      clientId: 'c-2',
      issuedOn: '2026-11-09',
      pieces: [
        { number: 1, grossWeight: '750', fineness: '0.995' },
        { number: 2, grossWeight: '250', fineness: '998' },
      ],
      residues: [],
      status: 'RECIBIDO',
      createdAt: '2026-11-09T09:00:00.000Z',
    },
    {
      id: 'p-3',
      clientId: 'c-1',
      issuedOn: '2026-10-30',
      pieces: [{ number: 1, grossWeight: '1200', fineness: '996' }],
      residues: [],
      status: 'EXPORTADO',
      exportId: 'e-1',
      createdAt: '2026-10-30T09:00:00.000Z',
    },
    {
      id: 'p-4',
      clientId: 'c-2',
      issuedOn: '2026-10-12',
      pieces: [{ number: 1, grossWeight: '300', fineness: '999' }],
      residues: [],
      status: 'CONCILIADO',
      exportId: 'e-2',
      createdAt: '2026-10-12T09:00:00.000Z',
    },
  ],
  'arbigold:exports': [
    {
      id: 'e-1',
      supplierId: 's-1',
      shippedOn: '2026-11-02',
      destination: 'Dubái',
      packingListIds: ['p-3'],
      grossProfitPercentage: '3',
      settlementMode: 'UTILIDAD',
      status: 'ENVIADA',
      createdAt: '2026-11-02T08:00:00.000Z',
    },
    {
      id: 'e-2',
      supplierId: 's-2',
      shippedOn: '2026-10-15',
      destination: 'Estambul',
      packingListIds: ['p-4'],
      grossProfitPercentage: '2.5',
      settlementMode: 'UTILIDAD',
      status: 'LIQUIDADA',
      createdAt: '2026-10-15T08:00:00.000Z',
    },
  ],
};

const seed = async (page: Page) => {
  await page.addInitScript((data) => {
    for (const [key, records] of Object.entries(data)) {
      window.localStorage.setItem(key, JSON.stringify(records));
    }
  }, SEED);
};

test('verifica la navegación y captura el sistema con datos reales', async ({ page }) => {
  await seed(page);

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
  await expect(page.getByText('Oro por entregar').first()).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/panel.png', fullPage: true });

  const screens = [
    ['/proveedores', 'Proveedores'],
    ['/clientes', 'Clientes'],
    ['/operaciones', 'Operaciones'],
    ['/packing-lists', 'Packing lists'],
    ['/exportaciones', 'Exportaciones'],
  ] as const;

  for (const [path, heading] of screens) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await page.screenshot({
      path: `e2e/screenshots/${path.slice(1)}.png`,
      fullPage: true,
    });
  }
});

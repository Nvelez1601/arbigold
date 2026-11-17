import type { Client, Operation, Supplier } from '@arbigold/shared-types';
import { Decimal } from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import {
  closurePreview,
  emptyOperationDraft,
  firstInvalidField,
  listMissing,
  marginTextClass,
  marginTone,
  newestFirst,
  openOperationsTotals,
  operationFigures,
  todayIsoDate,
  useOperationForm,
  validateOperationDraft,
} from './useOperationForm.ts';

/** Datos ficticios: ni nombres ni montos reales. */
const CLOSURE = {
  amount: '100000',
  internationalPricePerOunce: '4000',
  clientPercentage: '96',
  supplierPercentage: '97',
};
const twoDecimals = (value: Decimal | null) => value?.toDecimalPlaces(2).toFixed(2);

const supplier = (overrides: Partial<Supplier> = {}): Supplier => ({
  id: 'prov-1',
  name: 'Proveedor Ficticio',
  kind: 'FONDEO',
  country: undefined,
  notes: undefined,
  currency: 'USD',
  defaultPercentage: '97',
  active: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});
const client = (overrides: Partial<Client> = {}): Client => ({
  id: 'cli-1',
  name: 'Cliente Ficticio',
  kind: 'PERSONA',
  documentId: undefined,
  location: undefined,
  phone: undefined,
  notes: undefined,
  defaultPercentage: '96.5',
  active: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});
const operation = (overrides: Partial<Operation> = {}): Operation => ({
  id: 'op-1',
  supplierId: 'prov-1',
  clientId: 'cli-1',
  closedOn: '2026-11-10',
  currency: 'USDT',
  status: 'ABIERTA',
  notes: undefined,
  createdAt: '2026-11-10T10:00:00.000Z',
  ...CLOSURE,
  ...overrides,
});

describe('vista previa del cierre de precio', () => {
  it('con 100 000 USDT a P. INT 4000, 96 % y 97 % calcula precio por gramo, gramos y margen', () => {
    const preview = closurePreview(CLOSURE);
    expect(preview.pricePerGram?.toDecimalPlaces(4).toFixed(4)).toBe('128.6029');
    expect(twoDecimals(preview.clientGrams)).toBe('809.99');
    expect(twoDecimals(preview.supplierGrams)).toBe('801.64');
    expect(twoDecimals(preview.margin)).toBe('8.35');
    expect(preview.missing).toEqual([]);
  });

  it('con P. INT 2000 el cliente debe ≈ 1 619,97 g, el proveedor ≈ 1 603,27 g y el margen ≈ 16,70 g', () => {
    const preview = closurePreview({ ...CLOSURE, internationalPricePerOunce: '2000' });
    expect(twoDecimals(preview.clientGrams)).toBe('1619.97');
    expect(twoDecimals(preview.supplierGrams)).toBe('1603.27');
    expect(twoDecimals(preview.margin)).toBe('16.70');
  });

  it('calcula el precio negociado por gramo de cada parte con su %', () => {
    const preview = closurePreview(CLOSURE);
    expect(twoDecimals(preview.clientPricePerGram)).toBe('123.46');
    expect(twoDecimals(preview.supplierPricePerGram)).toBe('124.74');
  });

  it('el margen es negativo si el % del cliente supera al del proveedor', () => {
    const preview = closurePreview({ ...CLOSURE, clientPercentage: '98' });
    expect(preview.margin?.isNegative()).toBe(true);
    expect(marginTone(preview.margin ?? new Decimal(0))).toBe('loss');
  });

  it('acepta coma decimal como la escribe el usuario', () => {
    const preview = closurePreview({ ...CLOSURE, clientPercentage: '96,0' });
    expect(twoDecimals(preview.clientGrams)).toBe('809.99');
  });

  it('dice qué datos faltan en vez de calcular con vacíos o ceros', () => {
    const preview = closurePreview({
      amount: '',
      internationalPricePerOunce: '0',
      clientPercentage: 'abc',
      supplierPercentage: '97',
    });
    expect(preview.pricePerGram).toBeNull();
    expect(preview.clientGrams).toBeNull();
    expect(preview.margin).toBeNull();
    expect(listMissing(preview.missing)).toBe('el monto, el P. INT y el % del cliente');
  });
});

describe('tono del margen', () => {
  it('distingue ganancia, pérdida y margen nulo con su color', () => {
    expect(marginTextClass(new Decimal('16.7'))).toBe('text-success');
    expect(marginTextClass(new Decimal('-0.5'))).toBe('text-danger');
    expect(marginTextClass(new Decimal(0))).toBe('text-heading');
    expect(marginTextClass(null)).toBe('text-muted');
  });
});

describe('cifras de las operaciones registradas', () => {
  it('cada operación muestra sus gramos y su margen', () => {
    const figures = operationFigures(operation());
    expect(twoDecimals(figures.clientGrams)).toBe('809.99');
    expect(twoDecimals(figures.margin)).toBe('8.35');
  });

  it('los totales solo suman las operaciones abiertas', () => {
    const totals = openOperationsTotals([
      operation({ id: 'a' }),
      operation({ id: 'b' }),
      operation({ id: 'c', status: 'CUMPLIDA' }),
      operation({ id: 'd', status: 'CANCELADA' }),
    ]);
    expect(totals.count).toBe(2);
    expect(twoDecimals(totals.clientGrams)).toBe('1619.97');
    expect(twoDecimals(totals.margin)).toBe('16.70');
  });

  it('ordena de la más reciente a la más antigua, y por hora de alta si es el mismo día', () => {
    const ordered = newestFirst([
      operation({ id: 'vieja', closedOn: '2026-11-01' }),
      operation({ id: 'temprano', createdAt: '2026-11-10T08:00:00.000Z' }),
      operation({ id: 'tarde', createdAt: '2026-11-10T18:00:00.000Z' }),
    ]);
    expect(ordered.map((op) => op.id)).toEqual(['tarde', 'temprano', 'vieja']);
  });
});

describe('validación con el contrato compartido', () => {
  const validDraft = () => ({
    ...emptyOperationDraft('2026-11-17'),
    ...CLOSURE,
    supplierId: 'prov-1',
    clientId: 'cli-1',
  });

  it('un borrador completo pasa y se entrega como texto', () => {
    const { input, errors } = validateOperationDraft(validDraft());
    expect(errors).toEqual({});
    expect(input).toMatchObject({ amount: '100000', clientPercentage: '96' });
  });

  it('pide elegir proveedor y cliente y explica cómo corregir cada número', () => {
    const { input, errors } = validateOperationDraft({
      ...validDraft(),
      supplierId: '',
      clientId: '',
      closedOn: '',
      amount: '12.345',
      clientPercentage: '120',
    });
    expect(input).toBeNull();
    expect(errors.supplierId).toBe('Elige el proveedor que adelanta el monto');
    expect(errors.clientId).toBe('Elige el cliente que recibe el monto');
    expect(errors.closedOn).toBe('Escribe la fecha del cierre (AAAA-MM-DD)');
    expect(errors.amount).toBe('Máximo 2 decimales');
    expect(errors.clientPercentage).toBe('El porcentaje va entre 0 y 100');
  });

  it('el primer error en el orden del formulario recibe el foco', () => {
    expect(firstInvalidField({ amount: 'x', clientId: 'y' })).toBe('clientId');
    expect(firstInvalidField({})).toBeUndefined();
  });

  it('la fecha por defecto es hoy en formato AAAA-MM-DD', () => {
    expect(todayIsoDate(new Date(2026, 10, 17, 9))).toBe('2026-11-17');
  });
});

describe('useOperationForm', () => {
  const setup = () =>
    useOperationForm(
      {
        suppliers: ref([supplier(), supplier({ id: 'prov-2', defaultPercentage: undefined })]),
        clients: ref([client(), client({ id: 'cli-2', defaultPercentage: undefined })]),
      },
      () => '2026-11-17',
    );

  it('al elegir proveedor precarga su % habitual y su moneda', () => {
    const form = setup();
    form.selectSupplier('prov-1');
    expect(form.draft).toMatchObject({
      supplierId: 'prov-1',
      supplierPercentage: '97',
      currency: 'USD',
    });
  });

  it('al elegir cliente precarga su % habitual', () => {
    const form = setup();
    form.selectClient('cli-1');
    expect(form.draft.clientPercentage).toBe('96.5');
  });

  it('si la parte no tiene % habitual conserva lo que ya se escribió', () => {
    const form = setup();
    form.draft.clientPercentage = '95';
    form.draft.supplierPercentage = '96';
    form.selectClient('cli-2');
    form.selectSupplier('prov-2');
    form.selectSupplier('inexistente');
    expect(form.draft.clientPercentage).toBe('95');
    expect(form.draft.supplierPercentage).toBe('96');
  });

  it('valida, guarda los errores y al reiniciar vuelve al borrador de hoy', () => {
    const form = setup();
    expect(form.validate()).toBeNull();
    expect(form.errors.value.supplierId).toBeDefined();
    form.draft.amount = '500';
    form.reset();
    expect(form.draft.amount).toBe('');
    expect(form.draft.closedOn).toBe('2026-11-17');
    expect(form.errors.value).toEqual({});
  });

  it('sabe si el borrador cambió desde que se abrió, para no perder datos al cerrar', () => {
    const form = setup();
    expect(form.isDirty.value).toBe(false);
    form.draft.amount = '100';
    expect(form.isDirty.value).toBe(true);
    form.reset();
    expect(form.isDirty.value).toBe(false);
  });

  it('devuelve el input cuando todo es válido', () => {
    const form = setup();
    form.selectSupplier('prov-1');
    form.selectClient('cli-1');
    Object.assign(form.draft, { amount: '100000', internationalPricePerOunce: '4000' });
    expect(form.validate()).toMatchObject({ supplierId: 'prov-1', clientPercentage: '96.5' });
  });
});

import {
  type Client,
  type Currency,
  type Operation,
  type OperationInput,
  type Supplier,
  operationInputSchema,
} from '@arbigold/shared-types';
import type { Decimal } from 'decimal.js';
import { type Ref, computed, reactive, ref } from 'vue';
import {
  TROY_OUNCE_IN_GRAMS,
  closedGrams,
  sumDecimals,
  toDecimalOrNull,
} from '../../../shared/utils/gold.ts';

/** Lo que el usuario escribe: todo como texto (montos y % nunca viajan como number). */
export interface OperationDraft {
  supplierId: string;
  clientId: string;
  closedOn: string;
  amount: string;
  currency: Currency;
  internationalPricePerOunce: string;
  clientPercentage: string;
  supplierPercentage: string;
  notes: string;
}
export type OperationField = keyof OperationDraft;
export type OperationErrors = Partial<Record<OperationField, string>>;

/** Orden visual del formulario: el foco va al primer campo con error en este orden. */
export const OPERATION_FIELDS: readonly OperationField[] = [
  'supplierId',
  'clientId',
  'closedOn',
  'amount',
  'currency',
  'internationalPricePerOunce',
  'clientPercentage',
  'supplierPercentage',
  'notes',
];

/** Un Select vacío no es "un número inválido": se dice qué elegir. */
const BLANK_FIELD_MESSAGES: Partial<Record<OperationField, string>> = {
  supplierId: 'Elige el proveedor que adelanta el monto',
  clientId: 'Elige el cliente que recibe el monto',
  closedOn: 'Escribe la fecha del cierre (AAAA-MM-DD)',
};

/** Hoy en la zona horaria del usuario, como AAAA-MM-DD (en-CA formatea así). */
export const todayIsoDate = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA').format(now);

export const emptyOperationDraft = (today: string): OperationDraft => ({
  supplierId: '',
  clientId: '',
  closedOn: today,
  amount: '',
  currency: 'USDT',
  internationalPricePerOunce: '',
  clientPercentage: '',
  supplierPercentage: '',
  notes: '',
});

export type ClosureInputs = Pick<
  OperationDraft,
  'amount' | 'internationalPricePerOunce' | 'clientPercentage' | 'supplierPercentage'
>;

export interface ClosurePreviewFigures {
  readonly pricePerGram: Decimal | null;
  readonly clientPricePerGram: Decimal | null;
  readonly supplierPricePerGram: Decimal | null;
  readonly clientGrams: Decimal | null;
  readonly supplierGrams: Decimal | null;
  readonly margin: Decimal | null;
  /** Nombres legibles de los datos que faltan o no son válidos para cerrar el cálculo. */
  readonly missing: readonly string[];
}

const CLOSURE_LABELS: Record<keyof ClosureInputs, string> = {
  amount: 'el monto',
  internationalPricePerOunce: 'el P. INT',
  clientPercentage: 'el % del cliente',
  supplierPercentage: 'el % del proveedor',
};

const positiveOrNull = (value: string): Decimal | null => {
  const decimal = toDecimalOrNull(value);
  return decimal && decimal.greaterThan(0) ? decimal : null;
};

const negotiatedPrice = (pricePerGram: Decimal | null, percentage: string): Decimal | null => {
  const pct = positiveOrNull(percentage);
  if (!pricePerGram || !pct || pct.greaterThan(100)) return null;
  return pricePerGram.times(pct).dividedBy(100);
};

const differenceOrNull = (minuend: Decimal | null, subtrahend: Decimal | null) =>
  minuend && subtrahend ? minuend.minus(subtrahend) : null;

/** Vista previa del cierre de precio (modelo operativo §4). El backend recalcula al guardar. */
export const closurePreview = (inputs: ClosureInputs): ClosurePreviewFigures => {
  const price = positiveOrNull(inputs.internationalPricePerOunce);
  const pricePerGram = price ? price.dividedBy(TROY_OUNCE_IN_GRAMS) : null;
  const { amount, internationalPricePerOunce: ounce } = inputs;
  const clientGrams = closedGrams(amount, ounce, inputs.clientPercentage);
  const supplierGrams = closedGrams(amount, ounce, inputs.supplierPercentage);
  const fields = Object.keys(CLOSURE_LABELS) as (keyof ClosureInputs)[];
  return {
    pricePerGram,
    clientPricePerGram: negotiatedPrice(pricePerGram, inputs.clientPercentage),
    supplierPricePerGram: negotiatedPrice(pricePerGram, inputs.supplierPercentage),
    clientGrams,
    supplierGrams,
    margin: differenceOrNull(clientGrams, supplierGrams),
    missing: fields.filter((field) => !positiveOrNull(inputs[field])).map((f) => CLOSURE_LABELS[f]),
  };
};

/** "el monto, el P. INT y el % del cliente". */
export const listMissing = (missing: readonly string[]): string =>
  new Intl.ListFormat('es', { type: 'conjunction' }).format(missing);

export type MarginTone = 'gain' | 'loss' | 'even';
const TONE_BY_SIGN: Record<string, MarginTone> = { '1': 'gain', '-1': 'loss', '0': 'even' };
export const marginTone = (margin: Decimal): MarginTone =>
  TONE_BY_SIGN[String(margin.comparedTo(0))] ?? 'even';

/** Ganancia en verde, pérdida en rojo: el margen negativo se muestra tal cual, nunca se oculta. */
const MARGIN_TEXT_CLASS: Record<MarginTone, string> = {
  gain: 'text-success',
  loss: 'text-danger',
  even: 'text-heading',
};
export const marginTextClass = (margin: Decimal | null): string =>
  margin ? MARGIN_TEXT_CLASS[marginTone(margin)] : 'text-muted';

/** Cómo se nombra y colorea cada estado en la tabla (Tag de PrimeVue). */
export const OPERATION_STATUS_TAG: Record<
  Operation['status'],
  { value: string; severity: string }
> = {
  ABIERTA: { value: 'Abierta', severity: 'info' },
  CUMPLIDA: { value: 'Cumplida', severity: 'success' },
  CANCELADA: { value: 'Cancelada', severity: 'secondary' },
};

export interface OperationFigures {
  readonly clientGrams: Decimal | null;
  readonly supplierGrams: Decimal | null;
  readonly margin: Decimal | null;
}

/** Fila de la tabla de operaciones: la operación con los nombres de sus partes y sus cifras. */
export type OperationRow = Operation & {
  readonly clientName: string;
  readonly supplierName: string;
  readonly figures: OperationFigures;
};

export type OperationTotals = ReturnType<typeof openOperationsTotals>;

export const operationFigures = (operation: Operation): OperationFigures => {
  const { clientGrams, supplierGrams, margin } = closurePreview(operation);
  return { clientGrams, supplierGrams, margin };
};

/** Totales de lo que sigue vivo: solo las operaciones abiertas suman deuda en gramos. */
export const openOperationsTotals = (operations: readonly Operation[]) => {
  const figures = operations.filter((op) => op.status === 'ABIERTA').map(operationFigures);
  return {
    count: figures.length,
    clientGrams: sumDecimals(figures.map((f) => f.clientGrams)),
    supplierGrams: sumDecimals(figures.map((f) => f.supplierGrams)),
    margin: sumDecimals(figures.map((f) => f.margin)),
  };
};

export const newestFirst = (operations: readonly Operation[]): Operation[] =>
  [...operations].sort(
    (a, b) => b.closedOn.localeCompare(a.closedOn) || b.createdAt.localeCompare(a.createdAt),
  );

const firstMessagePerField = (draft: OperationDraft, issues: readonly PathIssue[]) =>
  issues.reduce<OperationErrors>((errors, issue) => {
    const field = issue.path[0] as OperationField;
    if (errors[field]) return errors;
    const blankMessage = draft[field].trim() ? undefined : BLANK_FIELD_MESSAGES[field];
    return { ...errors, [field]: blankMessage ?? issue.message };
  }, {});
interface PathIssue {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

export const validateOperationDraft = (
  draft: OperationDraft,
): { input: OperationInput | null; errors: OperationErrors } => {
  const result = operationInputSchema.safeParse(draft);
  if (result.success) return { input: result.data, errors: {} };
  return { input: null, errors: firstMessagePerField(draft, result.error.issues) };
};

export const firstInvalidField = (errors: OperationErrors): OperationField | undefined =>
  OPERATION_FIELDS.find((field) => errors[field]);

interface OperationFormSources {
  readonly suppliers: Ref<readonly Supplier[]>;
  readonly clients: Ref<readonly Client[]>;
}

/** Elegir una parte precarga lo habitual pactado con ella; si no tiene, se respeta lo escrito. */
const partySelectors = (draft: OperationDraft, sources: OperationFormSources) => ({
  selectSupplier: (id: string) => {
    draft.supplierId = id;
    const supplier = sources.suppliers.value.find((s) => s.id === id);
    if (!supplier) return;
    // La moneda del proveedor es su forma de liquidar; el cierre solo admite USDT/USD.
    if (supplier.currency === 'USDT' || supplier.currency === 'USD') {
      draft.currency = supplier.currency;
    }
    draft.supplierPercentage = supplier.defaultPercentage ?? draft.supplierPercentage;
  },
  selectClient: (id: string) => {
    draft.clientId = id;
    const client = sources.clients.value.find((c) => c.id === id);
    draft.clientPercentage = client?.defaultPercentage ?? draft.clientPercentage;
  },
});

/** Estado del formulario de una operación: precarga de % habituales y validación con el contrato. */
export const useOperationForm = (sources: OperationFormSources, today = todayIsoDate) => {
  const draft = reactive<OperationDraft>(emptyOperationDraft(today()));
  const errors = ref<OperationErrors>({});
  const pristine = ref(JSON.stringify(draft));
  /** Hubo cambios respecto del borrador recién abierto: cerrar sin confirmar los perdería. */
  const isDirty = computed(() => JSON.stringify(draft) !== pristine.value);
  const validate = (): OperationInput | null => {
    const result = validateOperationDraft(draft);
    errors.value = result.errors;
    return result.input;
  };
  const reset = () => {
    Object.assign(draft, emptyOperationDraft(today()));
    errors.value = {};
    pristine.value = JSON.stringify(draft);
  };
  return { draft, errors, isDirty, validate, reset, ...partySelectors(draft, sources) };
};

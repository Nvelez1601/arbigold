import {
  type Export,
  type ExportInput,
  type Supplier,
  EXPORT_STATUSES,
  exportInputSchema,
} from '@arbigold/shared-types';
import type { ExportRow } from './exportTable.ts';
import { PackageOpen, Truck, Users } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';

export type ExportStatus = Export['status'];
export type SettlementMode = NonNullable<ExportInput['settlementMode']>;

export const EXPORT_STATUS_LABELS: Record<ExportStatus, string> = {
  PREPARACION: 'Preparación',
  DOCUMENTACION: 'Documentación',
  ENVIADA: 'Enviada',
  CON_RESULTADO: 'Con resultado',
  LIQUIDADA: 'Liquidada',
};

export const EXPORT_STATUS_SEVERITY: Record<ExportStatus, string> = {
  PREPARACION: 'secondary',
  DOCUMENTACION: 'info',
  ENVIADA: 'warn',
  CON_RESULTADO: 'contrast',
  LIQUIDADA: 'success',
};

/** Valida el query `?estado=` de la URL: si no es un estado conocido, la tabla no filtra. */
export const validExportStatusFilter = (value: unknown): ExportStatus | '' =>
  typeof value === 'string' && Object.hasOwn(EXPORT_STATUS_LABELS, value)
    ? (value as keyof typeof EXPORT_STATUS_LABELS)
    : '';

export const EXPORT_STATUS_FILTER_OPTIONS = [
  { label: 'Todos los estados', value: '' },
  ...EXPORT_STATUSES.map((status) => ({ label: EXPORT_STATUS_LABELS[status], value: status })),
];

/** Siguiente estado de la exportación, o null si ya está liquidada. */
export const nextExportStatus = (status: ExportStatus): ExportStatus | null =>
  EXPORT_STATUSES[EXPORT_STATUSES.indexOf(status) + 1] ?? null;

export const nextExportStatusLabel = (status: ExportStatus): string | null => {
  const next = nextExportStatus(status);
  return next ? EXPORT_STATUS_LABELS[next] : null;
};

export {
  packingListFine,
  availablePackingLists,
  toPackingListOptions,
  previewExportProfit,
  toExportRow,
  toExportRows,
} from './exportTable.ts';
export type { PackingListOption, ExportRow } from './exportTable.ts';

const SHIPPING_NOTE = ' Sus packing lists quedarán como exportados.';

/** Textos para avanzar una exportación: confirmación con el estado destino y aviso si falla. */
export const describeAdvance = (row: Pick<ExportRow, 'record' | 'supplierName'>) => {
  const next = nextExportStatus(row.record.status);
  const target = next ? EXPORT_STATUS_LABELS[next] : '';
  const note = next === 'ENVIADA' ? SHIPPING_NOTE : '';
  return {
    target,
    message: `La exportación a ${row.supplierName} pasará a “${target}”.${note}`,
    failure: {
      summary: `No se pudo pasar la exportación a “${target}”`,
      detail: `Sigue en “${EXPORT_STATUS_LABELS[row.record.status]}”: vuelve a intentarlo.`,
    },
  };
};

export const EXPORTS_EMPTY_STATES = {
  noSuppliers: {
    icon: Users,
    title: 'Primero registra un proveedor',
    description: 'Cada exportación va a un solo proveedor. Registra al menos uno para empezar.',
    link: { to: '/proveedores', label: 'Ir a proveedores' },
  },
  noPackingLists: {
    icon: PackageOpen,
    title: 'No hay packing lists recibidos para exportar',
    description: 'Solo se exportan packing lists recibidos: márcalos como recibidos primero.',
    link: { to: '/packing-lists', label: 'Ir a packing lists' },
  },
  noExports: {
    icon: Truck,
    title: 'Aún no hay exportaciones',
    description: 'Agrupa los packing lists recibidos en una exportación hacia un proveedor.',
  },
} as const;

/** Qué falta para poder exportar, en orden: proveedor, packing lists recibidos, primera exportación. */
export const pickEmptyState = (has: Record<'suppliers' | 'exports' | 'available', boolean>) => {
  if (!has.suppliers) return EXPORTS_EMPTY_STATES.noSuppliers;
  if (has.exports) return null;
  return has.available ? EXPORTS_EMPTY_STATES.noExports : EXPORTS_EMPTY_STATES.noPackingLists;
};

/** Formulario vacío; el orden de sus campos es el orden en que se busca el primer error. */
const emptyExportForm = (today: string) => ({
  supplierId: '',
  shippedOn: today,
  destination: '',
  packingListIds: [] as string[],
  grossProfitPercentage: '',
  settlementMode: undefined as SettlementMode | undefined,
  notes: '',
});
export type ExportFormState = ReturnType<typeof emptyExportForm>;
export type ExportFormField = keyof ExportFormState;
const EXPORT_FORM_FIELDS = Object.keys(emptyExportForm('')) as ExportFormField[];

const SUPPLIER_REQUIRED = 'Elige el proveedor que recibe el oro';
const blankToUndefined = (value: string) => (value.trim() ? value : undefined);

/**
 * El % habitual solo se precarga en tratos de TERCEROS: en FONDEO ese campo es el % del
 * cierre, no la utilidad. Al cambiar de tipo de proveedor se limpia para no arrastrarlo.
 */
const applySupplierChange = (
  form: ExportFormState,
  previousKind: Supplier['kind'] | undefined,
  next: Supplier | undefined,
) => {
  if (next?.kind !== previousKind) form.grossProfitPercentage = '';
  if (next?.kind !== 'TERCEROS') {
    form.settlementMode = undefined;
    return;
  }
  form.settlementMode = 'UTILIDAD';
  form.grossProfitPercentage = next.defaultPercentage ?? form.grossProfitPercentage;
};

/** Estado y validación del formulario de exportación con el contrato compartido. */
export const useExportForm = (options: { today: string; suppliers: () => readonly Supplier[] }) => {
  const form = reactive<ExportFormState>(emptyExportForm(options.today));
  const pristine = JSON.stringify(form);
  const isDirty = computed(() => JSON.stringify(form) !== pristine);
  const errors = ref<Partial<Record<ExportFormField, string>>>({});
  const supplier = computed(() => options.suppliers().find((item) => item.id === form.supplierId));
  const isThirdParty = computed(() => supplier.value?.kind === 'TERCEROS');
  const isCobroTotal = computed(() => isThirdParty.value && form.settlementMode === 'COBRO_TOTAL');

  /** El % habitual solo se precarga en tratos de TERCEROS: ver applySupplierChange. */
  const selectSupplier = (supplierId: string) => {
    const previousKind = supplier.value?.kind;
    form.supplierId = supplierId;
    applySupplierChange(form, previousKind, supplier.value);
  };

  const validate = (): ExportInput | null => {
    const result = validateExportForm(form, isThirdParty.value);
    errors.value = result.errors;
    return result.input;
  };

  const firstError = computed(() => EXPORT_FORM_FIELDS.find((field) => errors.value[field]));
  return {
    form,
    errors,
    isDirty,
    isThirdParty,
    isCobroTotal,
    selectSupplier,
    validate,
    firstError,
  };
};

const issueMessage = (field: PropertyKey | undefined, message: string) =>
  field === 'supplierId' ? SUPPLIER_REQUIRED : message;

/** Errores tempranos de TERCEROS: sin modo de liquidación o sin % en el modo Utilidad. */
const thirdPartyErrors = (
  form: ExportFormState,
): Partial<Record<ExportFormField, string>> | null => {
  if (!form.settlementMode) {
    return { settlementMode: 'Elige cómo se liquida el material de terceros' };
  }
  if (form.settlementMode === 'UTILIDAD' && !form.grossProfitPercentage.trim()) {
    return { grossProfitPercentage: 'Escribe el % de utilidad negociado' };
  }
  return null;
};

/**
 * Valida con exportInputSchema. En TERCEROS el modo manda: UTILIDAD exige % y COBRO_TOTAL
 * se liquida en dinero, así que no lleva % de utilidad. En FONDEO el % es opcional.
 */
export const validateExportForm = (form: ExportFormState, isThirdParty: boolean) => {
  const modeError = isThirdParty ? thirdPartyErrors(form) : null;
  if (modeError) return { input: null, errors: modeError };
  const isCobroTotal = isThirdParty && form.settlementMode === 'COBRO_TOTAL';
  const parsed = exportInputSchema.safeParse({
    ...form,
    grossProfitPercentage: isCobroTotal ? undefined : blankToUndefined(form.grossProfitPercentage),
    settlementMode: isThirdParty ? form.settlementMode : undefined,
  });
  if (parsed.success) return { input: parsed.data as ExportInput, errors: {} };
  const errors: Partial<Record<ExportFormField, string>> = Object.fromEntries(
    [...parsed.error.issues]
      .reverse()
      .map((issue) => [issue.path[0], issueMessage(issue.path[0], issue.message)]),
  );
  return { input: null, errors };
};

export {
  registerExport,
  advanceExport,
  describeSaveFailure,
  ExportOperationError,
} from './exportRepository.ts';
export type { ExportErrorCode, ExportRepositories } from './exportRepository.ts';

import {
  CURRENCIES,
  type Currency,
  SUPPLIER_KINDS,
  type Supplier,
  supplierInputSchema,
} from '@arbigold/shared-types';
import { computed, reactive, ref } from 'vue';

export type SupplierKind = (typeof SUPPLIER_KINDS)[number];

/** Lo que se captura en el formulario: todo como texto (el % nunca viaja como number). */
export interface SupplierFormValues {
  name: string;
  kind: SupplierKind;
  country: string;
  currency: Currency;
  defaultPercentage: string;
  notes: string;
}

export type SupplierFormField = keyof SupplierFormValues;

/** Datos ya validados con el contrato compartido, listos para guardar. */
export type SupplierFormOutput = Omit<Supplier, 'id' | 'active' | 'createdAt'>;

export type SupplierFormResult =
  | { readonly isValid: true; readonly input: SupplierFormOutput }
  | { readonly isValid: false; readonly firstInvalidField: SupplierFormField };

/** Orden en pantalla: el foco va al primer campo con error, de arriba hacia abajo. */
export const SUPPLIER_FORM_FIELDS: readonly SupplierFormField[] = [
  'name',
  'kind',
  'country',
  'currency',
  'defaultPercentage',
  'notes',
];

/** Qué significa cada tipo de proveedor en el negocio (docs/domain/modelo-operativo.md). */
export const SUPPLIER_KIND_INFO: Record<
  SupplierKind,
  { readonly label: string; readonly description: string; readonly severity: string }
> = {
  FONDEO: {
    label: 'Fondeo',
    description: 'Adelanta los fondos y recibe el oro exportado.',
    severity: 'info',
  },
  TERCEROS: {
    label: 'Terceros',
    description: 'Trae material propio con token y custodio; la negociación va aparte.',
    severity: 'secondary',
  },
};

export const SUPPLIER_KIND_OPTIONS = SUPPLIER_KINDS.map((kind) => ({
  value: kind,
  ...SUPPLIER_KIND_INFO[kind],
}));

export const SUPPLIER_CURRENCY_OPTIONS = [...CURRENCIES];

const emptyValues = (): SupplierFormValues => ({
  name: '',
  kind: 'FONDEO',
  country: '',
  currency: 'USDT',
  defaultPercentage: '',
  notes: '',
});

const valuesFrom = (supplier: Supplier): SupplierFormValues => ({
  name: supplier.name,
  kind: supplier.kind,
  country: supplier.country ?? '',
  currency: supplier.currency,
  defaultPercentage: supplier.defaultPercentage ?? '',
  notes: supplier.notes ?? '',
});

/** El % es opcional: vacío significa "sin % habitual", no un número inválido. */
const toContractInput = (values: SupplierFormValues) => ({
  ...values,
  defaultPercentage: values.defaultPercentage.trim() || undefined,
});

const isFormField = (key: unknown): key is SupplierFormField =>
  SUPPLIER_FORM_FIELDS.includes(key as SupplierFormField);

const collectErrors = (issues: readonly { path: readonly PropertyKey[]; message: string }[]) => {
  const errors: Partial<Record<SupplierFormField, string>> = {};
  issues
    .filter((issue) => isFormField(issue.path[0]))
    .forEach((issue) => {
      const field = issue.path[0] as SupplierFormField;
      errors[field] ??= issue.message;
    });
  return errors;
};

/** Estado y validación del alta/edición de un proveedor con el mismo schema Zod del backend. */
export const useSupplierForm = () => {
  const values = reactive<SupplierFormValues>(emptyValues());
  const errors = ref<Partial<Record<SupplierFormField, string>>>({});
  const pristine = ref(JSON.stringify(values));
  /** Si cambió algo desde que se abrió: cerrar sin guardar debe pedir confirmación. */
  const isDirty = computed(() => JSON.stringify(values) !== pristine.value);

  const reset = (supplier?: Supplier | null) => {
    Object.assign(values, supplier ? valuesFrom(supplier) : emptyValues());
    pristine.value = JSON.stringify(values);
    errors.value = {};
  };

  const validate = (): SupplierFormResult => {
    const parsed = supplierInputSchema.safeParse(toContractInput(values));
    if (parsed.success) {
      errors.value = {};
      return { isValid: true, input: parsed.data };
    }
    errors.value = collectErrors(parsed.error.issues);
    const firstInvalidField = SUPPLIER_FORM_FIELDS.find((field) => errors.value[field]) ?? 'name';
    return { isValid: false, firstInvalidField };
  };

  return { values, errors, isDirty, reset, validate };
};

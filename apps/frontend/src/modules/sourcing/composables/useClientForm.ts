import { type Client, clientInputSchema } from '@arbigold/shared-types';
import { type Ref, computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/** Orden en que aparecen los campos en el formulario: el foco va al primero con error. */
export const CLIENT_FIELDS = [
  'name',
  'kind',
  'documentId',
  'location',
  'phone',
  'defaultPercentage',
  'notes',
] as const;
export type ClientField = (typeof CLIENT_FIELDS)[number];
export type ClientFormValues = Record<ClientField, string>;
export type ClientFormErrors = Partial<Record<ClientField, string>>;
/** Lo que sale del formulario ya validado con el contrato compartido. */
export type ValidClientInput = ReturnType<typeof clientInputSchema.parse>;

const emptyValues = (): ClientFormValues => ({
  name: '',
  kind: 'PERSONA',
  documentId: '',
  location: '',
  phone: '',
  defaultPercentage: '',
  notes: '',
});

const valuesFrom = (client: Client | null): ClientFormValues => ({
  ...emptyValues(),
  ...Object.fromEntries(
    CLIENT_FIELDS.flatMap((field) => {
      const value = client?.[field];
      return value === undefined ? [] : [[field, value]];
    }),
  ),
});

/** El % es opcional: un campo vacío significa "sin % habitual", no un número inválido. */
const toCandidate = (values: ClientFormValues) => ({
  ...values,
  defaultPercentage: values.defaultPercentage.trim() || undefined,
});

const errorsFrom = (issues: readonly { path: readonly PropertyKey[]; message: string }[]) =>
  issues.reduce<ClientFormErrors>((errors, issue) => {
    const field = String(issue.path[0]) as ClientField;
    return errors[field] ? errors : { ...errors, [field]: issue.message };
  }, {});

/** Estado y validación del alta/edición de un cliente, con el mismo schema que usa el backend. */
export const useClientForm = () => {
  const values = reactive<ClientFormValues>(emptyValues());
  const errors = ref<ClientFormErrors>({});
  const snapshot = () => JSON.stringify(values);
  const initial = ref(snapshot());

  const reset = (client: Client | null = null) => {
    Object.assign(values, valuesFrom(client));
    errors.value = {};
    initial.value = snapshot();
  };

  /** ¿Cambió algo desde que se abrió? Sirve para no perder lo escrito al cerrar sin querer. */
  const isDirty = () => snapshot() !== initial.value;

  const validate = (): ValidClientInput | null => {
    const result = clientInputSchema.safeParse(toCandidate(values));
    errors.value = result.success ? {} : errorsFrom(result.error.issues);
    return result.success ? result.data : null;
  };

  const firstErrorField = (): ClientField | undefined =>
    CLIENT_FIELDS.find((field) => errors.value[field]);

  return { values, errors, reset, validate, firstErrorField, isDirty };
};

const normalize = (text = '') =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es');
/** Los documentos se escriben con y sin guiones o puntos (V-12.345.678 = 12345678). */
const compact = (text = '') => normalize(text).replace(/[^\p{L}\p{N}]/gu, '');

/** ¿El cliente coincide con lo buscado? Por nombre (sin acentos ni mayúsculas) o por documento. */
export const matchesClientSearch = (client: Client, term: string): boolean =>
  normalize(client.name).includes(normalize(term.trim())) ||
  (compact(term) !== '' && compact(client.documentId).includes(compact(term)));

const queryText = (value: unknown) => (typeof value === 'string' ? value : '');

/** Búsqueda de la lista de clientes guardada en la URL (?q=), para que sobreviva a recargar. */
export const useClientSearch = (clients: Ref<readonly Client[]>) => {
  const route = useRoute();
  const router = useRouter();
  const search = ref(queryText(route.query['q']));
  watch(search, (value) => {
    void router.replace({ query: { ...route.query, q: value.trim() || undefined } });
  });
  // La URL guarda la búsqueda sin espacios sobrantes; no se le borra al usuario el espacio que escribe.
  watch(
    () => route.query['q'],
    (value) => {
      if (queryText(value) !== search.value.trim()) search.value = queryText(value);
    },
  );
  const results = computed(() =>
    clients.value.filter((client) => matchesClientSearch(client, search.value)),
  );
  return { search, results };
};

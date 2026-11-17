import {
  type PackingList,
  type PackingListInput,
  packingListInputSchema,
} from '@arbigold/shared-types';
import { type Ref, computed, ref, watch } from 'vue';
import {
  useCollection,
  useCollectionMutations,
} from '../../../shared/composables/useCollection.ts';
import {
  QUERY_KEYS,
  clientsRepository,
  packingListsRepository,
} from '../../../shared/data/repositories.ts';
import { fineWeight, sumDecimals, toDecimalOrNull } from '../../../shared/utils/gold.ts';
import {
  mergeErrors,
  pieceFormatErrors,
  pieceMissingErrors,
  pieceNumberOf,
  type PieceRow,
} from './pieceValidation.ts';

export type { PieceErrors, PieceField, PieceRow } from './pieceValidation.ts';

export type PackingListStatus = PackingList['status'];
export type ResidueKind = PackingList['residues'][number]['kind'];

/** Estados en palabras del negocio, con el tono del Tag de PrimeVue. */
export const STATUS_TAGS: Record<PackingListStatus, { label: string; severity: string }> = {
  BORRADOR: { label: 'Borrador', severity: 'secondary' },
  RECIBIDO: { label: 'Recibido', severity: 'info' },
  EN_EXPORTACION: { label: 'En exportación', severity: 'warn' },
  EXPORTADO: { label: 'Exportado', severity: 'contrast' },
  CONCILIADO: { label: 'Conciliado', severity: 'success' },
};

export const RESIDUE_LABELS: Record<ResidueKind, string> = {
  VIRUTA: 'Viruta',
  FUNDICION: 'Fundición',
};

/** Viruta o fundición: sale de piezas existentes, no es una pieza ni suma a los totales. */
export interface ResidueRow {
  readonly key: string;
  kind: ResidueKind;
  fromPieces: number[];
  grossWeight: string;
  fineness: string;
  note: string;
}

let sequence = 0;
export const newRowKey = (): string => `fila-${++sequence}`;

export const nextPieceNumber = (rows: readonly PieceRow[]): number =>
  Math.max(0, ...rows.map(pieceNumberOf).filter((n): n is number => n !== null)) + 1;

export const createPieceRow = (rows: readonly PieceRow[]): PieceRow => ({
  key: newRowKey(),
  number: String(nextPieceNumber(rows)),
  grossWeight: '',
  fineness: '',
});

/** Una fila recién creada (número automático y campos vacíos) todavía no es una pieza. */
const hasPieceData = (row: PieceRow) => Boolean(row.grossWeight.trim() || row.fineness.trim());

/** Totales de la balanza: SOLO piezas con datos. La viruta y la fundición no entran aquí. */
export const pieceTotals = (rows: readonly PieceRow[]) => {
  const pieces = rows.filter(hasPieceData);
  return {
    count: pieces.length,
    gross: sumDecimals(pieces.map((row) => toDecimalOrNull(row.grossWeight))).toString(),
    fine: sumDecimals(pieces.map((row) => fineWeight(row.grossWeight, row.fineness))).toString(),
  };
};

/** Fecha local de hoy como AAAA-MM-DD. */
export const todayIso = (now: Date = new Date()): string =>
  new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

const LIST_FORMAT = new Intl.ListFormat('es', { type: 'conjunction' });
export const describePieces = (numbers: readonly number[]): string =>
  `${numbers.length === 1 ? 'pieza' : 'piezas'} ${LIST_FORMAT.format(numbers.map(String))}`;

const toRows = (record: PackingList) => ({
  pieces: record.pieces.map((piece) => ({
    ...piece,
    key: newRowKey(),
    number: String(piece.number),
  })),
  residues: record.residues.map((residue) => ({
    ...residue,
    key: newRowKey(),
    fromPieces: [...residue.fromPieces],
    fineness: residue.fineness ?? '',
    note: residue.note ?? '',
  })),
});

const optional = (value: string) => (value.trim() ? value : undefined);

type Draft = ReturnType<typeof useDraftState>;

/** Lo que el usuario está escribiendo y si difiere de lo último guardado. */
const useDraftState = () => {
  const header = ref({ clientId: '', issuedOn: todayIso(), notes: '' });
  const pieces = ref<PieceRow[]>([createPieceRow([])]);
  const residues = ref<ResidueRow[]>([]);
  const attempted = ref(false);
  const snapshot = () =>
    JSON.stringify([header.value, pieces.value.map(({ key: _k, ...p }) => p), residues.value]);
  const baseline = ref(snapshot());
  /** Guarda la foto que se envió, no la del draft vivo: lo escrito durante el guardado sigue sucio. */
  const markSaved = (saved = snapshot()) => (baseline.value = saved);
  const hydrate = (loaded: PackingList) => {
    const { clientId, issuedOn, notes } = loaded;
    header.value = { clientId, issuedOn, notes: notes ?? '' };
    ({ pieces: pieces.value, residues: residues.value } = toRows(loaded));
    markSaved();
  };
  const hasChanges = computed(() => snapshot() !== baseline.value);
  return { header, pieces, residues, attempted, hasChanges, markSaved, hydrate, snapshot };
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Errores por campo: formato siempre; vacíos solo después de intentar guardar. */
const useDraftValidation = ({ header, pieces, residues, attempted }: Draft) => {
  const pieceNumbers = computed(() =>
    pieces.value.map(pieceNumberOf).filter((n): n is number => n !== null),
  );
  const pieceErrors = computed(() => {
    const format = pieceFormatErrors(pieces.value);
    return attempted.value ? mergeErrors(format, pieceMissingErrors(pieces.value)) : format;
  });
  const headerErrors = computed(() => ({
    clientId:
      attempted.value && !header.value.clientId ? 'Elige el cliente que entrega' : undefined,
    issuedOn:
      attempted.value && !DATE_PATTERN.test(header.value.issuedOn)
        ? 'Escribe la fecha como AAAA-MM-DD'
        : undefined,
  }));
  const orphanResidues = computed(() =>
    residues.value.filter((r) => r.fromPieces.some((n) => !pieceNumbers.value.includes(n))),
  );
  const firstProblem = (): string | undefined => {
    const fieldErrors = [...Object.values(pieceErrors.value), headerErrors.value];
    if (fieldErrors.some((errors) => Object.values(errors).some(Boolean)))
      return 'Corrige los campos marcados y vuelve a guardar';
    if (orphanResidues.value.length > 0)
      return 'Hay viruta o fundición de piezas que ya no existen: quítala o ajústala';
    return undefined;
  };
  return { pieceNumbers, pieceErrors, headerErrors, orphanResidues, firstProblem };
};

const toInput = ({ header, pieces, residues }: Draft): PackingListInput => ({
  clientId: header.value.clientId,
  issuedOn: header.value.issuedOn,
  notes: optional(header.value.notes),
  pieces: pieces.value.map((row) => ({
    number: pieceNumberOf(row) ?? 0,
    grossWeight: row.grossWeight,
    fineness: row.fineness,
  })),
  residues: residues.value.map(({ key: _key, ...row }) => ({
    ...row,
    fineness: optional(row.fineness),
    note: optional(row.note),
  })),
});

/** El packing list guardado (si hay :id) y los clientes que pueden entregar. */
const useStoredPackingList = (id: Ref<string | undefined>) => {
  const clients = useCollection(QUERY_KEYS.clients, clientsRepository);
  const lists = useCollection(QUERY_KEYS.packingLists, packingListsRepository);
  const record = computed(() => lists.data.value?.find((item) => item.id === id.value) ?? null);
  const isLoading = computed(() => clients.isPending.value || lists.isPending.value);
  const isError = computed(() => clients.isError.value || lists.isError.value);
  const isMissing = computed(
    () => Boolean(id.value) && !isLoading.value && !isError.value && !record.value,
  );
  const status = computed<PackingListStatus>(() => record.value?.status ?? 'BORRADOR');
  const allClients = computed(() => clients.data.value ?? []);
  const retry = () => {
    void clients.refetch();
    void lists.refetch();
  };
  return { record, isLoading, isError, isMissing, status, allClients, retry };
};

type SaveResult = { record?: PackingList; problem?: string };
type Stored = ReturnType<typeof useStoredPackingList>;
type Validation = ReturnType<typeof useDraftValidation>;

/** Guardar borrador (crea o actualiza) y marcarlo como recibido (lo que habilita exportarlo). */
const useSaveActions = (stored: Stored, draft: Draft, validation: Validation) => {
  const { create, update } = useCollectionMutations(
    QUERY_KEYS.packingLists,
    packingListsRepository,
  );
  const saveDraft = async (): Promise<SaveResult> => {
    draft.attempted.value = true;
    const problem = validation.firstProblem();
    if (problem) return { problem };
    const parsed = packingListInputSchema.safeParse(toInput(draft));
    if (!parsed.success) return { problem: parsed.error.issues[0]?.message ?? 'Revisa los datos' };
    const submitted = draft.snapshot();
    const current = stored.record.value;
    const saved = current
      ? await update.mutateAsync({ id: current.id, patch: parsed.data })
      : await create.mutateAsync(parsed.data);
    draft.markSaved(submitted);
    return { record: saved };
  };
  const markReceived = async (): Promise<SaveResult> => {
    const result = await saveDraft();
    if (!result.record) return result;
    const patch = { status: 'RECIBIDO' as const };
    return { record: await update.mutateAsync({ id: result.record.id, patch }) };
  };
  return { saveDraft, markReceived };
};

/** Editor de un packing list: borrador, vista previa de la balanza, guardar y recibir. */
export const usePackingListEditor = (id: Ref<string | undefined>) => {
  const stored = useStoredPackingList(id);
  const draft = useDraftState();
  const validation = useDraftValidation(draft);
  const isEditable = computed(() => stored.status.value === 'BORRADOR');
  watch(stored.record, (loaded) => loaded && draft.hydrate(loaded), { immediate: true });
  return {
    ...stored,
    ...validation,
    ...draft,
    ...useSaveActions(stored, draft, validation),
    isEditable,
    /** Solo clientes activos, más el ya elegido (para que un packing viejo siga mostrando su cliente). */
    clientOptions: computed(() =>
      stored.allClients.value.filter((c) => c.active || c.id === draft.header.value.clientId),
    ),
    isDirty: computed(() => isEditable.value && draft.hasChanges.value),
    totals: computed(() => pieceTotals(draft.pieces.value)),
  };
};

import {
  type Export,
  type ExportInput,
  type PackingList,
  type PackingListInput,
} from '@arbigold/shared-types';
import { nextExportStatus } from './useExportForm.ts';
import type { Repository } from '../../../shared/data/local-repository.ts';

const SAVE_FAILED = {
  summary: 'No se pudo registrar la exportación',
  detail: 'Tus datos siguen en el formulario: vuelve a intentarlo.',
};

/** Fallos propios del flujo que la pantalla debe explicar sin tecnicismos. */
export type ExportErrorCode =
  'UNAVAILABLE_PACKING_LISTS' | 'STALE_EXPORT' | 'MISSING_EXPORT' | 'PARTIAL_ROLLBACK';

export class ExportOperationError extends Error {
  constructor(
    readonly code: ExportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ExportOperationError';
  }
}

const detailOf = (error: unknown, fallback: string) =>
  error instanceof ExportOperationError ? error.message : fallback;

export const describeSaveFailure = (error: unknown) => ({
  summary: SAVE_FAILED.summary,
  detail: detailOf(error, SAVE_FAILED.detail),
});

export interface ExportRepositories {
  readonly exports: Repository<Export, ExportInput>;
  readonly packingLists: Repository<PackingList, PackingListInput>;
}
type PackingListPatch = Partial<PackingList>;

/**
 * Actualiza todos los packing lists o ninguno: si uno falla, devuelve los ya cambiados a su estado
 * anterior y relanza, para no dejar la exportación a medias. Si el propio rollback falla, avisa que
 * hace falta recargar: la consistencia ya no se puede garantizar.
 */
const updateAllOrRestore = async (
  repository: ExportRepositories['packingLists'],
  ids: readonly string[],
  change: { apply: PackingListPatch; restore: PackingListPatch },
) => {
  const results = await Promise.allSettled(ids.map((id) => repository.update(id, change.apply)));
  const failure = results.find((result) => result.status === 'rejected');
  if (!failure) return;
  const changed = ids.filter((_, index) => results[index]?.status === 'fulfilled');
  const restored = await Promise.allSettled(
    changed.map((id) => repository.update(id, change.restore)),
  );
  if (restored.some((result) => result.status === 'rejected')) {
    throw new ExportOperationError(
      'PARTIAL_ROLLBACK',
      'No se pudo deshacer el cambio completo: recarga la página antes de continuar.',
    );
  }
  throw failure.reason;
};

/** Antes de crear la exportación, confirma que los packing lists sigan libres y recibidos. */
const ensurePackingListsAvailable = async (
  repository: ExportRepositories['packingLists'],
  ids: readonly string[],
): Promise<void> => {
  const byId = new Map((await repository.list()).map((list) => [list.id, list]));
  const unavailable = ids.filter((id) => {
    const list = byId.get(id);
    return !list || list.status !== 'RECIBIDO' || Boolean(list.exportId);
  });
  if (unavailable.length) {
    throw new ExportOperationError(
      'UNAVAILABLE_PACKING_LISTS',
      'Uno de los packing lists ya no está disponible para exportar. Actualiza la lista y vuelve a intentarlo.',
    );
  }
};

/** Registra la exportación y deja cada packing list elegido EN_EXPORTACION, ligado a ella. */
export const registerExport = async (
  input: ExportInput,
  repositories: ExportRepositories,
): Promise<Export> => {
  await ensurePackingListsAvailable(repositories.packingLists, input.packingListIds);
  const created = await repositories.exports.create(input);
  try {
    await updateAllOrRestore(repositories.packingLists, created.packingListIds, {
      apply: { status: 'EN_EXPORTACION', exportId: created.id },
      restore: { status: 'RECIBIDO', exportId: undefined },
    });
  } catch (error) {
    await repositories.exports.remove(created.id);
    throw error;
  }
  return created;
};

/** Efectos de entrar a un estado: al enviarse, sus packing lists quedan EXPORTADOS. */
const ON_ENTER_STATUS: Partial<Record<Export['status'], PackingList['status']>> = {
  ENVIADA: 'EXPORTADO',
};

/** Si el rollback del estado falla, la consistencia ya no se puede garantizar: hay que recargar. */
const restoreExportStatus = async (
  repositories: ExportRepositories,
  status: Export['status'],
  id: string,
) => {
  try {
    await repositories.exports.update(id, { status });
  } catch {
    throw new ExportOperationError(
      'PARTIAL_ROLLBACK',
      'No se pudo deshacer el cambio completo: recarga la página antes de continuar.',
    );
  }
};

const assertExportIsFresh = async (
  repositories: ExportRepositories,
  record: Export,
): Promise<Export> => {
  const current = await repositories.exports.get(record.id);
  if (!current) {
    throw new ExportOperationError(
      'MISSING_EXPORT',
      'La exportación ya no existe. Actualiza la página y vuelve a intentarlo.',
    );
  }
  if (current.status !== record.status) {
    throw new ExportOperationError(
      'STALE_EXPORT',
      'La exportación cambió mientras la mirabas. Actualiza la página y vuelve a intentarlo.',
    );
  }
  return current;
};

export const advanceExport = async (
  record: Export,
  repositories: ExportRepositories,
): Promise<Export> => {
  // Un estado terminal (LIQUIDADA) no tiene transición: devolver el registro es seguro incluso
  // sin pasar por el repositorio.
  const terminalTarget = nextExportStatus(record.status);
  if (!terminalTarget) return record;
  const current = await assertExportIsFresh(repositories, record);
  const target = terminalTarget;
  const updated = await repositories.exports.update(current.id, { status: target });
  const listStatus = ON_ENTER_STATUS[target];
  if (!listStatus) return updated;
  try {
    await updateAllOrRestore(repositories.packingLists, current.packingListIds, {
      apply: { status: listStatus },
      restore: { status: 'EN_EXPORTACION' },
    });
  } catch (error) {
    await restoreExportStatus(repositories, current.status, current.id);
    throw error;
  }
  return updated;
};

import type { Client, Export, Operation, PackingList, Supplier } from '@arbigold/shared-types';
import {
  newestFirst,
  openOperationsTotals,
  operationFigures,
} from '../../../modules/arbitrage/composables/useOperationForm.ts';
import {
  type PieceRow,
  pieceTotals,
} from '../../../modules/sourcing/composables/usePackingListEditor.ts';
import { sumDecimals, toDecimalOrNull } from '../../../shared/utils/gold.ts';

export type AlertTone = 'warning' | 'danger' | 'info';

export interface PanelAlert {
  readonly tone: AlertTone;
  readonly title: string;
  readonly detail: string;
}

export interface PanelMovement {
  readonly id: string;
  readonly date: string;
  readonly client: string;
  readonly supplier: string;
  readonly grams: string;
  readonly margin: string;
  readonly status: Operation['status'];
}

export interface ChartPoint {
  readonly label: string;
  /** Gramos que debe entregar el cliente. */
  readonly client: number;
  /** Gramos que fondea el proveedor. */
  readonly supplier: number;
}

export interface PanelSources {
  readonly clients: readonly Client[];
  readonly suppliers: readonly Supplier[];
  readonly operations: readonly Operation[];
  readonly packingLists: readonly PackingList[];
  readonly exports: readonly Export[];
}

export interface PanelSummary {
  readonly activeClients: number;
  readonly activeSuppliers: number;
  readonly openOperations: number;
  readonly clientGrams: string;
  readonly supplierGrams: string;
  readonly margin: string;
  readonly packingLists: number;
  readonly packingFine: string;
  readonly activeExports: number;
  readonly chart: readonly ChartPoint[];
  readonly alerts: readonly PanelAlert[];
  readonly movements: readonly PanelMovement[];
  readonly hasActivity: boolean;
}

const nameOf = (list: readonly { id: string; name: string }[], id: string) =>
  list.find((item) => item.id === id)?.name ?? 'Sin registro';

const toPieceRow = (piece: PackingList['pieces'][number]): PieceRow => ({
  key: `panel-${piece.number}`,
  number: String(piece.number),
  grossWeight: piece.grossWeight,
  fineness: piece.fineness,
});

/** Packing lists que todavía no salen: borradores y recibidos sin exportar. */
const summarizePacking = (lists: readonly PackingList[]) => {
  const pending = lists.filter((list) => list.status === 'BORRADOR' || list.status === 'RECIBIDO');
  const totals = pending.map((list) => pieceTotals(list.pieces.map(toPieceRow)));
  return {
    count: pending.length,
    fine: sumDecimals(totals.map((total) => toDecimalOrNull(total.fine))).toString(),
  };
};

const toChartPoint = (operation: Operation): ChartPoint => {
  const figures = operationFigures(operation);
  return {
    label: operation.closedOn.slice(5).replace('-', '/'),
    client: figures.clientGrams ? Number(figures.clientGrams.toString()) : 0,
    supplier: figures.supplierGrams ? Number(figures.supplierGrams.toString()) : 0,
  };
};

const toMovement = (
  operation: Operation,
  clients: readonly Client[],
  suppliers: readonly Supplier[],
): PanelMovement => {
  const figures = operationFigures(operation);
  return {
    id: operation.id,
    date: operation.closedOn,
    client: nameOf(clients, operation.clientId),
    supplier: nameOf(suppliers, operation.supplierId),
    grams: figures.clientGrams?.toString() ?? '0',
    margin: figures.margin?.toString() ?? '0',
    status: operation.status,
  };
};

const supplierPercentAlert = (suppliers: readonly Supplier[]): PanelAlert | null => {
  const missing = suppliers.filter((item) => item.active && !item.defaultPercentage).length;
  if (missing === 0) return null;
  return {
    tone: 'warning',
    title: 'Proveedores sin % de cierre',
    detail: `${missing} no tienen % habitual: sus operaciones se negocian a mano.`,
  };
};

const packingDraftAlert = (lists: readonly PackingList[]): PanelAlert | null => {
  const drafts = lists.filter((list) => list.status === 'BORRADOR').length;
  if (drafts === 0) return null;
  return {
    tone: 'warning',
    title: 'Packing lists sin recibir',
    detail: `${drafts} siguen en borrador y no tienen piezas confirmadas.`,
  };
};

const exportPreparationAlert = (records: readonly Export[]): PanelAlert | null => {
  const preparing = records.filter(
    (record) => record.status === 'PREPARACION' || record.status === 'DOCUMENTACION',
  ).length;
  if (preparing === 0) return null;
  return {
    tone: 'info',
    title: 'Exportaciones en preparación',
    detail: `${preparing} todavía no salen a destino.`,
  };
};

const inactiveClientAlert = (clients: readonly Client[]): PanelAlert | null => {
  const inactive = clients.filter((client) => !client.active).length;
  if (inactive === 0) return null;
  return {
    tone: 'danger',
    title: 'Clientes inactivos',
    detail: `${inactive} no reciben fondos nuevos hasta reactivarlos.`,
  };
};

/** Avisos accionables: solo lo que está pendiente de verdad. */
const buildAlerts = (sources: PanelSources): PanelAlert[] =>
  [
    supplierPercentAlert(sources.suppliers),
    packingDraftAlert(sources.packingLists),
    exportPreparationAlert(sources.exports),
    inactiveClientAlert(sources.clients),
  ].filter((alert): alert is PanelAlert => alert !== null);

const hasAnyRecord = (sources: PanelSources) =>
  sources.clients.length > 0 ||
  sources.suppliers.length > 0 ||
  sources.operations.length > 0 ||
  sources.packingLists.length > 0 ||
  sources.exports.length > 0;

/** Resumen del panel: una sola pasada sobre las cinco colecciones. */
export const buildPanelSummary = (sources: PanelSources): PanelSummary => {
  const open = openOperationsTotals(sources.operations);
  const packing = summarizePacking(sources.packingLists);
  return {
    activeClients: sources.clients.filter((client) => client.active).length,
    activeSuppliers: sources.suppliers.filter((supplier) => supplier.active).length,
    openOperations: open.count,
    clientGrams: open.clientGrams.toString(),
    supplierGrams: open.supplierGrams.toString(),
    margin: open.margin.toString(),
    packingLists: packing.count,
    packingFine: packing.fine,
    activeExports: sources.exports.filter((record) => record.status !== 'LIQUIDADA').length,
    chart: newestFirst(sources.operations).slice(0, 7).reverse().map(toChartPoint),
    alerts: buildAlerts(sources),
    movements: newestFirst(sources.operations)
      .slice(0, 5)
      .map((operation) => toMovement(operation, sources.clients, sources.suppliers)),
    hasActivity: hasAnyRecord(sources),
  };
};

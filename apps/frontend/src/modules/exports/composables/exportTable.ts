import { type Client, type Export, type PackingList } from '@arbigold/shared-types';
import { Decimal } from 'decimal.js';
import { fineWeight, sumDecimals, toDecimalOrNull } from '../../../shared/utils/gold.ts';

/** Deducciones obligatorias sobre el fino, en % (modelo operativo §7): las paga la empresa. */
const CVM_PERCENTAGE = new Decimal('1');
const EXPORT_DUTY_PERCENTAGE = new Decimal('0.3');
const HUNDRED = new Decimal(100);

/** Peso fino de un packing list: suma del fino de cada pieza (bruto × ley ‰ / 1000). */
export const packingListFine = (list: Pick<PackingList, 'pieces'>): Decimal =>
  sumDecimals(list.pieces.map((piece) => fineWeight(piece.grossWeight, piece.fineness)));

/** Solo se exportan packing lists RECIBIDOS que todavía no van en ninguna exportación. */
export const availablePackingLists = (lists: readonly PackingList[]): PackingList[] =>
  lists.filter((list) => list.status === 'RECIBIDO' && !list.exportId);

export const toPackingListOptions = (lists: readonly PackingList[], clients: readonly Client[]) => {
  const names = new Map(clients.map((client) => [client.id, client.name]));
  return availablePackingLists(lists).map((list) => ({
    id: list.id,
    clientName: names.get(list.clientId) ?? 'Cliente sin registrar',
    issuedOn: list.issuedOn,
    pieceCount: list.pieces.length,
    fine: packingListFine(list),
  }));
};
export type PackingListOption = ReturnType<typeof toPackingListOptions>[number];

/** VISTA PREVIA de la utilidad: fino × % negociado − 1 % CVM − 0.3 % exportación (el backend recalcula). */
export const previewExportProfit = (fine: Decimal, percentage: string | undefined) => {
  const negotiated = toDecimalOrNull(percentage);
  if (!negotiated || !negotiated.greaterThan(0) || negotiated.greaterThan(HUNDRED)) return null;
  const ofFine = (pct: Decimal) => fine.times(pct).dividedBy(HUNDRED);
  const grossProfit = ofFine(negotiated);
  const cvm = ofFine(CVM_PERCENTAGE);
  const exportDuty = ofFine(EXPORT_DUTY_PERCENTAGE);
  const netProfit = grossProfit.minus(cvm).minus(exportDuty);
  const netPercentage = fine.isZero() ? new Decimal(0) : netProfit.dividedBy(fine).times(HUNDRED);
  return { fine, grossProfit, cvm, exportDuty, netProfit, netPercentage };
};

export const toExportRow = (
  record: Export,
  context: {
    suppliers: readonly { id: string; name: string }[];
    packingLists: readonly PackingList[];
  },
) => {
  const lists = context.packingLists.filter((list) => record.packingListIds.includes(list.id));
  const fine = sumDecimals(lists.map(packingListFine));
  const supplier = context.suppliers.find((item) => item.id === record.supplierId);
  return {
    record,
    supplierName: supplier?.name ?? 'Proveedor sin registrar',
    packingListCount: record.packingListIds.length,
    pieceCount: lists.reduce((total, list) => total + list.pieces.length, 0),
    fine,
    profit: previewExportProfit(fine, record.grossProfitPercentage),
  };
};
export type ExportRow = ReturnType<typeof toExportRow>;

/** Filas de la tabla: filtradas por estado (vacío = todos) y de la más reciente a la más antigua. */
export const toExportRows = (
  records: readonly Export[],
  context: Parameters<typeof toExportRow>[1] & { status: string },
): ExportRow[] =>
  records
    .filter((record) => !context.status || record.status === context.status)
    .map((record) => toExportRow(record, context))
    .sort((a, b) => b.record.shippedOn.localeCompare(a.record.shippedOn));

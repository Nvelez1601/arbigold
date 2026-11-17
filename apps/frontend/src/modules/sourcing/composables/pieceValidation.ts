import { pieceSchema } from '@arbigold/shared-types';

/** Una pieza mientras se escribe: todo es texto (los gramos nunca pasan por number). */
export interface PieceRow {
  readonly key: string;
  number: string;
  grossWeight: string;
  fineness: string;
}

export type PieceField = 'number' | 'grossWeight' | 'fineness';
export type PieceErrors = Record<string, Partial<Record<PieceField, string>>>;

type FieldIssues = { issues: readonly { message: string }[] };
type FieldSchema = { safeParse(value: unknown): { success: boolean; error?: FieldIssues } };

export const pieceNumberOf = (row: Pick<PieceRow, 'number'>): number | null =>
  /^\d+$/.test(row.number.trim()) ? Number.parseInt(row.number, 10) : null;

const firstIssue = (schema: FieldSchema, value: string): string | undefined => {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error?.issues[0]?.message;
};

const numberIssue = (row: PieceRow, rows: readonly PieceRow[]): string | undefined => {
  const value = pieceNumberOf(row);
  if (value === null || value < 1) return 'Usa un número entero desde 1';
  const repeated = rows.filter((other) => pieceNumberOf(other) === value).length > 1;
  return repeated ? `La pieza ${value} ya existe: usa otro número` : undefined;
};

const FIELD_RULES: Record<
  PieceField,
  { missing: string; check: (row: PieceRow, rows: readonly PieceRow[]) => string | undefined }
> = {
  number: { missing: 'Escribe el número de la pieza', check: numberIssue },
  grossWeight: {
    missing: 'Escribe el peso bruto en gramos',
    check: (row) => firstIssue(pieceSchema.shape.grossWeight, row.grossWeight),
  },
  fineness: {
    missing: 'Escribe la ley, p. ej. 920 o 0.92',
    check: (row) => firstIssue(pieceSchema.shape.fineness, row.fineness),
  },
};
const FIELDS = Object.keys(FIELD_RULES) as PieceField[];

type Judge = (field: PieceField, row: PieceRow) => string | undefined;
const errorsBy = (rows: readonly PieceRow[], judge: Judge): PieceErrors =>
  Object.fromEntries(
    rows.map((row) => [
      row.key,
      Object.fromEntries(
        FIELDS.flatMap((field) => [[field, judge(field, row)]].filter(([, m]) => m)),
      ),
    ]),
  );

/** Errores de formato de lo que YA se escribió (lo vacío no se marca hasta intentar guardar). */
export const pieceFormatErrors = (rows: readonly PieceRow[]): PieceErrors =>
  errorsBy(rows, (field, row) =>
    row[field].trim() ? FIELD_RULES[field].check(row, rows) : undefined,
  );

/** Campos obligatorios vacíos: se muestran después del primer intento de guardar. */
export const pieceMissingErrors = (rows: readonly PieceRow[]): PieceErrors =>
  errorsBy(rows, (field, row) => (row[field].trim() ? undefined : FIELD_RULES[field].missing));

export const mergeErrors = (base: PieceErrors, extra: PieceErrors): PieceErrors =>
  Object.fromEntries(Object.keys(base).map((key) => [key, { ...extra[key], ...base[key] }]));

<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { ref, useTemplateRef, watch } from 'vue';
import { formatGrams, formatPerMille } from '../../../shared/utils/format.ts';
import { fineWeight, toPerMille } from '../../../shared/utils/gold.ts';
import {
  type PieceErrors,
  type PieceField,
  type PieceRow,
  createPieceRow,
} from '../composables/usePackingListEditor.ts';

/** Cada fila se lee como una lectura de ensayo: número, bruto, ley escrita → sello en ‰ → fino. */
const rows = defineModel<PieceRow[]>({ required: true });
const props = withDefaults(defineProps<{ errors?: PieceErrors; readonly?: boolean }>(), {
  errors: () => ({}),
  readonly: false,
});

const COLUMNS: readonly {
  field: PieceField;
  label: string;
  inputmode: 'numeric' | 'decimal';
  align: string;
}[] = [
  { field: 'number', label: 'Número', inputmode: 'numeric', align: 'text-center' },
  { field: 'grossWeight', label: 'Peso bruto', inputmode: 'decimal', align: 'text-right' },
  { field: 'fineness', label: 'Ley', inputmode: 'decimal', align: 'text-right' },
];

const table = useTemplateRef<HTMLElement>('table');
const errorOf = (row: PieceRow, field: PieceField) => props.errors[row.key]?.[field];
const errorId = (row: PieceRow, field: PieceField) => `${row.key}-${field}-error`;
const perMille = (row: PieceRow) => toPerMille(row.fineness);
const fine = (row: PieceRow) => fineWeight(row.grossWeight, row.fineness);

/** Pieza cuyo peso bruto recibe el foco cuando ya está en pantalla. */
const focusIndex = ref<number | null>(null);
watch(
  [focusIndex, () => rows.value.length],
  ([index]) => {
    const inputs = table.value?.querySelectorAll<HTMLElement>('[data-field="grossWeight"]');
    const target = index === null ? undefined : inputs?.[index];
    if (!target) return;
    target.focus();
    focusIndex.value = null;
  },
  { flush: 'post' },
);
const addPiece = () => {
  if (props.readonly) return;
  focusIndex.value = rows.value.length;
  rows.value = [...rows.value, createPieceRow(rows.value)];
};
const removePiece = (key: string) => {
  rows.value = rows.value.filter((row) => row.key !== key);
};
/** Enter avanza a la pieza siguiente; en la última, agrega una nueva. */
const onEnter = (index: number) => {
  if (props.readonly) return;
  if (index === rows.value.length - 1) return addPiece();
  focusIndex.value = index + 1;
};
</script>

<template>
  <div>
    <div ref="table" class="overflow-x-auto rounded-lg border border-border bg-surface-0">
      <table class="w-full min-w-[40rem] text-sm">
        <caption class="sr-only">
          Piezas del packing list
        </caption>
        <thead class="bg-surface-100 text-left text-muted">
          <tr>
            <th scope="col" class="w-20 px-3 py-2 text-center font-medium">N.º</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">Peso bruto (g)</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">Ley como la escriben</th>
            <th scope="col" class="px-3 py-2 font-medium">Ley en ‰</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">Peso fino (g)</th>
            <th v-if="!readonly" scope="col" class="w-12 px-2 py-2">
              <span class="sr-only">Quitar</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200">
          <tr v-for="(row, index) in rows" :key="row.key">
            <td v-for="column in COLUMNS" :key="column.field" class="px-3 py-2 align-top">
              <InputText
                v-model="row[column.field]"
                :inputmode="column.inputmode"
                :readonly="readonly"
                :invalid="Boolean(errorOf(row, column.field))"
                :aria-invalid="errorOf(row, column.field) ? 'true' : undefined"
                :aria-label="`${column.label} de la pieza ${row.number || index + 1}`"
                :aria-describedby="
                  errorOf(row, column.field) ? errorId(row, column.field) : undefined
                "
                :data-field="column.field"
                autocomplete="off"
                spellcheck="false"
                class="w-full tabular-nums"
                :class="column.align"
                @keydown.enter.prevent="onEnter(index)"
              />
              <p
                v-if="errorOf(row, column.field)"
                :id="errorId(row, column.field)"
                class="mt-1 text-xs text-pretty text-danger"
              >
                {{ errorOf(row, column.field) }}
              </p>
            </td>
            <td class="px-3 py-2 align-top">
              <span
                v-if="perMille(row)"
                data-hallmark
                class="inline-flex h-9 items-center rounded-[4px] border-[1.5px] border-brand-dusty-lavender px-2 font-semibold whitespace-nowrap text-brand-dusty-lavender tabular-nums shadow-[inset_0_0_0_2px_#fff,inset_0_0_0_3px_rgb(128_109_145/0.35)]"
              >
                {{ formatPerMille(perMille(row)?.toString() ?? '0') }}
              </span>
              <span
                v-else
                class="inline-flex h-9 items-center rounded-[4px] border border-dashed border-border-strong px-2 text-muted"
              >
                <span aria-hidden="true">—</span><span class="sr-only">Sin ley</span>
              </span>
            </td>
            <td
              class="px-3 py-2 text-right align-top leading-9 font-semibold whitespace-nowrap text-heading tabular-nums"
            >
              {{ fine(row) ? formatGrams(fine(row)?.toString() ?? '0') : '—' }}
            </td>
            <td v-if="!readonly" class="px-2 py-2 align-top">
              <Button
                text
                rounded
                severity="secondary"
                :aria-label="`Quitar pieza ${row.number || index + 1}`"
                @click="removePiece(row.key)"
              >
                <X class="size-4" aria-hidden="true" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!readonly" class="mt-3 flex flex-wrap items-center gap-3">
      <Button severity="secondary" outlined @click="addPiece">
        <Plus class="size-4" aria-hidden="true" />
        Agregar pieza
      </Button>
      <p class="text-sm text-muted">
        La ley puede ir como fracción (0.875), porcentaje (94.5) o milésimas (920.5). Enter en la
        última fila agrega otra pieza.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Operation } from '@arbigold/shared-types';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { formatDate, formatGramsOrDash } from '../../../shared/utils/format.ts';
import {
  OPERATION_AMOUNT_COLUMNS as AMOUNT_COLUMNS,
  OPERATION_ROW_ACTIONS as ROW_ACTIONS,
  type StatusChange,
} from '../composables/operationStatus.ts';
import {
  OPERATION_STATUS_TAG,
  type OperationRow,
  type OperationTotals,
  marginTextClass,
} from '../composables/useOperationForm.ts';

/** Tabla de cierres de precio: presentacional (filas y totales entran, la acción sale). */
defineProps<{ rows: readonly OperationRow[]; totals: OperationTotals }>();
defineEmits<{ 'status-change': [row: OperationRow, status: StatusChange] }>();

const NUMERIC_HEADER = '[&>div]:justify-end';
const NUMERIC_CELL = 'text-right tabular-nums whitespace-nowrap';
const TOTAL_CELL = 'text-right tabular-nums whitespace-nowrap font-semibold text-heading';
const GRAM_COLUMNS = [
  { header: 'Debe el cliente', key: 'clientGrams' },
  { header: 'Al proveedor', key: 'supplierGrams' },
] as const;

const statusTag = (status: Operation['status']) => OPERATION_STATUS_TAG[status];
/** Las operaciones cerradas se distinguen por fondo y Tag, nunca con opacidad (contraste AA). */
const rowClass = (row: OperationRow) =>
  row.status === 'ABIERTA' ? '' : 'bg-surface-50! text-muted';
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-border bg-surface-0">
    <DataTable :value="[...rows]" data-key="id" size="small" class="text-sm" :row-class="rowClass">
      <Column header="Fecha" body-class="whitespace-nowrap" footer-class="font-semibold">
        <template #body="{ data }">{{ formatDate(data.closedOn) }}</template>
        <template #footer>Abiertas ({{ totals.count }})</template>
      </Column>
      <Column header="Cliente y proveedor" body-class="min-w-40">
        <template #body="{ data }">
          <span class="block font-medium text-heading wrap-anywhere">{{ data.clientName }}</span>
          <span class="block text-xs text-muted wrap-anywhere">{{ data.supplierName }}</span>
        </template>
      </Column>
      <Column
        v-for="column in AMOUNT_COLUMNS"
        :key="column.header"
        :header="column.header"
        :header-class="NUMERIC_HEADER"
        :body-class="NUMERIC_CELL"
      >
        <template #body="{ data }">
          {{ column.value(data) }}
          <span v-if="column.detail" class="block text-xs text-muted">{{
            column.detail(data)
          }}</span>
        </template>
      </Column>
      <Column
        v-for="column in GRAM_COLUMNS"
        :key="column.key"
        :header="column.header"
        :header-class="NUMERIC_HEADER"
        :body-class="NUMERIC_CELL"
        :footer-class="TOTAL_CELL"
      >
        <template #body="{ data }">{{ formatGramsOrDash(data.figures[column.key]) }}</template>
        <template #footer>{{ formatGramsOrDash(totals[column.key]) }}</template>
      </Column>
      <Column
        header="Margen"
        :header-class="NUMERIC_HEADER"
        :body-class="NUMERIC_CELL"
        :footer-class="TOTAL_CELL"
      >
        <template #body="{ data }">
          <span :class="marginTextClass(data.figures.margin)" data-testid="row-margin">
            {{ formatGramsOrDash(data.figures.margin) }}
          </span>
        </template>
        <template #footer>
          <span :class="marginTextClass(totals.margin)" data-testid="total-margin">
            {{ formatGramsOrDash(totals.margin) }}
          </span>
        </template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }"><Tag v-bind="statusTag(data.status)" /></template>
      </Column>
      <Column>
        <template #header><span class="sr-only">Acciones</span></template>
        <template #body="{ data }">
          <div v-if="data.status === 'ABIERTA'" class="flex gap-1 whitespace-nowrap">
            <Button
              v-for="action in ROW_ACTIONS"
              :key="action.status"
              size="small"
              text
              rounded
              :severity="action.severity"
              :aria-label="`${action.verb} la operación de ${data.clientName}`"
              :title="`${action.verb} la operación de ${data.clientName}`"
              @click="$emit('status-change', data, action.status)"
            >
              <template #icon>
                <component :is="action.icon" class="size-4 shrink-0" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

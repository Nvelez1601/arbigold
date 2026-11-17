<script setup lang="ts">
import type { ExportInput } from '@arbigold/shared-types';
import { useQueryClient } from '@tanstack/vue-query';
import { Plus, Users } from 'lucide-vue-next';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, defineAsyncComponent, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EmptyState from '../../../shared/components/EmptyState.vue';
import PageHeader from '../../../shared/components/PageHeader.vue';
import { useCollection } from '../../../shared/composables/useCollection.ts';
import {
  QUERY_KEYS,
  clientsRepository,
  exportsRepository,
  packingListsRepository,
  suppliersRepository,
} from '../../../shared/data/repositories.ts';
import { formatDate, formatGrams } from '../../../shared/utils/format.ts';
import {
  EXPORT_STATUS_FILTER_OPTIONS,
  EXPORT_STATUS_LABELS,
  EXPORT_STATUS_SEVERITY,
  type ExportRow,
  advanceExport,
  describeAdvance,
  describeSaveFailure,
  nextExportStatusLabel,
  pickEmptyState,
  registerExport,
  toExportRows,
  toPackingListOptions,
} from '../composables/useExportForm.ts';

/* El formulario se carga aparte: la tabla no espera a Dialog, Select de proveedores ni la vista previa. */
const ExportFormDialog = defineAsyncComponent(() => import('../components/ExportFormDialog.vue'));
const repositories = { exports: exportsRepository, packingLists: packingListsRepository };

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const queryClient = useQueryClient();

const exportsQuery = useCollection(QUERY_KEYS.exports, exportsRepository);
const suppliersQuery = useCollection(QUERY_KEYS.suppliers, suppliersRepository);
const packingListsQuery = useCollection(QUERY_KEYS.packingLists, packingListsRepository);
const clientsQuery = useCollection(QUERY_KEYS.clients, clientsRepository);
const queries = [exportsQuery, suppliersQuery, packingListsQuery, clientsQuery];

const suppliers = computed(() => suppliersQuery.data.value ?? []);
const packingLists = computed(() => packingListsQuery.data.value ?? []);
const activeSuppliers = computed(() => suppliers.value.filter((supplier) => supplier.active));
const packingListOptions = computed(() =>
  toPackingListOptions(packingLists.value, clientsQuery.data.value ?? []),
);
const allExports = computed(() => exportsQuery.data.value ?? []);
const emptyState = computed(() =>
  pickEmptyState({
    suppliers: activeSuppliers.value.length > 0,
    exports: allExports.value.length > 0,
    available: packingListOptions.value.length > 0,
  }),
);
const isLoading = computed(() => queries.some((query) => query.isPending.value));
const hasError = computed(() => queries.some((query) => query.isError.value));
const retry = () => queries.forEach((query) => void query.refetch());

const statusFilter = computed(() => {
  const value = route.query['estado'];
  return typeof value === 'string' && Object.hasOwn(EXPORT_STATUS_LABELS, value) ? value : '';
});
const setStatusFilter = (value: string | null) =>
  router.replace({ query: value?.trim() ? { estado: value.trim() } : {} });

const rows = computed(() =>
  toExportRows(allExports.value, {
    suppliers: suppliers.value,
    packingLists: packingLists.value,
    status: statusFilter.value,
  }),
);

const isDialogOpen = ref(false);
const dialogKey = ref(0);
const isSaving = ref(false);
const openDialog = () => {
  dialogKey.value += 1;
  isDialogOpen.value = true;
};

const refresh = () =>
  Promise.all(
    [QUERY_KEYS.exports, QUERY_KEYS.packingLists].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );

const saveExport = async (input: ExportInput) => {
  isSaving.value = true;
  try {
    await registerExport(input, repositories);
    await refresh();
    isDialogOpen.value = false;
    toast.add({ severity: 'success', summary: 'Exportación registrada', life: 4000 });
  } catch (error) {
    toast.add({ severity: 'error', ...describeSaveFailure(error) });
  } finally {
    isSaving.value = false;
  }
};

const confirmAdvance = (row: ExportRow) => {
  const { target, message, failure } = describeAdvance(row);
  confirm.require({
    header: `Pasar a “${target}”`,
    message,
    acceptProps: { label: `Pasar a ${target}` },
    rejectProps: { label: 'Cancelar', severity: 'secondary', text: true },
    accept: async () => {
      try {
        await advanceExport(row.record, repositories);
        toast.add({ severity: 'success', summary: `Exportación en “${target}”`, life: 4000 });
      } catch {
        toast.add({ severity: 'error', summary: failure.summary, detail: failure.detail });
      }
      await refresh();
    },
  });
};

const thClass = 'px-3 py-2 font-medium';
const NUMERIC_COLUMNS = ['Packing lists', 'Piezas', 'Peso fino total', 'Utilidad neta estimada'];
const COLUMNS = ['Fecha', 'Proveedor', 'Destino', ...NUMERIC_COLUMNS, 'Estado'];
const columnClass = (column: string) => [thClass, NUMERIC_COLUMNS.includes(column) && 'text-right'];
const tdClass = 'px-3 py-2';
const numClass = 'px-3 py-2 text-right tabular-nums';
</script>

<template>
  <PageHeader title="Exportaciones" description="Envíos al proveedor y resultados">
    <template #actions>
      <Button label="Nueva exportación" @click="openDialog">
        <template #icon><Plus class="size-4" aria-hidden="true" /></template>
      </Button>
    </template>
  </PageHeader>

  <p v-if="isLoading" class="text-sm text-muted" aria-busy="true">Cargando exportaciones…</p>
  <EmptyState
    v-else-if="hasError"
    :icon="Users"
    title="No se pudieron cargar las exportaciones"
    description="Vuelve a intentarlo. Si el problema sigue, recarga la página."
  >
    <Button label="Reintentar" severity="secondary" @click="retry" />
  </EmptyState>
  <EmptyState
    v-else-if="emptyState"
    :icon="emptyState.icon"
    :title="emptyState.title"
    :description="emptyState.description"
  >
    <RouterLink
      v-if="'link' in emptyState"
      :to="emptyState.link.to"
      class="font-medium text-primary-600 underline"
    >
      {{ emptyState.link.label }}
    </RouterLink>
    <Button v-else label="Nueva exportación" @click="openDialog" />
  </EmptyState>

  <section v-else class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label id="export-status-filter-label" for="export-status-filter" class="text-sm text-muted">
        Estado
      </label>
      <Select
        input-id="export-status-filter"
        aria-labelledby="export-status-filter-label"
        :model-value="statusFilter"
        :options="EXPORT_STATUS_FILTER_OPTIONS"
        option-label="label"
        option-value="value"
        class="w-48"
        @update:model-value="setStatusFilter"
      />
      <p v-if="!packingListOptions.length" class="text-sm text-muted" data-test="no-available">
        No quedan packing lists recibidos sin exportar.
        <RouterLink to="/packing-lists" class="text-primary-600 underline">
          Marca más como recibidos
        </RouterLink>
      </p>
    </div>
    <div class="overflow-x-auto rounded-lg border border-border bg-surface-0">
      <table class="w-full text-sm">
        <thead class="bg-surface-100 text-left text-heading">
          <tr>
            <th v-for="column in COLUMNS" :key="column" scope="col" :class="columnClass(column)">
              {{ column }}
            </th>
            <th scope="col" :class="thClass"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border text-text">
          <tr v-if="!rows.length">
            <td colspan="9" class="px-3 py-6 text-center text-muted">
              No hay exportaciones en este estado.
            </td>
          </tr>
          <tr v-for="row in rows" :key="row.record.id" data-test="export-row">
            <td :class="[tdClass, 'whitespace-nowrap']">{{ formatDate(row.record.shippedOn) }}</td>
            <td
              :class="[tdClass, 'max-w-48 truncate font-medium text-heading']"
              :title="row.supplierName"
            >
              {{ row.supplierName }}
            </td>
            <td :class="[tdClass, 'max-w-40 truncate']" :title="row.record.destination">
              {{ row.record.destination ?? '—' }}
            </td>
            <td :class="numClass">{{ row.packingListCount }}</td>
            <td :class="numClass">{{ row.pieceCount }}</td>
            <td :class="numClass">{{ formatGrams(row.fine.toString()) }}</td>
            <td :class="numClass" data-test="net">
              <span v-if="row.record.settlementMode === 'COBRO_TOTAL'" class="text-muted">
                Cobro total
              </span>
              <span
                v-else-if="row.profit"
                :class="row.profit.netProfit.isNegative() ? 'text-danger' : 'text-success'"
              >
                {{ formatGrams(row.profit.netProfit.toString()) }}
              </span>
              <span v-else class="text-muted">Sin % negociado</span>
            </td>
            <td :class="tdClass">
              <Tag
                :value="EXPORT_STATUS_LABELS[row.record.status]"
                :severity="EXPORT_STATUS_SEVERITY[row.record.status]"
              />
            </td>
            <td :class="[tdClass, 'text-right whitespace-nowrap']">
              <Button
                v-if="nextExportStatusLabel(row.record.status)"
                :label="`Pasar a ${nextExportStatusLabel(row.record.status)}`"
                size="small"
                text
                @click="confirmAdvance(row)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <ExportFormDialog
    :key="dialogKey"
    v-model:visible="isDialogOpen"
    :suppliers="activeSuppliers"
    :packing-lists="packingListOptions"
    :saving="isSaving"
    @submit="saveExport"
  />
</template>

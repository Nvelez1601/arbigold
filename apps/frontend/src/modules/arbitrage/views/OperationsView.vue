<script setup lang="ts">
import type { Operation, OperationInput } from '@arbigold/shared-types';
import type { Decimal } from 'decimal.js';
import { Plus, Scale, Users } from 'lucide-vue-next';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';
import EmptyState from '../../../shared/components/EmptyState.vue';
import PageHeader from '../../../shared/components/PageHeader.vue';
import {
  useCollection,
  useCollectionMutations,
} from '../../../shared/composables/useCollection.ts';
import {
  QUERY_KEYS,
  clientsRepository,
  operationsRepository,
  suppliersRepository,
} from '../../../shared/data/repositories.ts';
import {
  formatDate,
  formatGrams,
  formatMoney,
  formatPercent,
} from '../../../shared/utils/format.ts';
import OperationFormDialog from '../components/OperationFormDialog.vue';
import {
  OPERATION_STATUS_TAG,
  marginTextClass,
  newestFirst,
  openOperationsTotals,
  operationFigures,
} from '../composables/useOperationForm.ts';
import { STATUS_CHANGES, statusChangeMessage } from '../composables/operationStatus.ts';

const operationsQuery = useCollection(QUERY_KEYS.operations, operationsRepository);
const clientsQuery = useCollection(QUERY_KEYS.clients, clientsRepository);
const suppliersQuery = useCollection(QUERY_KEYS.suppliers, suppliersRepository);
const { create, update } = useCollectionMutations(QUERY_KEYS.operations, operationsRepository);
const toast = useToast();
const confirm = useConfirm();

const clients = computed(() => clientsQuery.data.value ?? []);
const suppliers = computed(() => suppliersQuery.data.value ?? []);
const queries = [operationsQuery, clientsQuery, suppliersQuery];
const isLoading = computed(() => queries.some((query) => query.isLoading.value));
const hasError = computed(() => queries.some((query) => query.isError.value));
const retry = () => queries.forEach((query) => void query.refetch());
/** Solo un proveedor de FONDEO adelanta fondos; TERCEROS trae material propio. */
const canOperate = computed(
  () =>
    clients.value.some((c) => c.active) &&
    suppliers.value.some((s) => s.active && s.kind === 'FONDEO'),
);
const nameOf = (list: readonly { id: string; name: string }[], id: string) =>
  list.find((item) => item.id === id)?.name ?? 'Sin registro';

const rows = computed(() =>
  newestFirst(operationsQuery.data.value ?? []).map((operation) => ({
    ...operation,
    clientName: nameOf(clients.value, operation.clientId),
    supplierName: nameOf(suppliers.value, operation.supplierId),
    figures: operationFigures(operation),
  })),
);
type Row = (typeof rows.value)[number];
const totals = computed(() => openOperationsTotals(operationsQuery.data.value ?? []));

const grams = (value: Decimal | null) => (value ? formatGrams(value.toString()) : '—');

const NUMERIC_HEADER = '[&>div]:justify-end';
const NUMERIC_CELL = 'text-right tabular-nums whitespace-nowrap';
const TOTAL_CELL = 'text-right tabular-nums whitespace-nowrap font-semibold text-heading';

const isDialogOpen = ref(false);
const register = async (input: OperationInput) => {
  try {
    await create.mutateAsync(input);
    isDialogOpen.value = false;
    toast.add({ severity: 'success', summary: 'Operación registrada', life: 4000 });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'No se pudo registrar la operación',
      detail: 'Tus datos siguen en el formulario: vuelve a intentarlo.',
    });
  }
};

type StatusChange = keyof typeof STATUS_CHANGES;
const changeStatus = async (row: Row, status: StatusChange) => {
  try {
    await update.mutateAsync({ id: row.id, patch: { status } });
    toast.add({ severity: 'success', summary: STATUS_CHANGES[status].done, life: 4000 });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'No se pudo cambiar el estado',
      detail: 'La operación sigue abierta: vuelve a intentarlo.',
    });
  }
};
/** Las operaciones cerradas se distinguen por fondo y Tag, nunca con opacidad (contraste AA). */
const statusTag = (status: Operation['status']) => OPERATION_STATUS_TAG[status];
const rowClass = (row: Row) => (row.status === 'ABIERTA' ? '' : 'bg-surface-50! text-muted');
const askStatusChange = (row: Row, status: StatusChange) => {
  const change = STATUS_CHANGES[status];
  confirm.require({
    header: change.header,
    message: statusChangeMessage(row, status),
    acceptProps: { label: change.accept, severity: change.severity },
    rejectProps: { label: 'Volver', severity: 'secondary', text: true },
    accept: () => changeStatus(row, status),
  });
};
</script>

<template>
  <PageHeader
    title="Operaciones"
    description="Cada operación cierra el precio de un monto que adelanta el proveedor: el cliente queda debiendo gramos a su % y el margen es la diferencia con el % del proveedor."
  >
    <template #actions>
      <Button label="Nueva operación" :disabled="!canOperate" @click="isDialogOpen = true">
        <template #icon><Plus class="size-4" aria-hidden="true" /></template>
      </Button>
    </template>
  </PageHeader>

  <p v-if="isLoading" class="text-sm text-muted" aria-busy="true">Cargando operaciones…</p>
  <EmptyState
    v-else-if="hasError"
    :icon="Users"
    title="No se pudieron cargar las operaciones"
    description="Vuelve a intentarlo. Si el problema sigue, recarga la página."
  >
    <Button label="Reintentar" severity="secondary" @click="retry" />
  </EmptyState>
  <EmptyState
    v-else-if="!rows.length && !canOperate"
    :icon="Users"
    title="Necesitas un cliente y un proveedor de fondeo activos"
    description="Una operación necesita un proveedor de fondeo activo que adelante el monto y un cliente activo que lo reciba y pague en oro."
  >
    <div class="flex flex-wrap justify-center gap-4 text-sm font-medium">
      <RouterLink to="/clientes" class="text-primary-600 underline-offset-4 hover:underline">
        Ir a clientes
      </RouterLink>
      <RouterLink to="/proveedores" class="text-primary-600 underline-offset-4 hover:underline">
        Ir a proveedores
      </RouterLink>
    </div>
  </EmptyState>
  <EmptyState
    v-else-if="!rows.length"
    :icon="Scale"
    title="Todavía no hay operaciones"
    description="Registra el primer cierre de precio: verás los gramos que debe el cliente y el margen antes de guardar."
  >
    <Button label="Nueva operación" @click="isDialogOpen = true" />
  </EmptyState>
  <div v-else class="overflow-x-auto rounded-lg border border-border bg-surface-0">
    <DataTable :value="rows" data-key="id" size="small" class="text-sm" :row-class="rowClass">
      <Column header="Fecha" body-class="whitespace-nowrap" footer-class="font-semibold">
        <template #body="{ data }">{{ formatDate(data.closedOn) }}</template>
        <template #footer>Abiertas ({{ totals.count }})</template>
      </Column>
      <Column field="clientName" header="Cliente" body-class="min-w-32 wrap-anywhere" />
      <Column field="supplierName" header="Proveedor" body-class="min-w-32 wrap-anywhere" />
      <Column header="Monto" :header-class="NUMERIC_HEADER" :body-class="NUMERIC_CELL">
        <template #body="{ data }">{{ formatMoney(data.amount, data.currency) }}</template>
      </Column>
      <Column header="P. INT" :header-class="NUMERIC_HEADER" :body-class="NUMERIC_CELL">
        <template #body="{ data }">
          {{ formatMoney(data.internationalPricePerOunce, 'USD') }}
        </template>
      </Column>
      <Column header="% cliente" :header-class="NUMERIC_HEADER" :body-class="NUMERIC_CELL">
        <template #body="{ data }">{{ formatPercent(data.clientPercentage) }}</template>
      </Column>
      <Column header="% proveedor" :header-class="NUMERIC_HEADER" :body-class="NUMERIC_CELL">
        <template #body="{ data }">{{ formatPercent(data.supplierPercentage) }}</template>
      </Column>
      <Column
        header="Gramos que debe el cliente"
        :header-class="NUMERIC_HEADER"
        :body-class="NUMERIC_CELL"
        :footer-class="TOTAL_CELL"
      >
        <template #body="{ data }">{{ grams(data.figures.clientGrams) }}</template>
        <template #footer>{{ grams(totals.clientGrams) }}</template>
      </Column>
      <Column
        header="Gramos a entregar al proveedor"
        :header-class="NUMERIC_HEADER"
        :body-class="NUMERIC_CELL"
        :footer-class="TOTAL_CELL"
      >
        <template #body="{ data }">{{ grams(data.figures.supplierGrams) }}</template>
        <template #footer>{{ grams(totals.supplierGrams) }}</template>
      </Column>
      <Column
        header="Margen en gramos"
        :header-class="NUMERIC_HEADER"
        :body-class="NUMERIC_CELL"
        :footer-class="TOTAL_CELL"
      >
        <template #body="{ data }">
          <span :class="marginTextClass(data.figures.margin)" data-testid="row-margin">
            {{ grams(data.figures.margin) }}
          </span>
        </template>
        <template #footer>
          <span :class="marginTextClass(totals.margin)" data-testid="total-margin">
            {{ grams(totals.margin) }}
          </span>
        </template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }"><Tag v-bind="statusTag(data.status)" /></template>
      </Column>
      <Column header="Acciones">
        <template #body="{ data }">
          <div v-if="data.status === 'ABIERTA'" class="flex gap-1 whitespace-nowrap">
            <Button
              label="Marcar como cumplida"
              size="small"
              text
              @click="askStatusChange(data, 'CUMPLIDA')"
            />
            <Button
              label="Cancelar"
              size="small"
              text
              severity="danger"
              @click="askStatusChange(data, 'CANCELADA')"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

  <OperationFormDialog
    v-model:visible="isDialogOpen"
    :suppliers="suppliers"
    :clients="clients"
    :is-saving="create.isPending.value"
    @submit="register"
  />
</template>

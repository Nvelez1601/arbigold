<script setup lang="ts">
import type { OperationInput } from '@arbigold/shared-types';
import { Plus, Scale, Users } from 'lucide-vue-next';
import Button from 'primevue/button';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref } from 'vue';
import EmptyState from '../../../shared/components/EmptyState.vue';
import MetricStrip from '../../../shared/components/MetricStrip.vue';
import PageHeader from '../../../shared/components/PageHeader.vue';
import {
  useCollection,
  useCollectionMutations,
} from '../../../shared/composables/useCollection.ts';
import { useNotify } from '../../../shared/composables/useNotify.ts';
import {
  QUERY_KEYS,
  clientsRepository,
  operationsRepository,
  suppliersRepository,
} from '../../../shared/data/repositories.ts';
import OperationFormDialog from '../components/OperationFormDialog.vue';
import OperationsTable from '../components/OperationsTable.vue';
import { operationMetrics } from '../composables/operationMetrics.ts';
import {
  newestFirst,
  openOperationsTotals,
  operationFigures,
  type OperationRow,
} from '../composables/useOperationForm.ts';
import { STATUS_CHANGES, statusChangeMessage } from '../composables/operationStatus.ts';

const operationsQuery = useCollection(QUERY_KEYS.operations, operationsRepository);
const clientsQuery = useCollection(QUERY_KEYS.clients, clientsRepository);
const suppliersQuery = useCollection(QUERY_KEYS.suppliers, suppliersRepository);
const { create, update } = useCollectionMutations(QUERY_KEYS.operations, operationsRepository);
const notify = useNotify();
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
type Row = OperationRow;
const totals = computed(() => openOperationsTotals(operationsQuery.data.value ?? []));

const metrics = computed(() => operationMetrics(operationsQuery.data.value ?? []));

const isDialogOpen = ref(false);
const register = async (input: OperationInput) => {
  try {
    await create.mutateAsync(input);
    isDialogOpen.value = false;
    notify('success', 'Operación registrada', input.notes ?? '');
  } catch {
    notify(
      'error',
      'No se pudo registrar la operación',
      'Tus datos siguen en el formulario: vuelve a intentarlo.',
    );
  }
};

type StatusChange = keyof typeof STATUS_CHANGES;
const changeStatus = async (row: Row, status: StatusChange) => {
  try {
    await update.mutateAsync({ id: row.id, patch: { status } });
    notify('success', STATUS_CHANGES[status].done, row.clientName);
  } catch {
    notify(
      'error',
      'No se pudo cambiar el estado',
      'La operación sigue abierta: vuelve a intentarlo.',
    );
  }
};
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
        <template #icon><Plus class="size-4 shrink-0" aria-hidden="true" /></template>
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
  <template v-else>
    <MetricStrip :metrics="metrics" />
    <OperationsTable :rows="rows" :totals="totals" @status-change="askStatusChange" />
  </template>

  <OperationFormDialog
    v-model:visible="isDialogOpen"
    :suppliers="suppliers"
    :clients="clients"
    :is-saving="create.isPending.value"
    @submit="register"
  />
</template>

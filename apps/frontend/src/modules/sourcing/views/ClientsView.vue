<script setup lang="ts">
import type { Client } from '@arbigold/shared-types';
import { Pencil, Search, UserPlus, Users } from 'lucide-vue-next';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';
import {
  useCollection,
  useCollectionMutations,
} from '../../../shared/composables/useCollection.ts';
import EmptyState from '../../../shared/components/EmptyState.vue';
import MetricStrip from '../../../shared/components/MetricStrip.vue';
import PageHeader from '../../../shared/components/PageHeader.vue';
import { QUERY_KEYS, clientsRepository } from '../../../shared/data/repositories.ts';
import { formatPercent } from '../../../shared/utils/format.ts';
import ClientFormDialog from '../components/ClientFormDialog.vue';
import { clientMetrics } from '../composables/clientMetrics.ts';
import {
  type ValidClientInput,
  type StatusAction,
  statusActionFor,
  useClientSearch,
} from '../composables/useClientForm.ts';

const KIND_LABELS: Record<Client['kind'], string> = { PERSONA: 'Persona', EMPRESA: 'Empresa' };
interface ClientColumn {
  readonly header: string;
  readonly value: (client: Client) => string | undefined;
  /** Si la tiene, la celda se muestra como etiqueta con esa severidad. */
  readonly tag?: (client: Client) => string;
  readonly cellClass?: (client: Client) => string;
  readonly isNumeric?: boolean;
}
const COLUMNS: readonly ClientColumn[] = [
  {
    header: 'Nombre',
    value: (client) => client.name,
    cellClass: (client) => `max-w-64 font-medium ${client.active ? 'text-heading' : 'text-muted'}`,
  },
  { header: 'Tipo', value: (client) => KIND_LABELS[client.kind], tag: () => 'secondary' },
  { header: 'Documento', value: (client) => client.documentId },
  { header: 'Ubicación', value: (client) => client.location },
  { header: 'Teléfono', value: (client) => client.phone },
  {
    header: '% compra',
    value: ({ defaultPercentage }) => defaultPercentage && formatPercent(defaultPercentage),
    isNumeric: true,
  },
  {
    header: 'Estado',
    value: (client) => (client.active ? 'Activo' : 'Inactivo'),
    tag: (client) => (client.active ? 'success' : 'secondary'),
  },
];

const toast = useToast();
const confirm = useConfirm();
const { data, isPending, isError } = useCollection(QUERY_KEYS.clients, clientsRepository);
const { create, update } = useCollectionMutations(QUERY_KEYS.clients, clientsRepository);

const byName = (a: Client, b: Client) => a.name.localeCompare(b.name, 'es');
const allClients = computed(() => [...(data.value ?? [])].sort(byName));
const { search, results: visibleClients } = useClientSearch(allClients);

const metrics = computed(() => clientMetrics(allClients.value));

const isDialogVisible = ref(false);
const editingClient = ref<Client | null>(null);
const isSaving = computed(() => create.isPending.value || update.isPending.value);
const openDialog = (client: Client | null) => {
  editingClient.value = client;
  isDialogVisible.value = true;
};

const showError = (summary: string, detail: string) =>
  toast.add({ severity: 'error', summary, detail, life: 6000 });

const persist = (input: ValidClientInput) => {
  const target = editingClient.value;
  return target ? update.mutateAsync({ id: target.id, patch: input }) : create.mutateAsync(input);
};

const saveClient = async (input: ValidClientInput) => {
  try {
    await persist(input);
    isDialogVisible.value = false;
    toast.add({ severity: 'success', summary: 'Cliente guardado', detail: input.name, life: 3000 });
  } catch {
    showError(
      'No se pudo guardar el cliente',
      'Tus datos siguen en el formulario: vuelve a intentarlo.',
    );
  }
};

const applyStatus = async (client: Client, action: StatusAction) => {
  try {
    await update.mutateAsync({ id: client.id, patch: { active: !client.active } });
    toast.add({ severity: 'success', summary: action.done, detail: client.name, life: 3000 });
  } catch {
    showError(action.failed, 'Su estado no cambió: vuelve a intentarlo.');
  }
};

const askStatusChange = (client: Client) => {
  const action = statusActionFor(client);
  confirm.require({
    header: `${action.verb} cliente`,
    message: action.message(client.name),
    acceptProps: { label: `${action.verb} cliente`, severity: action.severity },
    rejectProps: { label: 'Cancelar', severity: 'secondary', text: true },
    accept: () => void applyStatus(client, action),
  });
};
</script>

<template>
  <PageHeader
    title="Clientes"
    description="Quienes reciben fondos para comprar oro y saldan su deuda entregándolo en packing lists."
  >
    <template #actions>
      <Button label="Nuevo cliente" @click="openDialog(null)">
        <template #icon><UserPlus class="size-4 shrink-0" aria-hidden="true" /></template>
      </Button>
    </template>
  </PageHeader>

  <p v-if="isPending" class="py-12 text-center text-sm text-muted" role="status">
    Cargando clientes…
  </p>
  <Message v-else-if="isError" severity="error">
    No se pudieron cargar los clientes. Recarga la página para intentarlo de nuevo.
  </Message>
  <EmptyState
    v-else-if="allClients.length === 0"
    title="Todavía no hay clientes"
    description="Registra a quien recibe fondos para comprar oro; después podrás abrirle operaciones y recibir sus packing lists."
    :icon="Users"
  >
    <Button label="Registrar el primer cliente" @click="openDialog(null)" />
  </EmptyState>

  <section v-else aria-labelledby="clients-list-title" class="flex flex-col gap-4">
    <h2 id="clients-list-title" class="sr-only">Lista de clientes</h2>
    <MetricStrip :metrics="metrics" />
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex w-full max-w-sm flex-col gap-1.5">
        <label for="clients-search" class="text-sm font-medium text-heading">
          Buscar por nombre o documento
        </label>
        <div class="relative">
          <Search
            class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <InputText
            id="clients-search"
            v-model="search"
            type="search"
            name="q"
            autocomplete="off"
            spellcheck="false"
            placeholder="Nombre, cédula o RIF…"
            class="w-full pl-10!"
          />
        </div>
      </div>
      <p class="text-sm text-muted tabular-nums" aria-live="polite">
        {{ visibleClients.length }} de {{ allClients.length }} clientes
      </p>
    </div>

    <EmptyState
      v-if="visibleClients.length === 0"
      :title="`Ningún cliente coincide con “${search.trim()}”`"
      description="Revisa la escritura o busca por número de cédula o RIF."
      :icon="Search"
    >
      <Button label="Limpiar búsqueda" severity="secondary" outlined @click="search = ''" />
    </EmptyState>

    <div v-else class="overflow-x-auto rounded-2xl border border-border bg-surface-0">
      <DataTable
        :value="visibleClients"
        data-key="id"
        size="small"
        :row-class="(client: Client) => (client.active ? '' : 'bg-surface-50!')"
      >
        <template #header><span class="sr-only">Clientes registrados</span></template>
        <Column
          v-for="column in COLUMNS"
          :key="column.header"
          :header="column.header"
          :header-class="column.isNumeric ? '[&>div]:justify-end' : undefined"
          :body-class="column.isNumeric ? 'text-right tabular-nums' : undefined"
        >
          <template #body="{ data: client }">
            <Tag v-if="column.tag" :value="column.value(client)" :severity="column.tag(client)" />
            <span
              v-else-if="column.value(client)"
              class="block truncate"
              :class="column.cellClass?.(client) ?? 'max-w-48'"
              :title="column.value(client)"
            >
              {{ column.value(client) }}
            </span>
            <span v-else class="text-muted">Sin dato</span>
          </template>
        </Column>
        <Column header="Acciones" header-class="sr-only">
          <template #body="{ data: client }">
            <div class="flex justify-end gap-1">
              <Button
                text
                rounded
                size="small"
                :aria-label="`Editar ${client.name}`"
                :title="`Editar ${client.name}`"
                @click="openDialog(client)"
              >
                <template #icon><Pencil class="size-4 shrink-0" aria-hidden="true" /></template>
              </Button>
              <Button
                text
                size="small"
                rounded
                :severity="statusActionFor(client).severity"
                :aria-label="`${statusActionFor(client).verb} ${client.name}`"
                :title="`${statusActionFor(client).verb} ${client.name}`"
                @click="askStatusChange(client)"
              >
                <template #icon>
                  <component
                    :is="statusActionFor(client).icon"
                    class="size-4 shrink-0"
                    aria-hidden="true"
                  />
                </template>
              </Button>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </section>

  <ClientFormDialog
    v-model:visible="isDialogVisible"
    :client="editingClient"
    :is-saving="isSaving"
    @save="saveClient"
  />
</template>

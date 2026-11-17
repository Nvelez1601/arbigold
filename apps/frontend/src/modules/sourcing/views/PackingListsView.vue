<script setup lang="ts">
import { type PackingList, PACKING_LIST_STATUSES } from '@arbigold/shared-types';
import { ClipboardList, Plus, Users } from 'lucide-vue-next';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import { type LocationQueryValue, RouterLink, useRoute, useRouter } from 'vue-router';
import EmptyState from '../../../shared/components/EmptyState.vue';
import PageHeader from '../../../shared/components/PageHeader.vue';
import { useCollection } from '../../../shared/composables/useCollection.ts';
import {
  QUERY_KEYS,
  clientsRepository,
  packingListsRepository,
} from '../../../shared/data/repositories.ts';
import { formatDate, formatGrams } from '../../../shared/utils/format.ts';
import { STATUS_TAGS, pieceTotals } from '../composables/usePackingListEditor.ts';

const clients = useCollection(QUERY_KEYS.clients, clientsRepository);
const lists = useCollection(QUERY_KEYS.packingLists, packingListsRepository);
const route = useRoute();
const router = useRouter();

const STATUS_OPTIONS = PACKING_LIST_STATUSES.map((value) => ({
  value,
  label: STATUS_TAGS[value].label,
}));

/** Los filtros viven en la URL (?cliente=…&estado=…): se pueden compartir y sobreviven al recargar. */
const queryText = (value: LocationQueryValue | LocationQueryValue[] | undefined) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const filterBy = (key: 'cliente' | 'estado') =>
  computed({
    get: () => queryText(route.query[key]),
    set: (value: string | null) =>
      router.replace({ query: { ...route.query, [key]: value?.trim() || undefined } }),
  });
const clientFilter = filterBy('cliente');
const statusFilter = filterBy('estado');
const clearFilters = () => router.replace({ query: {} });

const isLoading = computed(() => clients.isPending.value || lists.isPending.value);
const hasError = computed(() => clients.isError.value || lists.isError.value);
const retry = () => {
  void clients.refetch();
  void lists.refetch();
};
const clientNames = computed(
  () => new Map((clients.data.value ?? []).map((client) => [client.id, client.name])),
);
const matches = (list: PackingList) =>
  (!clientFilter.value || list.clientId === clientFilter.value) &&
  (!statusFilter.value || list.status === statusFilter.value);

const rows = computed(() =>
  (lists.data.value ?? [])
    .filter(matches)
    .toSorted((a, b) => b.issuedOn.localeCompare(a.issuedOn))
    .map((list) => ({
      id: list.id,
      issuedOn: formatDate(list.issuedOn),
      client: clientNames.value.get(list.clientId) ?? 'Cliente sin registro',
      status: STATUS_TAGS[list.status],
      ...pieceTotals(list.pieces.map((piece) => ({ ...piece, key: '', number: '' }))),
    })),
);
const open = (id: string) => router.push(`/packing-lists/${id}`);
</script>

<template>
  <PageHeader title="Packing lists" description="Piezas que entrega cada cliente, en gramos.">
    <template #actions>
      <RouterLink v-slot="{ navigate, href }" to="/packing-lists/nuevo" custom>
        <Button as="a" :href="href" @click="navigate">
          <Plus class="size-4" aria-hidden="true" />
          Nuevo packing list
        </Button>
      </RouterLink>
    </template>
  </PageHeader>

  <p v-if="isLoading" class="text-muted">Cargando packing lists…</p>
  <EmptyState
    v-else-if="hasError"
    title="No se pudieron cargar los packing lists"
    description="Vuelve a intentarlo. Si el problema sigue, recarga la página."
    :icon="Users"
  >
    <Button label="Reintentar" severity="secondary" @click="retry" />
  </EmptyState>
  <EmptyState
    v-else-if="(clients.data.value ?? []).length === 0"
    title="Primero registra un cliente"
    description="Cada packing list es la entrega de un cliente. Registra al menos uno para empezar."
    :icon="Users"
  >
    <RouterLink to="/clientes" class="font-medium text-primary-600 underline">
      Ir a clientes
    </RouterLink>
  </EmptyState>
  <EmptyState
    v-else-if="(lists.data.value ?? []).length === 0"
    title="Todavía no hay packing lists"
    description="Crea el primero con las piezas que entregó un cliente: número, peso bruto y ley."
    :icon="ClipboardList"
  >
    <RouterLink to="/packing-lists/nuevo" class="font-medium text-primary-600 underline">
      Crear el primer packing list
    </RouterLink>
  </EmptyState>
  <template v-else>
    <div class="mb-4 flex flex-wrap items-end gap-3">
      <Select
        v-model="clientFilter"
        :options="clients.data.value ?? []"
        option-label="name"
        option-value="id"
        placeholder="Todos los clientes"
        aria-label="Filtrar por cliente"
        show-clear
        class="w-full sm:w-64"
      />
      <Select
        v-model="statusFilter"
        :options="STATUS_OPTIONS"
        option-label="label"
        option-value="value"
        placeholder="Todos los estados"
        aria-label="Filtrar por estado"
        show-clear
        class="w-full sm:w-52"
      />
    </div>

    <div class="overflow-x-auto rounded-lg border border-border bg-surface-0">
      <table class="w-full min-w-[44rem] text-sm">
        <caption class="sr-only">
          Packing lists
        </caption>
        <thead class="bg-surface-100 text-left text-muted">
          <tr>
            <th scope="col" class="px-4 py-2.5 font-medium">Fecha</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Cliente</th>
            <th scope="col" class="px-4 py-2.5 text-right font-medium">Piezas</th>
            <th scope="col" class="px-4 py-2.5 text-right font-medium">Peso bruto</th>
            <th scope="col" class="px-4 py-2.5 text-right font-medium">Peso fino</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200">
          <tr
            v-for="row in rows"
            :key="row.id"
            class="cursor-pointer transition-colors duration-150 hover:bg-primary-50"
            @click="open(row.id)"
          >
            <td class="px-4 py-2.5 whitespace-nowrap">
              <RouterLink
                :to="`/packing-lists/${row.id}`"
                class="font-medium text-primary-600 hover:underline"
                @click.stop
              >
                {{ row.issuedOn }}
              </RouterLink>
            </td>
            <td class="max-w-64 px-4 py-2.5 wrap-anywhere text-heading">{{ row.client }}</td>
            <td class="px-4 py-2.5 text-right tabular-nums">{{ row.count }}</td>
            <td class="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
              {{ formatGrams(row.gross) }}
            </td>
            <td
              class="px-4 py-2.5 text-right font-semibold whitespace-nowrap text-heading tabular-nums"
            >
              {{ formatGrams(row.fine) }}
            </td>
            <td class="px-4 py-2.5">
              <Tag :value="row.status.label" :severity="row.status.severity" />
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="rows.length === 0" class="px-4 py-8 text-center text-sm text-muted">
        <p>Ningún packing list coincide con los filtros.</p>
        <Button label="Quitar filtros" text class="mt-2" @click="clearFilters" />
      </div>
    </div>
  </template>
</template>

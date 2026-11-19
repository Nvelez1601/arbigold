<script setup lang="ts">
import type { Operation } from '@arbigold/shared-types';
import { ArrowUpRight, CheckCircle2, CircleAlert, Info } from 'lucide-vue-next';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import PageHeader from '../../shared/components/PageHeader.vue';
import { useCollection } from '../../shared/composables/useCollection.ts';
import {
  QUERY_KEYS,
  clientsRepository,
  exportsRepository,
  operationsRepository,
  packingListsRepository,
  suppliersRepository,
} from '../../shared/data/repositories.ts';
import { formatDate, formatGrams } from '../../shared/utils/format.ts';
import PanelChart from './panel/PanelChart.vue';
import PanelFlow from './panel/PanelFlow.vue';
import { type AlertTone, buildPanelSummary } from './panel/usePanelSummary.ts';

const clients = useCollection(QUERY_KEYS.clients, clientsRepository);
const suppliers = useCollection(QUERY_KEYS.suppliers, suppliersRepository);
const operations = useCollection(QUERY_KEYS.operations, operationsRepository);
const packingLists = useCollection(QUERY_KEYS.packingLists, packingListsRepository);
const exportsQuery = useCollection(QUERY_KEYS.exports, exportsRepository);
const queries = [clients, suppliers, operations, packingLists, exportsQuery];

const isLoading = computed(() => queries.some((query) => query.isPending.value));
const hasError = computed(() => queries.some((query) => query.isError.value));
const retry = () => queries.forEach((query) => void query.refetch());

const summary = computed(() =>
  buildPanelSummary({
    clients: clients.data.value ?? [],
    suppliers: suppliers.data.value ?? [],
    operations: operations.data.value ?? [],
    packingLists: packingLists.data.value ?? [],
    exports: exportsQuery.data.value ?? [],
  }),
);

const kpis = computed(() => {
  const data = summary.value;
  return [
    {
      label: 'Oro por entregar',
      value: formatGrams(data.clientGrams),
      detail: `${data.openOperations} operaciones abiertas`,
      hero: true,
    },
    {
      label: 'Margen abierto',
      value: formatGrams(data.margin),
      detail: `Fondeo del proveedor: ${formatGrams(data.supplierGrams)}`,
      hero: false,
    },
    {
      label: 'Packing lists por recibir',
      value: String(data.packingLists),
      detail: `${formatGrams(data.packingFine)} de oro fino`,
      hero: false,
    },
    {
      label: 'Exportaciones activas',
      value: String(data.activeExports),
      detail: 'En preparación o en tránsito',
      hero: false,
    },
  ];
});

const ALERT_STYLES: Record<AlertTone, { box: string; icon: typeof CircleAlert }> = {
  warning: { box: 'bg-warning/8 text-warning', icon: CircleAlert },
  danger: { box: 'bg-danger/8 text-danger', icon: CircleAlert },
  info: { box: 'bg-primary-50 text-primary-700', icon: Info },
};

const STATUS_TAG: Record<Operation['status'], { label: string; severity: string }> = {
  ABIERTA: { label: 'Abierta', severity: 'warn' },
  CUMPLIDA: { label: 'Cumplida', severity: 'success' },
  CANCELADA: { label: 'Cancelada', severity: 'danger' },
};
</script>

<template>
  <PageHeader
    title="Panel"
    description="El pulso de la operación: oro comprometido, margen abierto y lo que necesita atención hoy."
  />

  <p v-if="isLoading" role="status" class="py-12 text-center text-sm text-muted">
    Cargando el panel…
  </p>
  <p v-else-if="hasError" class="py-12 text-center text-sm text-danger">
    No se pudo cargar el resumen.
    <button class="font-semibold underline" @click="retry">Reintentar</button>
  </p>
  <template v-else>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="kpi in kpis"
        :key="kpi.label"
        class="rounded-2xl border p-5"
        :class="
          kpi.hero
            ? 'border-transparent bg-brand-gradient text-white shadow-lg shadow-primary-600/20'
            : 'border-border bg-surface-0'
        "
      >
        <p
          class="text-xs font-semibold tracking-[0.08em] uppercase"
          :class="kpi.hero ? 'text-white/80' : 'text-muted'"
        >
          {{ kpi.label }}
        </p>
        <p class="font-display mt-2 text-3xl font-semibold tracking-tight tabular-nums">
          {{ kpi.value }}
        </p>
        <p class="mt-1 text-xs" :class="kpi.hero ? 'text-white/75' : 'text-muted'">
          {{ kpi.detail }}
        </p>
      </article>
    </div>

    <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section
        class="rounded-2xl border border-border bg-surface-0 p-5"
        aria-labelledby="panel-chart"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="panel-chart" class="text-sm font-semibold">Últimas operaciones, en gramos</h2>
          <div class="flex gap-4 text-xs text-muted">
            <span class="flex items-center gap-1.5">
              <span class="size-2.5 rounded-sm bg-primary-600" aria-hidden="true" />Cliente
            </span>
            <span class="flex items-center gap-1.5">
              <span class="size-2.5 rounded-sm bg-brand-orchid" aria-hidden="true" />Proveedor
            </span>
          </div>
        </div>
        <PanelChart :points="summary.chart" />
      </section>

      <section
        class="rounded-2xl border border-border bg-surface-0 p-5"
        aria-labelledby="panel-alerts"
      >
        <h2 id="panel-alerts" class="mb-4 text-sm font-semibold">Requiere atención</h2>
        <div v-if="summary.alerts.length === 0" class="flex items-start gap-2.5 text-sm">
          <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p class="font-semibold text-heading">Todo en orden</p>
            <p class="text-muted">No hay pendientes en las cinco colecciones.</p>
          </div>
        </div>
        <ul v-else class="flex flex-col gap-3">
          <li
            v-for="alert in summary.alerts"
            :key="alert.title"
            class="flex items-start gap-2.5 rounded-xl p-3"
            :class="ALERT_STYLES[alert.tone].box"
          >
            <component
              :is="ALERT_STYLES[alert.tone].icon"
              class="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p class="text-sm font-semibold">{{ alert.title }}</p>
              <p class="mt-0.5 text-xs opacity-80">{{ alert.detail }}</p>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <section
      class="mt-4 rounded-2xl border border-border bg-surface-0 p-5"
      aria-labelledby="panel-movements"
    >
      <div class="mb-3 flex items-center justify-between gap-2">
        <h2 id="panel-movements" class="text-sm font-semibold">Últimos movimientos</h2>
        <RouterLink
          to="/operaciones"
          class="flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800"
        >
          Ver operaciones <ArrowUpRight class="size-3.5" aria-hidden="true" />
        </RouterLink>
      </div>
      <p v-if="summary.movements.length === 0" class="py-6 text-center text-sm text-muted">
        Aún no hay operaciones registradas.
      </p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm tabular-nums">
          <thead>
            <tr
              class="border-b border-border text-left text-[11px] tracking-[0.07em] text-muted uppercase"
            >
              <th class="py-2 pr-4 font-semibold">Fecha</th>
              <th class="py-2 pr-4 font-semibold">Cliente</th>
              <th class="py-2 pr-4 font-semibold">Proveedor</th>
              <th class="py-2 pr-4 text-right font-semibold">Gramos</th>
              <th class="py-2 pr-4 text-right font-semibold">Margen</th>
              <th class="py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="movement in summary.movements"
              :key="movement.id"
              class="border-b border-border/60 last:border-0"
            >
              <td class="py-2.5 pr-4 text-muted">{{ formatDate(movement.date) }}</td>
              <td class="py-2.5 pr-4 font-medium text-heading">{{ movement.client }}</td>
              <td class="py-2.5 pr-4 text-muted">{{ movement.supplier }}</td>
              <td class="py-2.5 pr-4 text-right">{{ formatGrams(movement.grams) }}</td>
              <td class="py-2.5 pr-4 text-right">{{ formatGrams(movement.margin) }}</td>
              <td class="py-2.5">
                <Tag
                  :value="STATUS_TAG[movement.status].label"
                  :severity="STATUS_TAG[movement.status].severity"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <PanelFlow :has-activity="summary.hasActivity" />
  </template>
</template>

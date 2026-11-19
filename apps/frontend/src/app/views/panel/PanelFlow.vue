<script setup lang="ts">
import { NAV_ITEMS } from '../../navigation.ts';

defineProps<{ hasActivity: boolean }>();

const steps = NAV_ITEMS.filter((item) => item.to !== '/');
</script>

<template>
  <section v-if="!hasActivity" class="mt-4 rounded-2xl border border-border bg-surface-0 p-6">
    <h2 class="font-display text-lg font-semibold">Empieza por aquí</h2>
    <p class="mt-1 max-w-prose text-sm text-muted">
      Registra un proveedor de fondeo y un cliente; con ambos activos ya puedes abrir la primera
      operación.
    </p>
    <div class="mt-4 flex flex-wrap gap-2">
      <RouterLink
        to="/proveedores"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Registrar proveedor
      </RouterLink>
      <RouterLink
        to="/clientes"
        class="rounded-lg border border-border bg-surface-0 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-surface-100"
      >
        Registrar cliente
      </RouterLink>
    </div>
  </section>

  <!-- El flujo completo, siempre visible: es el mapa del negocio. -->
  <section class="mt-8" aria-labelledby="panel-flow">
    <div class="mb-3 flex items-baseline justify-between gap-3">
      <h2 id="panel-flow" class="text-sm font-semibold">Flujo de la operación</h2>
      <p class="text-xs text-muted">Proveedor → cliente → operación → packing list → exportación</p>
    </div>
    <ol
      class="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-5"
    >
      <li v-for="(step, index) in steps" :key="step.to" class="bg-surface-0">
        <RouterLink
          :to="step.to"
          class="group flex h-full flex-col gap-2 p-4 transition-colors duration-150 hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none focus-visible:ring-inset"
        >
          <span class="flex items-center gap-2 text-xs text-muted">
            <span class="tabular-nums">{{ index + 1 }}</span>
            <component :is="step.icon" class="size-3.5 text-primary-600" aria-hidden="true" />
          </span>
          <span class="text-sm font-semibold text-heading group-hover:text-primary-700">
            {{ step.label }}
          </span>
          <span class="text-xs text-pretty text-muted">{{ step.description }}</span>
        </RouterLink>
      </li>
    </ol>
  </section>
</template>

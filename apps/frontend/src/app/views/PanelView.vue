<script setup lang="ts">
import PageHeader from '../../shared/components/PageHeader.vue';
import { NAV_ITEMS } from '../navigation.ts';

/** El flujo de la operación es una secuencia real: por eso va numerado. */
const steps = NAV_ITEMS.filter((item) => item.to !== '/');
</script>

<template>
  <PageHeader
    title="Panel"
    description="El oro recorre cinco pasos: alguien adelanta los fondos, un cliente compra, entrega sus piezas y el material sale al proveedor."
  />
  <ol class="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
    <li v-for="(step, index) in steps" :key="step.to" class="bg-surface-0">
      <RouterLink
        :to="step.to"
        class="group flex h-full flex-col gap-3 p-5 transition-colors duration-150 hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none focus-visible:ring-inset"
      >
        <span class="flex items-center gap-2 text-sm text-muted">
          <span class="tabular-nums">{{ index + 1 }}</span>
          <component :is="step.icon" class="size-4 text-primary-600" aria-hidden="true" />
        </span>
        <span class="font-semibold text-heading group-hover:text-primary-700">{{
          step.label
        }}</span>
        <span class="text-sm text-pretty text-muted">{{ step.description }}</span>
      </RouterLink>
    </li>
  </ol>
</template>

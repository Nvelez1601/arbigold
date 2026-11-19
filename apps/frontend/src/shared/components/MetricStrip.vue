<script setup lang="ts">
import type { Metric } from './metric.ts';

defineProps<{ metrics: readonly Metric[] }>();
</script>

<template>
  <dl class="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <div
      v-for="metric in metrics"
      :key="metric.label"
      class="rounded-2xl border p-4"
      :class="
        metric.hero
          ? 'border-transparent bg-brand-gradient text-white shadow-lg shadow-primary-600/20'
          : 'border-border bg-surface-0'
      "
    >
      <dt
        class="flex items-center gap-2 text-[11px] font-semibold tracking-[0.09em] uppercase"
        :class="metric.hero ? 'text-white/80' : 'text-muted'"
      >
        <component :is="metric.icon" class="size-4" aria-hidden="true" />
        {{ metric.label }}
      </dt>
      <dd class="font-display mt-2 text-2xl leading-none font-semibold tracking-tight tabular-nums">
        {{ metric.value }}
      </dd>
      <dd class="mt-1.5 text-xs" :class="metric.hero ? 'text-white/75' : 'text-muted'">
        {{ metric.detail }}
      </dd>
    </div>
  </dl>
</template>

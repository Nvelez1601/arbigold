<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{ title: string; description: string; icon?: Component }>();
</script>

<template>
  <section
    class="relative overflow-hidden rounded-2xl border border-border bg-surface-0 px-6 py-14 text-center"
  >
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-28 bg-brand-gradient opacity-[0.05]"
      aria-hidden="true"
    />
    <div
      v-if="icon"
      class="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary-50 text-primary-600"
    >
      <component :is="icon" class="size-6" aria-hidden="true" />
    </div>
    <h2 class="font-display text-lg font-semibold text-heading">{{ title }}</h2>
    <p class="mx-auto mt-1.5 max-w-md text-sm text-pretty text-muted">{{ description }}</p>
    <div v-if="$slots.default" class="mt-6 flex justify-center">
      <slot />
    </div>
  </section>
</template>

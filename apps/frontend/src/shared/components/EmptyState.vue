<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{ title: string; description: string; icon?: Component }>();
</script>

<template>
  <section
    class="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface-0 px-6 py-12 text-center"
  >
    <component :is="icon" v-if="icon" class="mb-3 size-8 text-primary-500" aria-hidden="true" />
    <h2 class="text-lg font-semibold text-heading">{{ title }}</h2>
    <p class="mt-1 max-w-md text-sm text-pretty text-muted">{{ description }}</p>
    <div v-if="$slots.default" class="mt-5">
      <slot />
    </div>
  </section>
</template>

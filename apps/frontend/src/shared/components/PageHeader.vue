<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <h1
        class="font-display text-[26px] leading-tight font-semibold tracking-tight text-balance text-heading"
      >
        {{ title }}
      </h1>
      <p v-if="description" class="mt-1 max-w-prose text-sm text-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>

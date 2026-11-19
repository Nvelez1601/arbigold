<script setup lang="ts">
import Select from 'primevue/select';
import { EXPORT_STATUS_FILTER_OPTIONS } from '../composables/useExportForm.ts';

defineProps<{ status: string; available: boolean }>();
defineEmits<{ 'update:status': [value: string | null] }>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <label id="export-status-filter-label" for="export-status-filter" class="text-sm text-muted">
      Estado
    </label>
    <Select
      input-id="export-status-filter"
      aria-labelledby="export-status-filter-label"
      :model-value="status"
      :options="EXPORT_STATUS_FILTER_OPTIONS"
      option-label="label"
      option-value="value"
      placeholder="Todos los estados"
      class="w-60"
      @update:model-value="$emit('update:status', $event)"
    />
    <p v-if="!available" class="text-sm text-muted" data-test="no-available">
      No quedan packing lists recibidos sin exportar.
      <RouterLink to="/packing-lists" class="text-primary-600 underline">
        Marca más como recibidos
      </RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { formatDate, formatGrams } from '../../../shared/utils/format.ts';
import type { PackingListOption } from '../composables/useExportForm.ts';

/** Una opción de packing list dentro del formulario de exportación. */
const props = defineProps<{ list: PackingListOption; selected: boolean; disabled?: boolean }>();
const emit = defineEmits<{ 'update:selected': [value: boolean] }>();

const toggle = (event: Event) =>
  emit('update:selected', (event.target as HTMLInputElement).checked);
</script>

<template>
  <label
    :for="`export-packing-list-${list.id}`"
    class="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-surface-100"
  >
    <input
      :id="`export-packing-list-${list.id}`"
      type="checkbox"
      name="packingListIds"
      :value="list.id"
      :checked="selected"
      :disabled="props.disabled"
      class="size-4 accent-primary-600"
      @change="toggle"
    />
    <span class="min-w-0 flex-1 truncate font-medium text-heading" :title="list.clientName">
      {{ list.clientName }}
    </span>
    <span class="text-muted">{{ formatDate(list.issuedOn) }}</span>
    <span class="w-20 text-right text-muted tabular-nums">{{ list.pieceCount }} piezas</span>
    <span class="w-28 text-right text-text tabular-nums">{{
      formatGrams(list.fine.toString())
    }}</span>
  </label>
</template>

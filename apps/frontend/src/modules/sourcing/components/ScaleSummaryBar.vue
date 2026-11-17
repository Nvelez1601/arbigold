<script setup lang="ts">
import { computed } from 'vue';
import { formatGrams } from '../../../shared/utils/format.ts';

/** Totales SOLO de piezas, como texto decimal (vista previa: el backend recalcula). */
const props = defineProps<{ count: number; gross: string; fine: string }>();

const readings = computed(() => [
  { label: 'Piezas', value: String(props.count), unit: '' },
  { label: 'Peso bruto', value: formatGrams(props.gross).slice(0, -2), unit: 'g' },
  { label: 'Peso fino', value: formatGrams(props.fine).slice(0, -2), unit: 'g' },
]);
</script>

<template>
  <section
    aria-label="Balanza del packing list"
    class="sticky bottom-0 z-10 mt-8 rounded-t-lg bg-primary-900 text-white shadow-[0_-8px_24px_-12px_rgb(33_41_92/0.45)]"
  >
    <div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-5 py-4 sm:px-6">
      <dl aria-live="polite" class="flex flex-wrap items-end">
        <div
          v-for="reading in readings"
          :key="reading.label"
          class="border-primary-700 pr-6 not-first:border-l not-first:pl-6 sm:pr-8 sm:not-first:pl-8"
        >
          <dt class="text-sm text-primary-200">{{ reading.label }}</dt>
          <dd class="text-2xl leading-tight font-semibold tabular-nums sm:text-3xl">
            {{ reading.value
            }}<span v-if="reading.unit" class="ml-1 text-base font-normal text-primary-200">{{
              reading.unit
            }}</span>
          </dd>
        </div>
      </dl>
      <div class="flex flex-col items-end gap-2">
        <div v-if="$slots.default" class="flex flex-wrap justify-end gap-2">
          <slot />
        </div>
        <p class="text-xs text-primary-200">
          Vista previa: el sistema recalcula al guardar. La viruta y la fundición no suman.
        </p>
      </div>
    </div>
  </section>
</template>

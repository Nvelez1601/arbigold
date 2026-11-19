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
    class="sticky bottom-0 z-10 mt-8 rounded-t-2xl bg-brand-gradient text-white shadow-[0_-10px_30px_-14px_rgb(109_63_209/0.55)]"
  >
    <div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-5 py-4 sm:px-6">
      <dl aria-live="polite" class="flex flex-wrap items-end">
        <div
          v-for="reading in readings"
          :key="reading.label"
          class="border-white/25 pr-6 not-first:border-l not-first:pl-6 sm:pr-8 sm:not-first:pl-8"
        >
          <dt class="text-xs font-medium tracking-wide text-white/75 uppercase">
            {{ reading.label }}
          </dt>
          <dd
            class="font-display mt-1 text-2xl leading-tight font-semibold tabular-nums sm:text-3xl"
          >
            {{ reading.value
            }}<span v-if="reading.unit" class="ml-1 text-base font-normal text-white/75">{{
              reading.unit
            }}</span>
          </dd>
        </div>
      </dl>
      <div class="flex flex-col items-end gap-2">
        <div v-if="$slots.default" class="flex flex-wrap justify-end gap-2">
          <slot />
        </div>
        <p class="text-xs text-white/75">
          Vista previa: el sistema recalcula al guardar. La viruta y la fundición no suman.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Decimal } from 'decimal.js';
import { computed } from 'vue';
import { formatGrams, formatMoney } from '../../../shared/utils/format.ts';
import {
  type ClosureInputs,
  type MarginTone,
  closurePreview,
  listMissing,
  marginTextClass,
  marginTone,
} from '../composables/useOperationForm.ts';

const props = defineProps<{ inputs: ClosureInputs }>();

const figures = computed(() => closurePreview(props.inputs));
const PLACEHOLDER = '—';
const grams = (value: Decimal | null) => (value ? formatGrams(value.toString()) : PLACEHOLDER);
const perGram = (value: Decimal | null) =>
  value ? formatMoney(value.toString(), 'USD/g') : PLACEHOLDER;

const MARGIN_EXPLANATION: Record<MarginTone, string> = {
  gain: 'Ganancia: el cliente paga más gramos de los que se le entregan al proveedor.',
  loss: 'Pérdida: el % del cliente es mayor que el del proveedor, así que se le deben al proveedor más gramos de los que paga el cliente. Revisa los porcentajes.',
  even: 'Sin margen: el cliente y el proveedor cierran al mismo %.',
};
const margin = computed(() => {
  const value = figures.value.margin;
  return value ? { value: grams(value), explanation: MARGIN_EXPLANATION[marginTone(value)] } : null;
});
const rows = computed(() => [
  {
    term: 'Precio por gramo',
    value: perGram(figures.value.pricePerGram),
    detail: 'P. INT ÷ 31,1035 g por onza troy',
  },
  {
    term: 'El cliente debe',
    value: grams(figures.value.clientGrams),
    detail: `a ${perGram(figures.value.clientPricePerGram)} con su %`,
  },
  {
    term: 'Se le deben al proveedor',
    value: grams(figures.value.supplierGrams),
    detail: `a ${perGram(figures.value.supplierPricePerGram)} con su %`,
  },
]);
</script>

<template>
  <section
    aria-labelledby="closure-preview-title"
    class="rounded-lg border border-border bg-surface-50 p-4"
    data-testid="closure-preview"
  >
    <h3 id="closure-preview-title" class="text-sm font-semibold text-heading">
      Vista previa del cierre
    </h3>
    <p class="mt-0.5 text-xs text-muted">Referencial: el sistema recalcula al guardar.</p>
    <div aria-live="polite" class="mt-3">
      <dl class="divide-y divide-border">
        <div
          v-for="row in rows"
          :key="row.term"
          class="flex items-baseline justify-between gap-4 py-2"
        >
          <dt class="min-w-0">
            <span class="text-sm text-text">{{ row.term }}</span>
            <span class="block text-xs text-muted tabular-nums">{{ row.detail }}</span>
          </dt>
          <dd class="text-right text-base font-medium text-heading tabular-nums">
            {{ row.value }}
          </dd>
        </div>
      </dl>
      <div class="mt-2 border-t-2 border-border-strong pt-3" data-testid="closure-margin">
        <div class="flex items-baseline justify-between gap-4">
          <span class="text-sm font-semibold text-heading">Margen en gramos</span>
          <strong
            class="text-right text-2xl font-semibold tabular-nums"
            :class="marginTextClass(figures.margin)"
          >
            {{ margin?.value ?? PLACEHOLDER }}
          </strong>
        </div>
        <p v-if="margin" class="mt-1 text-xs text-pretty text-muted">{{ margin.explanation }}</p>
      </div>
      <p
        v-if="figures.missing.length"
        class="mt-3 text-xs text-pretty text-muted"
        data-testid="closure-missing"
      >
        Para completar el cálculo falta {{ listMissing(figures.missing) }}.
      </p>
    </div>
  </section>
</template>

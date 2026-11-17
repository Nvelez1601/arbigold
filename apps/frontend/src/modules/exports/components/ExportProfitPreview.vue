<script setup lang="ts">
import { Decimal } from 'decimal.js';
import { computed } from 'vue';
import { formatGrams, formatPercent } from '../../../shared/utils/format.ts';
import { previewExportProfit } from '../composables/useExportForm.ts';

/** Lectura en vivo de la utilidad: el fino y el % llegan como texto decimal, nunca como number. */
const props = defineProps<{ fine: string; percentage?: string }>();

/** Intl solo entiende punto decimal: la coma del usuario se convierte y se ignora si no es válido. */
const parseNumber = (value: string | undefined): number | null => {
  if (!value?.trim()) return 0;
  const normalized = value.replace(',', '.').trim();
  return /^\d+(\.\d+)?$/.test(normalized) ? Number.parseFloat(normalized) : null;
};

const fineNumber = computed(() => parseNumber(props.fine) ?? 0);
const percentageNumber = computed(() => parseNumber(props.percentage));

const preview = computed(() =>
  previewExportProfit(new Decimal(fineNumber.value), String(percentageNumber.value)),
);
const isLoss = computed(() => preview.value?.netProfit.isNegative() ?? false);
const grams = (value: Decimal) => formatGrams(value.toString());
const deduction = (value: Decimal) => `− ${grams(value)}`;
</script>

<template>
  <section
    aria-live="polite"
    aria-label="Utilidad estimada"
    class="rounded-md border border-border bg-surface-50 px-4 py-3 text-sm"
  >
    <dl class="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 tabular-nums">
      <dt class="text-muted">Peso fino seleccionado</dt>
      <dd class="text-right font-medium text-heading" data-test="fine">
        {{ formatGrams(String(fineNumber)) }}
      </dd>
      <template v-if="preview">
        <dt class="text-muted">
          Utilidad bruta ({{
            percentageNumber !== null ? `${formatPercent(String(percentageNumber))}` : ''
          }})
        </dt>
        <dd class="text-right text-text" data-test="gross">{{ grams(preview.grossProfit) }}</dd>
        <dt class="text-muted">CVM (1 %)</dt>
        <dd class="text-right text-text" data-test="cvm">{{ deduction(preview.cvm) }}</dd>
        <dt class="text-muted">Exportación (0,3 %)</dt>
        <dd class="text-right text-text" data-test="export-duty">
          {{ deduction(preview.exportDuty) }}
        </dd>
        <dt class="border-t border-border-strong pt-1.5 font-semibold text-heading">
          Utilidad neta estimada
        </dt>
        <dd
          class="border-t border-border-strong pt-1.5 text-right font-semibold"
          :class="isLoss ? 'text-danger' : 'text-success'"
          data-test="net"
        >
          {{ grams(preview.netProfit) }}
          <span class="ml-1 font-normal"
            >({{ formatPercent(preview.netPercentage.toString()) }})</span
          >
        </dd>
      </template>
    </dl>
    <p v-if="!preview" class="mt-2 text-muted">
      Escribe el % de utilidad negociado para ver la utilidad neta.
    </p>
    <p v-else-if="isLoss" class="mt-2 text-pretty text-danger" data-test="loss-explanation">
      El % negociado no cubre las deducciones de 1,3 % (CVM y exportación) que paga la empresa: esta
      exportación deja pérdida.
    </p>
    <p class="mt-2 text-xs text-muted">Vista previa: el sistema recalcula al guardar.</p>
  </section>
</template>

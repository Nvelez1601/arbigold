<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import Button from 'primevue/button';
import { formatGrams, formatPerMille } from '../../../shared/utils/format.ts';
import { toPerMille } from '../../../shared/utils/gold.ts';
import {
  RESIDUE_LABELS,
  type ResidueRow,
  describePieces,
} from '../composables/usePackingListEditor.ts';

defineProps<{
  residues: readonly ResidueRow[];
  readonly: boolean;
  orphanResidues: readonly ResidueRow[];
}>();
defineEmits<{ remove: [key: string] }>();

const perMilleText = (fineness: string) => formatPerMille(toPerMille(fineness)?.toString() ?? '0');
</script>

<template>
  <ul
    v-if="residues.length > 0"
    class="divide-y divide-surface-200 rounded-xl border border-border bg-surface-50"
  >
    <li
      v-for="residue in residues"
      :key="residue.key"
      class="flex items-start justify-between gap-4 px-4 py-3"
    >
      <div class="min-w-0">
        <p class="font-medium text-heading">
          {{ RESIDUE_LABELS[residue.kind] }} de {{ describePieces(residue.fromPieces) }}
        </p>
        <p v-if="residue.note" class="text-sm wrap-anywhere text-muted">{{ residue.note }}</p>
        <p v-if="orphanResidues.includes(residue)" class="text-xs text-danger">
          Alguna pieza de origen ya no existe: quita este registro y vuelve a cargarlo.
        </p>
      </div>
      <div class="ml-auto text-right whitespace-nowrap tabular-nums">
        <p class="text-heading">{{ formatGrams(residue.grossWeight) }}</p>
        <p v-if="residue.fineness" class="text-sm text-muted">
          {{ perMilleText(residue.fineness) }}
        </p>
      </div>
      <Button
        v-if="!readonly"
        text
        rounded
        severity="secondary"
        :aria-label="`Quitar ${RESIDUE_LABELS[residue.kind].toLowerCase()} de ${describePieces(residue.fromPieces)}`"
        @click="$emit('remove', residue.key)"
      >
        <Trash2 class="size-4" aria-hidden="true" />
      </Button>
    </li>
  </ul>
  <p v-else class="text-sm text-muted">Sin viruta ni fundición registradas.</p>
  <p class="mt-2 text-sm text-muted">
    No suman al conteo ni a los totales: salen de las mismas piezas.
  </p>
</template>

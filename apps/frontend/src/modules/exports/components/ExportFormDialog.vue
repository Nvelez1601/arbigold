<script setup lang="ts">
import type { ExportInput, Supplier } from '@arbigold/shared-types';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { computed, nextTick } from 'vue';
import { focusFirstError } from '../../../shared/utils/focusField.ts';
import { sumDecimals } from '../../../shared/utils/gold.ts';
import {
  type ExportFormField,
  type PackingListOption,
  type SettlementMode,
  useExportForm,
} from '../composables/useExportForm.ts';
import ExportProfitPreview from './ExportProfitPreview.vue';
import PackingListOptionRow from './PackingListOptionRow.vue';

const props = defineProps<{
  suppliers: Supplier[];
  packingLists: readonly PackingListOption[];
  saving?: boolean;
}>();
const emit = defineEmits<{ submit: [input: ExportInput] }>();
const visible = defineModel<boolean>('visible', { required: true });

const SETTLEMENT_MODE_LABELS: Record<SettlementMode, string> = {
  UTILIDAD: 'Utilidad',
  COBRO_TOTAL: 'Cobro total',
};

const today = new Date().toLocaleDateString('en-CA');
const { form, errors, isDirty, isThirdParty, selectSupplier, validate, firstError } = useExportForm(
  { today, suppliers: () => props.suppliers },
);
const isCobroTotal = computed(() => isThirdParty.value && form.settlementMode === 'COBRO_TOTAL');

const selectedFine = computed(() =>
  sumDecimals(
    props.packingLists
      .filter((list) => form.packingListIds.includes(list.id))
      .map((list) => list.fine),
  ).toString(),
);

const toggleList = (listId: string, selected: boolean) => {
  const ids = form.packingListIds.filter((id) => id !== listId);
  form.packingListIds = selected ? [...ids, listId] : ids;
};

const fieldIds = computed<Record<ExportFormField, string>>(() => ({
  supplierId: 'export-supplier',
  shippedOn: 'export-shipped-on',
  destination: 'export-destination',
  packingListIds: `export-packing-list-${props.packingLists[0]?.id ?? ''}`,
  grossProfitPercentage: 'export-percentage',
  settlementMode: `export-settlement-${form.settlementMode ?? 'UTILIDAD'}`,
  notes: 'export-notes',
}));

const focusField = (field?: ExportFormField | null) =>
  focusFirstError(fieldIds.value, field as string | null | undefined);

const submit = async () => {
  if (props.saving) return;
  const input = validate();
  if (input) {
    emit('submit', input);
    return;
  }
  await nextTick();
  focusField(firstError.value);
};

const confirm = useConfirm();
/** Cerrar (Esc, X o Cancelar) con datos capturados pide confirmación para no perderlos. */
const requestClose = (isOpen: boolean) => {
  if (isOpen || !isDirty.value) {
    visible.value = isOpen;
    return;
  }
  confirm.require({
    header: 'Descartar la exportación',
    message: 'Tienes datos sin registrar. Si cierras, se pierden.',
    acceptProps: { label: 'Descartar y cerrar', severity: 'danger' },
    rejectProps: { label: 'Seguir editando', severity: 'secondary', text: true },
    accept: () => (visible.value = false),
  });
};

const fieldClass = 'flex flex-col gap-1.5';
const labelClass = 'text-sm font-medium text-heading';
const errorClass = 'text-sm text-danger';
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Nueva exportación"
    class="w-[min(52rem,calc(100vw-2rem))]"
    :draggable="false"
    :closable="!saving"
    @update:visible="requestClose"
  >
    <form novalidate class="flex flex-col gap-5" @submit.prevent="submit">
      <div class="grid gap-4 sm:grid-cols-3">
        <div :class="fieldClass">
          <label id="export-supplier-label" for="export-supplier" :class="labelClass">
            Proveedor
          </label>
          <Select
            :model-value="form.supplierId"
            input-id="export-supplier"
            aria-labelledby="export-supplier-label"
            :options="suppliers"
            option-label="name"
            option-value="id"
            placeholder="Elige un proveedor…"
            :invalid="!!errors.supplierId"
            :aria-describedby="errors.supplierId ? 'export-supplier-error' : undefined"
            :name="form.supplierId ? 'supplierId' : ''"
            :disabled="props.saving"
            @update:model-value="selectSupplier"
          />
          <p v-if="errors.supplierId" id="export-supplier-error" :class="errorClass">
            {{ errors.supplierId }}
          </p>
        </div>
        <div :class="fieldClass">
          <label for="export-shipped-on" :class="labelClass">Fecha</label>
          <InputText
            id="export-shipped-on"
            v-model="form.shippedOn"
            name="shippedOn"
            type="date"
            autocomplete="off"
            :invalid="!!errors.shippedOn"
            :disabled="props.saving"
          />
          <p v-if="errors.shippedOn" :class="errorClass">{{ errors.shippedOn }}</p>
        </div>
        <div :class="fieldClass">
          <label for="export-destination" :class="labelClass">Destino</label>
          <InputText
            id="export-destination"
            v-model="form.destination"
            name="destination"
            autocomplete="off"
            placeholder="p. ej. Refinería en Dubái…"
            :invalid="!!errors.destination"
            :disabled="props.saving"
          />
          <p v-if="errors.destination" :class="errorClass">{{ errors.destination }}</p>
        </div>
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend :class="labelClass">Packing lists recibidos</legend>
        <p class="text-sm text-muted">
          Cada packing list viaja completo. Solo aparecen los recibidos que aún no van en otra
          exportación.
        </p>
        <p v-if="!packingLists.length" class="text-sm text-warning" data-test="no-packing-lists">
          No hay packing lists recibidos disponibles. Márcalos como recibidos en
          <RouterLink to="/packing-lists" class="text-primary-600 underline"
            >Packing lists</RouterLink
          >.
        </p>
        <ul v-else class="divide-y divide-border rounded-md border border-border">
          <li v-for="list in packingLists" :key="list.id">
            <PackingListOptionRow
              :list="list"
              :selected="form.packingListIds.includes(list.id)"
              :disabled="props.saving"
              @update:selected="toggleList(list.id, $event)"
            />
          </li>
        </ul>
        <p v-if="errors.packingListIds" :class="errorClass">{{ errors.packingListIds }}</p>
      </fieldset>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-4">
          <div v-if="!isCobroTotal" :class="fieldClass">
            <label for="export-percentage" :class="labelClass">% de utilidad negociado</label>
            <InputText
              id="export-percentage"
              v-model="form.grossProfitPercentage"
              name="grossProfitPercentage"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              placeholder="p. ej. 2…"
              :invalid="!!errors.grossProfitPercentage"
              :disabled="props.saving"
            />
            <p v-if="errors.grossProfitPercentage" :class="errorClass">
              {{ errors.grossProfitPercentage }}
            </p>
          </div>
          <fieldset v-if="isThirdParty" class="flex flex-col gap-2" data-test="settlement-mode">
            <legend :class="labelClass">Modo de liquidación</legend>
            <label
              v-for="(label, mode) in SETTLEMENT_MODE_LABELS"
              :key="mode"
              :for="`export-settlement-${mode}`"
              class="flex cursor-pointer items-center gap-2 text-sm text-text"
            >
              <input
                :id="`export-settlement-${mode}`"
                v-model="form.settlementMode"
                type="radio"
                name="settlementMode"
                :value="mode"
                class="size-4 accent-primary-600"
                :disabled="props.saving"
              />
              {{ label }}
            </label>
            <p class="text-xs text-muted">
              Cobro total se liquida en dinero; los costos se cargan después.
            </p>
          </fieldset>
        </div>
        <ExportProfitPreview
          v-if="!isCobroTotal"
          :fine="selectedFine"
          :percentage="form.grossProfitPercentage"
        />
      </div>

      <div :class="fieldClass">
        <label for="export-notes" :class="labelClass">Notas</label>
        <Textarea
          id="export-notes"
          v-model="form.notes"
          name="notes"
          :disabled="props.saving"
          rows="2"
        />
        <p v-if="errors.notes" :class="errorClass">{{ errors.notes }}</p>
      </div>

      <div class="flex justify-end gap-2">
        <Button
          type="button"
          label="Cancelar"
          severity="secondary"
          text
          :disabled="props.saving"
          @click="requestClose(false)"
        />
        <Button
          type="submit"
          :label="saving ? 'Guardando…' : 'Registrar exportación'"
          :loading="saving"
          :disabled="saving"
        />
      </div>
    </form>
  </Dialog>
</template>

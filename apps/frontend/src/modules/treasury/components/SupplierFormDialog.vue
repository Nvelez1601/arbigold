<script setup lang="ts">
import type { Supplier } from '@arbigold/shared-types';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import RadioButton from 'primevue/radiobutton';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { computed, nextTick, watch } from 'vue';
import {
  SUPPLIER_CURRENCY_OPTIONS,
  SUPPLIER_KIND_OPTIONS,
  type SupplierFormField,
  type SupplierFormOutput,
  useSupplierForm,
} from '../composables/useSupplierForm.ts';

const props = defineProps<{ visible: boolean; supplier: Supplier | null; isSaving: boolean }>();
const emit = defineEmits<{
  'update:visible': [visible: boolean];
  submit: [input: SupplierFormOutput];
}>();

const FIELD_IDS: Record<SupplierFormField, string> = {
  name: 'supplier-name',
  kind: 'supplier-kind-FONDEO',
  country: 'supplier-country',
  currency: 'supplier-currency',
  defaultPercentage: 'supplier-percentage',
  notes: 'supplier-notes',
};

const { values, errors, isDirty, reset, validate } = useSupplierForm();
const confirm = useConfirm();

const title = computed(() => (props.supplier ? 'Editar proveedor' : 'Nuevo proveedor'));
const errorId = (field: SupplierFormField) => `${FIELD_IDS[field]}-error`;
const describedBy = (field: SupplierFormField, hintId?: string) =>
  [errors.value[field] ? errorId(field) : undefined, hintId].filter(Boolean).join(' ') || undefined;

watch(
  () => props.visible,
  (isVisible) => isVisible && reset(props.supplier),
  { immediate: true },
);

const focusField = async (field: SupplierFormField) => {
  await nextTick();
  document.getElementById(FIELD_IDS[field])?.focus();
};

const close = () => emit('update:visible', false);

/** Esc, la X y "Cancelar" pasan por aquí: no se pierden cambios sin avisar. */
const requestClose = () => {
  if (props.isSaving) return;
  if (!isDirty.value) {
    close();
    return;
  }
  confirm.require({
    header: 'Descartar cambios',
    message: 'Hay cambios sin guardar en este proveedor. Si cierras ahora, se pierden.',
    acceptProps: { label: 'Descartar cambios', severity: 'danger' },
    rejectProps: { label: 'Seguir editando', severity: 'secondary', text: true },
    accept: close,
  });
};

const onSubmit = () => {
  if (props.isSaving) return;
  const result = validate();
  if (!result.isValid) {
    void focusField(result.firstInvalidField);
    return;
  }
  emit('submit', result.input);
};
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="title"
    :draggable="false"
    :closable="!isSaving"
    :close-on-escape="!isSaving"
    :style="{ width: 'min(36rem, calc(100vw - 2rem))' }"
    @update:visible="requestClose"
  >
    <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
      <div class="flex flex-col gap-1.5">
        <label :for="FIELD_IDS.name" class="text-sm font-medium text-heading">Nombre</label>
        <InputText
          :id="FIELD_IDS.name"
          v-model="values.name"
          name="name"
          autocomplete="organization"
          placeholder="p. ej. Fondos del Caribe…"
          :invalid="Boolean(errors.name)"
          :aria-invalid="Boolean(errors.name)"
          :aria-describedby="describedBy('name')"
        />
        <p v-if="errors.name" :id="errorId('name')" class="text-sm text-danger" aria-live="polite">
          {{ errors.name }}
        </p>
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1.5 text-sm font-medium text-heading">Tipo de proveedor</legend>
        <label
          v-for="option in SUPPLIER_KIND_OPTIONS"
          :key="option.value"
          :for="`supplier-kind-${option.value}`"
          class="flex cursor-pointer gap-3 rounded-md border border-border px-3 py-2.5 transition-colors duration-150 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50"
        >
          <RadioButton
            v-model="values.kind"
            :input-id="`supplier-kind-${option.value}`"
            name="kind"
            :value="option.value"
            class="mt-0.5"
          />
          <span class="min-w-0">
            <span class="block font-medium text-heading">{{ option.label }}</span>
            <span class="block text-sm text-pretty text-muted">{{ option.description }}</span>
          </span>
        </label>
      </fieldset>

      <div class="grid gap-5 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label :for="FIELD_IDS.country" class="text-sm font-medium text-heading">
            País <span class="font-normal text-muted">(opcional)</span>
          </label>
          <InputText
            :id="FIELD_IDS.country"
            v-model="values.country"
            name="country"
            autocomplete="country-name"
            placeholder="p. ej. Panamá…"
            :invalid="Boolean(errors.country)"
            :aria-invalid="Boolean(errors.country)"
            :aria-describedby="describedBy('country')"
          />
          <p
            v-if="errors.country"
            :id="errorId('country')"
            class="text-sm text-danger"
            aria-live="polite"
          >
            {{ errors.country }}
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            id="supplier-currency-label"
            :for="FIELD_IDS.currency"
            class="text-sm font-medium text-heading"
            >Moneda</label
          >
          <Select
            v-model="values.currency"
            :input-id="FIELD_IDS.currency"
            aria-labelledby="supplier-currency-label"
            name="currency"
            :options="SUPPLIER_CURRENCY_OPTIONS"
          />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label :for="FIELD_IDS.defaultPercentage" class="text-sm font-medium text-heading">
          % habitual <span class="font-normal text-muted">(opcional)</span>
        </label>
        <InputText
          :id="FIELD_IDS.defaultPercentage"
          v-model="values.defaultPercentage"
          name="defaultPercentage"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          spellcheck="false"
          placeholder="p. ej. 97,5…"
          class="tabular-nums sm:max-w-40"
          :invalid="Boolean(errors.defaultPercentage)"
          :aria-invalid="Boolean(errors.defaultPercentage)"
          :aria-describedby="describedBy('defaultPercentage', 'supplier-percentage-hint')"
        />
        <p id="supplier-percentage-hint" class="text-sm text-pretty text-muted">
          En fondeo, el % del precio internacional al que se cierra con este proveedor. En terceros,
          la utilidad negociada.
        </p>
        <p
          v-if="errors.defaultPercentage"
          :id="errorId('defaultPercentage')"
          class="text-sm text-danger"
          aria-live="polite"
        >
          {{ errors.defaultPercentage }}
        </p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label :for="FIELD_IDS.notes" class="text-sm font-medium text-heading">
          Notas <span class="font-normal text-muted">(opcional)</span>
        </label>
        <Textarea
          :id="FIELD_IDS.notes"
          v-model="values.notes"
          name="notes"
          rows="3"
          autocomplete="off"
          :invalid="Boolean(errors.notes)"
          :aria-invalid="Boolean(errors.notes)"
          :aria-describedby="describedBy('notes')"
        />
        <p
          v-if="errors.notes"
          :id="errorId('notes')"
          class="text-sm text-danger"
          aria-live="polite"
        >
          {{ errors.notes }}
        </p>
      </div>

      <div class="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          label="Cancelar"
          severity="secondary"
          text
          :disabled="isSaving"
          @click="requestClose"
        />
        <Button
          type="submit"
          :label="isSaving ? 'Guardando…' : 'Guardar proveedor'"
          :loading="isSaving"
          :disabled="isSaving"
        />
      </div>
    </form>
  </Dialog>
</template>

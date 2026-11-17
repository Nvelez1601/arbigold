<script setup lang="ts">
import {
  OPERATION_CURRENCIES,
  type Client,
  type OperationInput,
  type Supplier,
} from '@arbigold/shared-types';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { computed, nextTick, toRef, watch } from 'vue';
import {
  type OperationField,
  firstInvalidField,
  useOperationForm,
} from '../composables/useOperationForm.ts';
import ClosurePreview from './ClosurePreview.vue';

const props = defineProps<{
  suppliers: readonly Supplier[];
  clients: readonly Client[];
  isSaving: boolean;
}>();
const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ submit: [input: OperationInput] }>();
const confirm = useConfirm();

/** Solo FONDEO adelanta fondos: TERCEROS trae material propio y su % es de utilidad, no de cierre. */
const activeSuppliers = computed(() =>
  props.suppliers.filter((s) => s.active && s.kind === 'FONDEO'),
);
const activeClients = computed(() => props.clients.filter((c) => c.active));
const { draft, errors, isDirty, selectSupplier, selectClient, validate, reset } = useOperationForm({
  suppliers: toRef(props, 'suppliers'),
  clients: toRef(props, 'clients'),
});
const currencyOptions = [...OPERATION_CURRENCIES];
/** Teclado numérico en móvil; el valor sigue siendo texto (nunca number). */
const DECIMAL_INPUT = { inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false' } as const;
const PARTY_SELECTS = computed(() => [
  {
    field: 'supplierId' as const,
    label: 'Proveedor',
    placeholder: 'Elige el proveedor',
    options: activeSuppliers.value,
    select: selectSupplier,
  },
  {
    field: 'clientId' as const,
    label: 'Cliente',
    placeholder: 'Elige el cliente',
    options: activeClients.value,
    select: selectClient,
  },
]);
const CLOSURE_FIELDS = [
  {
    field: 'internationalPricePerOunce',
    label: 'P. INT (USD por onza troy)',
    placeholder: 'p. ej. 4000',
    span: 'sm:col-span-2',
  },
  { field: 'clientPercentage', label: '% del cliente', placeholder: 'p. ej. 96.5', span: '' },
  { field: 'supplierPercentage', label: '% del proveedor', placeholder: 'p. ej. 97', span: '' },
] as const;

watch(visible, (isOpen) => isOpen && reset());

const fieldId = (field: OperationField) => `operation-${field}`;
const errorId = (field: OperationField) => `operation-${field}-error`;
const describedBy = (field: OperationField) => (errors.value[field] ? errorId(field) : undefined);

const focusFirstError = async () => {
  const field = firstInvalidField(errors.value);
  await nextTick();
  if (field) document.getElementById(fieldId(field))?.focus();
};

const submit = async () => {
  if (props.isSaving) return;
  const input = validate();
  if (!input) return focusFirstError();
  emit('submit', input);
};

/** Esc, la X y "Volver" pasan por aquí: si hay datos escritos, se confirma antes de perderlos. */
const requestClose = () => {
  if (props.isSaving) return;
  if (!isDirty.value) return void (visible.value = false);
  confirm.require({
    header: 'Descartar la operación',
    message: 'Lo que escribiste en esta operación se perderá.',
    acceptProps: { label: 'Descartar', severity: 'danger' },
    rejectProps: { label: 'Seguir editando', severity: 'secondary', text: true },
    accept: () => (visible.value = false),
  });
};
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Nueva operación"
    :draggable="false"
    :closable="!isSaving"
    :close-on-escape="!isSaving"
    class="w-[min(60rem,calc(100vw-2rem))]"
    @update:visible="(isOpen: boolean) => isOpen || requestClose()"
  >
    <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_19rem]">
      <form
        id="operation-form"
        novalidate
        class="grid gap-4 sm:grid-cols-2"
        @submit.prevent="submit"
      >
        <div v-for="party in PARTY_SELECTS" :key="party.field" class="flex flex-col gap-1">
          <label :id="`${fieldId(party.field)}-label`" class="text-sm font-medium text-heading">
            {{ party.label }}
          </label>
          <Select
            :model-value="draft[party.field]"
            :options="party.options"
            option-label="name"
            option-value="id"
            :name="party.field"
            :placeholder="party.placeholder"
            :label-id="fieldId(party.field)"
            :aria-labelledby="`${fieldId(party.field)}-label`"
            :invalid="!!errors[party.field]"
            :aria-describedby="describedBy(party.field)"
            :disabled="isSaving"
            fluid
            @update:model-value="party.select"
          />
          <small v-if="errors[party.field]" :id="errorId(party.field)" class="text-danger">
            {{ errors[party.field] }}
          </small>
        </div>
        <div class="flex flex-col gap-1">
          <label :for="fieldId('closedOn')" class="text-sm font-medium text-heading">
            Fecha del cierre
          </label>
          <InputText
            :id="fieldId('closedOn')"
            v-model="draft.closedOn"
            name="closedOn"
            type="date"
            :disabled="isSaving"
            :invalid="!!errors.closedOn"
            :aria-describedby="describedBy('closedOn')"
            fluid
          />
          <small v-if="errors.closedOn" :id="errorId('closedOn')" class="text-danger">
            {{ errors.closedOn }}
          </small>
        </div>
        <div class="flex flex-col gap-1">
          <label :for="fieldId('amount')" class="text-sm font-medium text-heading">
            Monto adelantado
          </label>
          <div class="flex gap-2">
            <InputText
              :id="fieldId('amount')"
              v-model="draft.amount"
              name="amount"
              v-bind="DECIMAL_INPUT"
              placeholder="p. ej. 100000"
              class="min-w-0 flex-1 text-right tabular-nums"
              :disabled="isSaving"
              :invalid="!!errors.amount"
              :aria-describedby="describedBy('amount')"
            />
            <span :id="`${fieldId('currency')}-label`" class="sr-only">Moneda del monto</span>
            <Select
              v-model="draft.currency"
              :options="currencyOptions"
              :name="fieldId('currency')"
              :label-id="fieldId('currency')"
              :aria-labelledby="`${fieldId('currency')}-label`"
              :disabled="isSaving"
              class="w-28"
            />
          </div>
          <small v-if="errors.amount" :id="errorId('amount')" class="text-danger">
            {{ errors.amount }}
          </small>
        </div>
        <div
          v-for="item in CLOSURE_FIELDS"
          :key="item.field"
          class="flex flex-col gap-1"
          :class="item.span"
        >
          <label :for="fieldId(item.field)" class="text-sm font-medium text-heading">
            {{ item.label }}
          </label>
          <InputText
            :id="fieldId(item.field)"
            v-model="draft[item.field]"
            :name="item.field"
            v-bind="DECIMAL_INPUT"
            :placeholder="item.placeholder"
            class="text-right tabular-nums"
            :disabled="isSaving"
            :invalid="!!errors[item.field]"
            :aria-describedby="describedBy(item.field)"
            fluid
          />
          <small v-if="errors[item.field]" :id="errorId(item.field)" class="text-danger">
            {{ errors[item.field] }}
          </small>
        </div>
        <div class="flex flex-col gap-1 sm:col-span-2">
          <label :for="fieldId('notes')" class="text-sm font-medium text-heading">
            Notas (opcional)
          </label>
          <Textarea
            :id="fieldId('notes')"
            v-model="draft.notes"
            name="notes"
            rows="2"
            auto-resize
            :disabled="isSaving"
            :invalid="!!errors.notes"
            :aria-describedby="describedBy('notes')"
            fluid
          />
          <small v-if="errors.notes" :id="errorId('notes')" class="text-danger">
            {{ errors.notes }}
          </small>
        </div>
      </form>
      <ClosurePreview :inputs="draft" />
    </div>
    <template #footer>
      <Button label="Volver" severity="secondary" text :disabled="isSaving" @click="requestClose" />
      <Button
        type="submit"
        form="operation-form"
        :label="isSaving ? 'Guardando…' : 'Registrar operación'"
        :loading="isSaving"
        :disabled="isSaving"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { CLIENT_KINDS, type Client } from '@arbigold/shared-types';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { computed, nextTick, watch } from 'vue';
import {
  type ClientField,
  type ValidClientInput,
  useClientForm,
} from '../composables/useClientForm.ts';

const props = defineProps<{ client: Client | null; isSaving: boolean }>();
const emit = defineEmits<{ save: [input: ValidClientInput] }>();
const visible = defineModel<boolean>('visible', { required: true });

const KIND_LABELS: Record<(typeof CLIENT_KINDS)[number], string> = {
  PERSONA: 'Persona',
  EMPRESA: 'Empresa',
};

interface TextField {
  readonly field: Exclude<ClientField, 'kind' | 'notes'>;
  readonly label: string;
  readonly placeholder: string;
  readonly type?: 'text' | 'tel';
  readonly inputmode?: 'text' | 'tel' | 'decimal';
  readonly hint?: string;
  readonly isWide?: boolean;
}

const TEXT_FIELDS: readonly TextField[] = [
  { field: 'name', label: 'Nombre', placeholder: 'Inversiones Ejemplo C.A.…', isWide: true },
  { field: 'documentId', label: 'Cédula o RIF', placeholder: 'V-12345678 o J-12345678-9…' },
  {
    field: 'phone',
    label: 'Teléfono',
    placeholder: '0414-1234567…',
    type: 'tel',
    inputmode: 'tel',
  },
  { field: 'location', label: 'Ubicación', placeholder: 'Ciudad o estado…' },
  {
    field: 'defaultPercentage',
    label: '% habitual de compra',
    placeholder: '96.5…',
    inputmode: 'decimal',
    hint: '% del precio internacional al que suele comprar; cada operación puede negociar otro.',
  },
];

const form = useClientForm();
const { values, errors } = form;
const title = computed(() => (props.client ? 'Editar cliente' : 'Nuevo cliente'));

watch(visible, (isOpen) => isOpen && form.reset(props.client), { immediate: true });

const fieldId = (field: ClientField) => `client-${field}`;
const describedBy = (field: TextField) =>
  [
    field.hint && `${fieldId(field.field)}-hint`,
    errors.value[field.field] && `${fieldId(field.field)}-error`,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

const confirm = useConfirm();
const close = () => {
  visible.value = false;
};
/** Esc, la X o Cancelar: si hay cambios sin guardar, se pregunta antes de perderlos. */
const requestClose = () => {
  if (props.isSaving) return;
  if (!form.isDirty()) return close();
  confirm.require({
    header: 'Descartar cambios',
    message: 'Lo que escribiste en este cliente se perderá.',
    acceptProps: { label: 'Descartar cambios', severity: 'danger' },
    rejectProps: { label: 'Seguir editando', severity: 'secondary', text: true },
    accept: close,
  });
};

const submit = async () => {
  if (props.isSaving) return;
  const input = form.validate();
  if (input) return emit('save', input);
  await nextTick();
  const field = form.firstErrorField();
  if (field) document.getElementById(fieldId(field))?.focus();
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
    class="w-[min(36rem,calc(100vw-2rem))]"
    @update:visible="requestClose"
  >
    <form novalidate class="grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <div
        v-for="item in TEXT_FIELDS"
        :key="item.field"
        class="flex min-w-0 flex-col gap-1.5"
        :class="{ 'sm:col-span-2': item.isWide }"
      >
        <label :for="fieldId(item.field)" class="text-sm font-medium text-heading">
          {{ item.label }}
        </label>
        <InputText
          :id="fieldId(item.field)"
          v-model="values[item.field]"
          :name="item.field"
          :type="item.type ?? 'text'"
          :inputmode="item.inputmode ?? 'text'"
          :placeholder="item.placeholder"
          autocomplete="off"
          :spellcheck="item.field === 'name'"
          maxlength="120"
          :disabled="isSaving"
          :invalid="Boolean(errors[item.field])"
          :aria-invalid="Boolean(errors[item.field])"
          :aria-describedby="describedBy(item)"
          :class="{ 'tabular-nums': item.inputmode === 'decimal' }"
        />
        <p
          v-if="item.hint"
          :id="`${fieldId(item.field)}-hint`"
          class="text-xs text-pretty text-muted"
        >
          {{ item.hint }}
        </p>
        <Message
          v-if="errors[item.field]"
          :id="`${fieldId(item.field)}-error`"
          severity="error"
          size="small"
          variant="simple"
        >
          {{ errors[item.field] }}
        </Message>
      </div>

      <fieldset class="flex flex-col gap-1.5 sm:col-span-2">
        <legend class="mb-1.5 text-sm font-medium text-heading">Tipo</legend>
        <div class="flex gap-6">
          <label
            v-for="kind in CLIENT_KINDS"
            :key="kind"
            class="flex cursor-pointer items-center gap-2 py-1 text-sm text-text"
          >
            <input
              :id="kind === values.kind ? fieldId('kind') : undefined"
              v-model="values.kind"
              type="radio"
              name="kind"
              :value="kind"
              :disabled="isSaving"
              class="size-4 accent-primary-600"
            />
            {{ KIND_LABELS[kind] }}
          </label>
        </div>
      </fieldset>

      <div class="flex flex-col gap-1.5 sm:col-span-2">
        <label :for="fieldId('notes')" class="text-sm font-medium text-heading">Notas</label>
        <Textarea
          :id="fieldId('notes')"
          v-model="values.notes"
          name="notes"
          rows="3"
          maxlength="500"
          placeholder="Condiciones acordadas, horario de entrega…"
          :disabled="isSaving"
          :invalid="Boolean(errors.notes)"
          :aria-invalid="Boolean(errors.notes)"
          :aria-describedby="errors.notes ? 'client-notes-error' : undefined"
        />
        <Message
          v-if="errors.notes"
          id="client-notes-error"
          severity="error"
          size="small"
          variant="simple"
        >
          {{ errors.notes }}
        </Message>
      </div>

      <div class="flex justify-end gap-2 sm:col-span-2">
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
          :label="isSaving ? 'Guardando…' : 'Guardar cliente'"
          :loading="isSaving"
        />
      </div>
    </form>
  </Dialog>
</template>

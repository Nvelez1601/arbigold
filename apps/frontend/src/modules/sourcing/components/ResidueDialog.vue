<script setup lang="ts">
import { residueSchema } from '@arbigold/shared-types';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { ref, watch } from 'vue';
import {
  RESIDUE_LABELS,
  type ResidueKind,
  type ResidueRow,
  newRowKey,
} from '../composables/usePackingListEditor.ts';

/** Viruta o fundición: se elige de qué piezas EXISTENTES sale; no es una pieza nueva. */
const visible = defineModel<boolean>('visible', { required: true });
const props = defineProps<{ pieceNumbers: readonly number[] }>();
const emit = defineEmits<{ save: [residue: ResidueRow] }>();

type Field = 'fromPieces' | 'grossWeight' | 'fineness' | 'note';
const KIND_OPTIONS = (Object.keys(RESIDUE_LABELS) as ResidueKind[]).map((value) => ({
  value,
  label: RESIDUE_LABELS[value],
}));

const emptyForm = () => ({
  kind: 'VIRUTA' as ResidueKind,
  fromPieces: [] as number[],
  grossWeight: '',
  fineness: '',
  note: '',
});
const form = ref(emptyForm());
const errors = ref<Partial<Record<Field, string>>>({});

watch(visible, (isOpen) => {
  if (!isOpen) return;
  form.value = emptyForm();
  errors.value = {};
});

/** Cerrar con cambios pide confirmación: lo escrito no se pierde por un clic de más. */
const confirm = useConfirm();
const hasChanges = () => JSON.stringify(form.value) !== JSON.stringify(emptyForm());
const requestClose = () => {
  if (!hasChanges()) {
    visible.value = false;
    return;
  }
  confirm.require({
    group: 'residue',
    header: 'Descartar lo escrito',
    message: 'Si cierras ahora, se pierde la viruta o fundición que estabas registrando.',
    acceptProps: { label: 'Descartar', severity: 'danger' },
    rejectProps: { label: 'Seguir registrando', severity: 'secondary', text: true },
    accept: () => (visible.value = false),
  });
};

const register = () => {
  const { fineness, note, ...rest } = form.value;
  const parsed = residueSchema.safeParse({ ...rest, fineness: fineness.trim() || undefined, note });
  if (!parsed.success) {
    errors.value = Object.fromEntries(
      parsed.error.issues.toReversed().map((issue) => [issue.path[0], issue.message]),
    );
    return;
  }
  const fromPieces = [...form.value.fromPieces].sort((a, b) => a - b);
  // `parsed.data` ya normalizó la coma decimal: la fila no debe quedar con "12,5" (NaN al pintar).
  emit('save', {
    ...parsed.data,
    fineness: parsed.data.fineness ?? '',
    note: parsed.data.note ?? '',
    fromPieces,
    key: newRowKey(),
  });
  visible.value = false;
};
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Registrar viruta o fundición"
    class="w-[min(32rem,calc(100vw-2rem))]"
    @update:visible="requestClose"
  >
    <form id="residue-form" class="flex flex-col gap-5" novalidate @submit.prevent="register">
      <div class="flex flex-col gap-2">
        <span id="residue-kind" class="text-sm font-medium text-heading">Tipo</span>
        <SelectButton
          v-model="form.kind"
          :options="KIND_OPTIONS"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          aria-labelledby="residue-kind"
        />
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 text-sm font-medium text-heading">Sale de las piezas</legend>
        <p v-if="props.pieceNumbers.length === 0" class="text-sm text-muted">
          Primero agrega piezas al packing list: la viruta y la fundición salen de ellas.
        </p>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="number in props.pieceNumbers"
            :key="number"
            class="cursor-pointer rounded-md border border-border-strong px-3 py-1.5 text-sm text-text tabular-nums transition-colors duration-150 select-none has-checked:border-primary-600 has-checked:bg-primary-600 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-primary-500"
          >
            <input v-model="form.fromPieces" type="checkbox" :value="number" class="sr-only" />
            Pieza {{ number }}
          </label>
        </div>
        <p v-if="errors.fromPieces" class="text-xs text-danger">{{ errors.fromPieces }}</p>
      </fieldset>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-1.5 text-sm font-medium text-heading">
          Peso bruto (g)
          <InputText
            v-model="form.grossWeight"
            inputmode="decimal"
            autocomplete="off"
            class="text-right tabular-nums"
            :invalid="Boolean(errors.grossWeight)"
          />
          <span v-if="errors.grossWeight" class="text-xs font-normal text-danger">{{
            errors.grossWeight
          }}</span>
        </label>
        <label class="flex flex-col gap-1.5 text-sm font-medium text-heading">
          Ley (opcional)
          <InputText
            v-model="form.fineness"
            inputmode="decimal"
            autocomplete="off"
            class="text-right tabular-nums"
            :invalid="Boolean(errors.fineness)"
          />
          <span v-if="errors.fineness" class="text-xs font-normal text-danger">{{
            errors.fineness
          }}</span>
        </label>
      </div>

      <label class="flex flex-col gap-1.5 text-sm font-medium text-heading">
        Nota
        <Textarea
          v-model="form.note"
          name="note"
          rows="2"
          maxlength="500"
          class="font-normal"
          :invalid="Boolean(errors.note)"
          :aria-invalid="Boolean(errors.note)"
          :aria-describedby="errors.note ? 'residue-note-error' : undefined"
        />
        <span v-if="errors.note" id="residue-note-error" class="text-xs font-normal text-danger">
          {{ errors.note }}
        </span>
      </label>
    </form>
    <template #footer>
      <Button label="Cancelar" severity="secondary" text @click="requestClose" />
      <Button label="Registrar" @click="register" />
    </template>
  </Dialog>
  <ConfirmDialog group="residue" />
</template>

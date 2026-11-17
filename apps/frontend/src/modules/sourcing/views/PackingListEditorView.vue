<script setup lang="ts">
import { FileQuestion, Plus, Trash2 } from 'lucide-vue-next';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, ref, toRef } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import EmptyState from '../../../shared/components/EmptyState.vue';
import PageHeader from '../../../shared/components/PageHeader.vue';
import { formatDate, formatGrams, formatPerMille } from '../../../shared/utils/format.ts';
import { toPerMille } from '../../../shared/utils/gold.ts';
import PieceRowsEditor from '../components/PieceRowsEditor.vue';
import ResidueDialog from '../components/ResidueDialog.vue';
import ScaleSummaryBar from '../components/ScaleSummaryBar.vue';
import {
  RESIDUE_LABELS,
  STATUS_TAGS,
  describePieces,
  usePackingListEditor,
} from '../composables/usePackingListEditor.ts';

const props = defineProps<{ id?: string }>();
const {
  header,
  pieces,
  residues,
  record,
  isLoading,
  isError,
  isMissing,
  retry,
  status,
  isEditable,
  isDirty,
  clientOptions,
  totals,
  pieceNumbers,
  pieceErrors,
  headerErrors,
  orphanResidues,
  saveDraft,
  markReceived,
} = usePackingListEditor(toRef(props, 'id'));

const toast = useToast();
const confirm = useConfirm();
const router = useRouter();
const isBusy = ref(false);
const isResidueDialogOpen = ref(false);

const title = computed(() =>
  record.value ? `Packing list del ${formatDate(record.value.issuedOn)}` : 'Nuevo packing list',
);
const perMilleText = (fineness: string) => formatPerMille(toPerMille(fineness)?.toString() ?? '0');
const removeResidue = (key: string) => {
  residues.value = residues.value.filter((residue) => residue.key !== key);
};

type Action = typeof saveDraft;
const SAVE_FAILED = 'Tus datos siguen en pantalla: vuelve a intentarlo.';
const attempt = async (
  action: Action,
): Promise<Awaited<ReturnType<Action>> & { failed?: true }> => {
  isBusy.value = true;
  try {
    return await action();
  } catch {
    return { problem: SAVE_FAILED, failed: true as const };
  } finally {
    isBusy.value = false;
  }
};
const run = async (action: Action, done: string) => {
  const result = await attempt(action);
  if (!result.record) {
    const summary =
      'failed' in result ? 'No se pudo guardar el packing list' : 'Falta corregir el packing list';
    toast.add({ severity: 'error', summary, detail: result.problem, life: 6000 });
    return;
  }
  toast.add({ severity: 'success', summary: done, life: 3000 });
  if (props.id !== result.record.id) await router.replace(`/packing-lists/${result.record.id}`);
};

const confirmReceive = () =>
  confirm.require({
    header: 'Marcar como recibido',
    message:
      'Caracas recibe las piezas y el packing list queda listo para exportar. Después ya no se puede editar.',
    acceptProps: { label: 'Marcar como recibido' },
    rejectProps: { label: 'Seguir editando', severity: 'secondary', text: true },
    accept: () => run(markReceived, 'Marcado como recibido'),
  });

const askToLeave = () =>
  new Promise<boolean>((resolve) =>
    confirm.require({
      header: 'Cambios sin guardar',
      message: 'Si sales ahora, se pierden los cambios de este packing list.',
      acceptProps: { label: 'Salir sin guardar', severity: 'danger' },
      rejectProps: { label: 'Seguir editando', severity: 'secondary', text: true },
      accept: () => resolve(true),
      reject: () => resolve(false),
      onHide: () => resolve(false),
    }),
  );
onBeforeRouteLeave(() => !isDirty.value || askToLeave());
</script>

<template>
  <p v-if="isLoading" class="text-muted">Cargando el packing list…</p>
  <EmptyState
    v-else-if="isError"
    title="No se pudo cargar el packing list"
    description="Vuelve a intentarlo. Si el problema sigue, recarga la página."
    :icon="FileQuestion"
  >
    <Button label="Reintentar" severity="secondary" @click="retry" />
  </EmptyState>
  <EmptyState
    v-else-if="isMissing"
    title="No encontramos este packing list"
    description="Puede que el enlace esté incompleto o que el registro ya no exista."
    :icon="FileQuestion"
  >
    <RouterLink to="/packing-lists" class="font-medium text-primary-600 underline">
      Ver todos los packing lists
    </RouterLink>
  </EmptyState>
  <template v-else>
    <PageHeader
      :title="title"
      description="Piezas que entrega un cliente, en gramos. Los totales son una vista previa."
    >
      <template #actions>
        <Tag :value="STATUS_TAGS[status].label" :severity="STATUS_TAGS[status].severity" />
        <Button
          v-if="isEditable"
          label="Marcar como recibido"
          severity="secondary"
          outlined
          :disabled="isBusy"
          @click="confirmReceive"
        />
      </template>
    </PageHeader>

    <section aria-label="Datos del packing list" class="grid gap-4 sm:grid-cols-[2fr_1fr]">
      <div class="flex flex-col gap-1.5">
        <span id="pl-client" class="text-sm font-medium text-heading">Cliente</span>
        <Select
          v-model="header.clientId"
          :options="clientOptions"
          option-label="name"
          option-value="id"
          placeholder="Elige el cliente que entrega"
          aria-labelledby="pl-client"
          :disabled="!isEditable"
          :invalid="Boolean(headerErrors.clientId)"
        />
        <p v-if="headerErrors.clientId" class="text-xs text-danger">{{ headerErrors.clientId }}</p>
        <p v-if="isEditable && clientOptions.length === 0" class="text-sm text-muted">
          No hay clientes activos.
          <RouterLink to="/clientes" class="text-primary-600 underline">Registra uno</RouterLink>
          para asignarle este packing list.
        </p>
      </div>
      <label class="flex flex-col gap-1.5 text-sm font-medium text-heading">
        Fecha
        <InputText
          v-model="header.issuedOn"
          type="date"
          :readonly="!isEditable"
          :invalid="Boolean(headerErrors.issuedOn)"
          class="tabular-nums"
        />
        <span v-if="headerErrors.issuedOn" class="text-xs font-normal text-danger">{{
          headerErrors.issuedOn
        }}</span>
      </label>
      <label class="flex flex-col gap-1.5 text-sm font-medium text-heading sm:col-span-2">
        Notas
        <Textarea v-model="header.notes" rows="2" :readonly="!isEditable" />
      </label>
    </section>

    <section aria-labelledby="pl-pieces" class="mt-8">
      <h2 id="pl-pieces" class="mb-3 text-lg font-semibold text-heading">Piezas</h2>
      <PieceRowsEditor v-model="pieces" :errors="pieceErrors" :readonly="!isEditable" />
    </section>

    <section aria-labelledby="pl-residues" class="mt-8">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="pl-residues" class="text-lg font-semibold text-heading">Viruta y fundición</h2>
        <Button v-if="isEditable" severity="secondary" outlined @click="isResidueDialogOpen = true">
          <Plus class="size-4" aria-hidden="true" />
          Registrar viruta o fundición
        </Button>
      </div>
      <ul
        v-if="residues.length > 0"
        class="divide-y divide-surface-200 rounded-lg border border-border bg-surface-0"
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
            v-if="isEditable"
            text
            rounded
            severity="secondary"
            :aria-label="`Quitar ${RESIDUE_LABELS[residue.kind].toLowerCase()} de ${describePieces(residue.fromPieces)}`"
            @click="removeResidue(residue.key)"
          >
            <Trash2 class="size-4" aria-hidden="true" />
          </Button>
        </li>
      </ul>
      <p v-else class="text-sm text-muted">Sin viruta ni fundición registradas.</p>
      <p class="mt-2 text-sm text-muted">
        No suman al conteo ni a los totales: salen de las mismas piezas.
      </p>
    </section>

    <ScaleSummaryBar :count="totals.count" :gross="totals.gross" :fine="totals.fine">
      <Button
        v-if="isEditable"
        label="Guardar borrador"
        :loading="isBusy"
        :disabled="isBusy"
        @click="run(saveDraft, 'Borrador guardado')"
      />
    </ScaleSummaryBar>

    <ResidueDialog
      v-model:visible="isResidueDialogOpen"
      :piece-numbers="pieceNumbers"
      @save="residues.push($event)"
    />
  </template>
</template>

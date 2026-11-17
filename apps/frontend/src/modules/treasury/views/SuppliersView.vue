<script setup lang="ts">
import type { Supplier } from '@arbigold/shared-types';
import { Search, SearchX, Users } from 'lucide-vue-next';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EmptyState from '../../../shared/components/EmptyState.vue';
import PageHeader from '../../../shared/components/PageHeader.vue';
import {
  useCollection,
  useCollectionMutations,
} from '../../../shared/composables/useCollection.ts';
import { QUERY_KEYS, suppliersRepository } from '../../../shared/data/repositories.ts';
import { formatPercent } from '../../../shared/utils/format.ts';
import SupplierFormDialog from '../components/SupplierFormDialog.vue';
import { SUPPLIER_KIND_INFO, type SupplierFormOutput } from '../composables/useSupplierForm.ts';

const TOAST_LIFE_MS = 4000;

/** Desactivar no borra: el proveedor conserva su historial y se puede reactivar. */
const ACTIVATION_COPY = {
  deactivate: {
    header: 'Desactivar proveedor',
    message: (name: string) =>
      `${name} quedará inactivo y no se ofrecerá para operaciones nuevas. Su historial se conserva y puedes reactivarlo cuando quieras.`,
    acceptLabel: 'Desactivar',
    severity: 'danger',
    done: 'Proveedor desactivado',
    failed: 'No se pudo desactivar el proveedor',
  },
  reactivate: {
    header: 'Reactivar proveedor',
    message: (name: string) => `${name} vuelve a estar disponible para operaciones nuevas.`,
    acceptLabel: 'Reactivar',
    severity: undefined,
    done: 'Proveedor reactivado',
    failed: 'No se pudo reactivar el proveedor',
  },
} as const;
type ActivationAction = keyof typeof ACTIVATION_COPY;

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const suppliers = useCollection(QUERY_KEYS.suppliers, suppliersRepository);
const { create, update } = useCollectionMutations(QUERY_KEYS.suppliers, suppliersRepository);

const DIACRITICS = /\p{Diacritic}/gu;
const normalize = (text: string) => text.normalize('NFD').replace(DIACRITICS, '').toLowerCase();

/** La búsqueda vive en la URL (?q=…): se comparte y sobrevive a recargar la página. */
const search = computed({
  get: () => (typeof route.query.q === 'string' ? route.query.q : ''),
  set: (value: string) =>
    void router.replace({ query: { ...route.query, q: value.trim() ? value : undefined } }),
});

const allSuppliers = computed(() =>
  [...(suppliers.data.value ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'es')),
);
const visibleSuppliers = computed(() =>
  allSuppliers.value.filter((supplier) =>
    normalize(supplier.name).includes(normalize(search.value.trim())),
  ),
);

const isDialogVisible = ref(false);
const editing = ref<Supplier | null>(null);
const isSaving = computed(() => create.isPending.value || update.isPending.value);

const openForm = (supplier: Supplier | null) => {
  editing.value = supplier;
  isDialogVisible.value = true;
};

/** Los errores se quedan en pantalla hasta que se cierran: piden una acción. */
const notify = (severity: 'success' | 'error', summary: string, detail: string) =>
  toast.add({
    severity,
    summary,
    detail,
    life: severity === 'success' ? TOAST_LIFE_MS : undefined,
  });

const persist = (input: SupplierFormOutput) =>
  editing.value
    ? update.mutateAsync({ id: editing.value.id, patch: input })
    : create.mutateAsync(input);

const saveSupplier = async (input: SupplierFormOutput) => {
  try {
    await persist(input);
    isDialogVisible.value = false;
    notify('success', 'Proveedor guardado', input.name);
  } catch {
    notify(
      'error',
      'No se pudo guardar el proveedor',
      'Tus datos siguen en el formulario: vuelve a intentarlo.',
    );
  }
};

const setActive = async (supplier: Supplier, copy: (typeof ACTIVATION_COPY)[ActivationAction]) => {
  try {
    await update.mutateAsync({ id: supplier.id, patch: { active: !supplier.active } });
    notify('success', copy.done, supplier.name);
  } catch {
    notify('error', copy.failed, 'Vuelve a intentarlo.');
  }
};

const confirmToggleActive = (supplier: Supplier) => {
  const copy = ACTIVATION_COPY[supplier.active ? 'deactivate' : 'reactivate'];
  confirm.require({
    header: copy.header,
    message: copy.message(supplier.name),
    acceptProps: { label: copy.acceptLabel, severity: copy.severity },
    rejectProps: { label: 'Cancelar', severity: 'secondary', text: true },
    accept: () => setActive(supplier, copy),
  });
};

const UNSET = 'Sin definir';
const percentOf = (supplier: Supplier) =>
  supplier.defaultPercentage ? formatPercent(supplier.defaultPercentage) : UNSET;
const kindOf = (supplier: Supplier) => SUPPLIER_KIND_INFO[supplier.kind];
/** Inactivo se distingue por fondo, nombre atenuado y su Tag: sin opacidad, el contraste no baja de AA. */
const rowClass = (supplier: Supplier) => (supplier.active ? undefined : 'bg-surface-50!');
</script>

<template>
  <PageHeader
    title="Proveedores"
    description="Quienes adelantan los fondos y reciben el oro exportado, y los compradores que traen material propio."
  >
    <template #actions>
      <Button label="Nuevo proveedor" @click="openForm(null)" />
    </template>
  </PageHeader>

  <p v-if="suppliers.isPending.value" role="status" class="py-12 text-center text-sm text-muted">
    Cargando proveedores…
  </p>

  <EmptyState
    v-else-if="suppliers.isError.value"
    title="No se pudieron cargar los proveedores"
    description="Vuelve a intentarlo. Si el problema sigue, recarga la página."
  >
    <Button label="Reintentar" severity="secondary" @click="suppliers.refetch()" />
  </EmptyState>

  <EmptyState
    v-else-if="allSuppliers.length === 0"
    :icon="Users"
    title="Todavía no hay proveedores"
    description="Agrega a quién adelanta los fondos o trae material de terceros. Después podrás asignarlo al cerrar una operación."
  >
    <Button label="Nuevo proveedor" @click="openForm(null)" />
  </EmptyState>

  <section v-else aria-labelledby="suppliers-list-title" class="flex flex-col gap-4">
    <h2 id="suppliers-list-title" class="sr-only">Lista de proveedores</h2>
    <div class="relative max-w-sm">
      <label for="suppliers-search" class="sr-only">Buscar proveedor por nombre</label>
      <Search
        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <InputText
        id="suppliers-search"
        v-model="search"
        type="search"
        name="q"
        autocomplete="off"
        spellcheck="false"
        placeholder="Buscar por nombre…"
        class="w-full pl-9"
      />
    </div>

    <EmptyState
      v-if="visibleSuppliers.length === 0"
      :icon="SearchX"
      :title="`Ningún proveedor coincide con “${search.trim()}”`"
      description="Revisa cómo está escrito o borra la búsqueda para ver todos."
    >
      <Button label="Borrar búsqueda" severity="secondary" outlined @click="search = ''" />
    </EmptyState>

    <DataTable
      v-else
      :value="visibleSuppliers"
      data-key="id"
      size="small"
      :row-class="rowClass"
      table-style="min-width: 48rem"
      class="overflow-hidden rounded-lg border border-border bg-surface-0"
    >
      <Column field="name" header="Nombre">
        <template #body="{ data }">
          <span
            class="font-medium wrap-anywhere"
            :class="data.active ? 'text-heading' : 'text-muted'"
            >{{ data.name }}</span
          >
        </template>
      </Column>
      <Column header="Tipo">
        <template #body="{ data }">
          <Tag :value="kindOf(data).label" :severity="kindOf(data).severity" />
        </template>
      </Column>
      <Column field="currency" header="Moneda" />
      <Column
        header="% habitual"
        :pt="{ columnHeaderContent: { class: 'justify-end' } }"
        body-class="text-right tabular-nums"
      >
        <template #body="{ data }">
          <span :class="{ 'text-muted': !data.defaultPercentage }">{{ percentOf(data) }}</span>
        </template>
      </Column>
      <Column header="País">
        <template #body="{ data }">
          <span :class="{ 'text-muted': !data.country }">{{ data.country ?? UNSET }}</span>
        </template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }">
          <Tag
            :value="data.active ? 'Activo' : 'Inactivo'"
            :severity="data.active ? 'success' : 'secondary'"
          />
        </template>
      </Column>
      <Column :pt="{ columnHeaderContent: { class: 'justify-end' } }">
        <template #header><span class="sr-only">Acciones</span></template>
        <template #body="{ data }">
          <div class="flex justify-end gap-1">
            <Button
              label="Editar"
              size="small"
              text
              :aria-label="`Editar ${data.name}`"
              @click="openForm(data)"
            />
            <Button
              :label="data.active ? 'Desactivar' : 'Reactivar'"
              size="small"
              text
              severity="secondary"
              :aria-label="`${data.active ? 'Desactivar' : 'Reactivar'} ${data.name}`"
              @click="confirmToggleActive(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </section>

  <SupplierFormDialog
    v-model:visible="isDialogVisible"
    :supplier="editing"
    :is-saving="isSaving"
    @submit="saveSupplier"
  />
</template>

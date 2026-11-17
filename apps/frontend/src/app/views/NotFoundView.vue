<script setup lang="ts">
import { SearchX } from 'lucide-vue-next';
import EmptyState from '../../shared/components/EmptyState.vue';
</script>

<template>
  <EmptyState
    :icon="SearchX"
    title="Esta página no existe"
    description="Revisa la dirección o vuelve al panel para elegir un módulo."
  >
    <RouterLink to="/" class="font-medium text-primary-600 underline-offset-4 hover:underline"
      >Ir al panel</RouterLink
    >
  </EmptyState>
</template>

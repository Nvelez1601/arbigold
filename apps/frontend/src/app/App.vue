<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import AppLayout from './layout/AppLayout.vue';
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
  <Toast position="bottom-right" />
  <ConfirmDialog />
</template>

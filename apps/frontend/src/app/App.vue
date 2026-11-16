<script setup lang="ts">
defineProps<{ appName?: string }>();
</script>

<template>
  <div class="min-h-screen">
    <header class="bg-brand-gradient px-6 py-4 text-white shadow-sm">
      <h1 class="text-2xl font-semibold tracking-tight text-white">{{ appName ?? 'ArbiGold' }}</h1>
      <p class="text-sm text-primary-100">ERP de intermediación de oro</p>
    </header>
    <main class="p-6">
      <section class="rounded-lg border border-border bg-surface-0 p-6">
        <p class="text-text">Columna vertebral en construcción.</p>
        <p class="text-sm text-muted">
          Clientes · Proveedores · Operaciones · Packing lists · Exportaciones
        </p>
      </section>
    </main>
  </div>
</template>

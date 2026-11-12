<script setup lang="ts">
defineProps<{ appName?: string }>();
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-6 text-slate-900">
    <h1 class="text-2xl font-semibold">{{ appName ?? 'ArbiGold' }}</h1>
    <p class="text-sm text-slate-600">ERP de intermediación de oro</p>
  </main>
</template>

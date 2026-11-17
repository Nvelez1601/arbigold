<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import { DATA_SOURCE } from '../../shared/data/data-source.ts';
import { NAV_ITEMS } from '../navigation.ts';

withDefaults(defineProps<{ demo?: boolean }>(), { demo: DATA_SOURCE === 'demo' });
</script>

<template>
  <div class="min-h-dvh lg:flex">
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface-0 focus:px-3 focus:py-2 focus:text-heading"
    >
      Saltar al contenido
    </a>

    <aside class="bg-primary-900 text-primary-100 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0">
      <div class="flex items-center gap-2 px-5 py-4 lg:py-6">
        <span class="size-2.5 rounded-full bg-brand-dusty-lavender" aria-hidden="true" />
        <span class="text-lg font-semibold tracking-tight text-white" translate="no">ArbiGold</span>
      </div>
      <nav aria-label="Principal" class="overflow-x-auto px-3 pb-3 lg:pb-0">
        <ul class="flex gap-1 lg:flex-col">
          <li v-for="item in NAV_ITEMS" :key="item.to">
            <RouterLink
              :to="item.to"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors duration-150 hover:bg-primary-700 hover:text-white focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none"
              exact-active-class="bg-primary-700 text-white"
            >
              <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>
    </aside>

    <div class="min-w-0 flex-1">
      <p
        v-if="demo"
        role="status"
        class="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-6 py-2 text-sm text-warning"
      >
        <TriangleAlert class="size-4 shrink-0" aria-hidden="true" />
        Modo demostración: los datos se guardan solo en este navegador. No cargues información real.
      </p>
      <main
        id="contenido"
        tabindex="-1"
        class="mx-auto max-w-7xl px-4 py-6 focus:outline-none sm:px-6 lg:py-8"
      >
        <slot />
      </main>
    </div>
  </div>
</template>

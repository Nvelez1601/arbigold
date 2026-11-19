<script setup lang="ts">
import { NAV_GROUPS } from '../navigation.ts';
</script>

<template>
  <div class="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface-0 focus:px-3 focus:py-2 focus:text-heading"
    >
      Saltar al contenido
    </a>

    <!-- Barra lateral: identidad, navegación por bloques y estado del sistema. -->
    <aside
      class="flex flex-col gap-6 border-b border-border bg-surface-0 px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0 lg:px-3 lg:py-6"
    >
      <div class="flex items-center gap-2.5 px-2">
        <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" class="shrink-0">
          <defs>
            <linearGradient id="arbigold-mark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#6d3fd1" />
              <stop offset="1" stop-color="#e8579b" />
            </linearGradient>
          </defs>
          <path d="M7 21 10 11h12l3 10z" fill="url(#arbigold-mark)" />
          <path d="M4 26l3-5h18l3 5z" fill="url(#arbigold-mark)" opacity=".55" />
        </svg>
        <span class="font-display text-lg font-bold tracking-tight" translate="no">
          Arbi<span class="bg-brand-gradient bg-clip-text text-transparent">Gold</span>
        </span>
      </div>

      <nav aria-label="Principal" class="min-w-0 overflow-x-auto lg:overflow-visible">
        <div v-for="group in NAV_GROUPS" :key="group.label" class="lg:mb-4">
          <p
            class="hidden px-2 pb-1.5 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase lg:block"
          >
            {{ group.label }}
          </p>
          <ul class="flex gap-1 lg:flex-col lg:gap-0.5">
            <li v-for="item in group.items" :key="item.to" class="shrink-0">
              <RouterLink
                :to="item.to"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors duration-150 hover:bg-surface-100 hover:text-heading focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                exact-active-class="bg-surface-100! text-primary-700! font-semibold"
              >
                <component :is="item.icon" class="size-[18px] shrink-0" aria-hidden="true" />
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>

      <div class="mt-auto hidden rounded-xl border border-border bg-surface-50 p-3 lg:block">
        <p class="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">Sistema</p>
        <p class="mt-1 text-sm font-semibold text-heading">Operación en línea</p>
        <p class="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <span class="size-1.5 rounded-full bg-success" aria-hidden="true" />
          5 módulos activos
        </p>
      </div>
    </aside>

    <div class="min-w-0">
      <main
        id="contenido"
        tabindex="-1"
        class="mx-auto w-full max-w-[90rem] px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8"
      >
        <slot />
      </main>
    </div>
  </div>
</template>

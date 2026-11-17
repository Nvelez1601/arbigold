import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import { type ComponentMountingOptions, flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import type { Component } from 'vue';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from '../../src/app/router.ts';
import { ArbiGoldPreset } from '../../src/app/theme/arbigold-preset.ts';

/**
 * Monta un componente con TODO lo que tiene la app real: router (en memoria), PrimeVue con el
 * preset, toasts, confirmaciones, vue-query (sin reintentos) y Pinia.
 */
export const mountWithApp = async <C extends Component>(
  component: C,
  options: ComponentMountingOptions<C> & { route?: string } = {},
) => {
  const router = createAppRouter(createMemoryHistory());
  await router.push(options.route ?? '/');
  await router.isReady();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = mount(component, {
    ...options,
    attachTo: document.body,
    global: {
      ...options.global,
      plugins: [
        router,
        createPinia(),
        [PrimeVue, { theme: { preset: ArbiGoldPreset } }],
        ToastService,
        ConfirmationService,
        [VueQueryPlugin, { queryClient }],
        ...(options.global?.plugins ?? []),
      ],
    },
  });
  await flushPromises();
  return { wrapper, router, queryClient };
};

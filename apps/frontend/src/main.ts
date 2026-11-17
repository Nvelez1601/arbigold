import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { createApp } from 'vue';
import App from './app/App.vue';
import { createAppRouter } from './app/router.ts';
import { ArbiGoldPreset } from './app/theme/arbigold-preset.ts';
import { PRIMEVUE_LOCALE_ES } from './app/theme/primevue-locale-es.ts';
import './app/styles.css';

createApp(App)
  .use(createAppRouter())
  .use(createPinia())
  .use(VueQueryPlugin)
  .use(PrimeVue, { theme: { preset: ArbiGoldPreset }, locale: PRIMEVUE_LOCALE_ES })
  .use(ToastService)
  .use(ConfirmationService)
  .mount('#app');

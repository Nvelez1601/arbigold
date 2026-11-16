import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { createApp } from 'vue';
import App from './app/App.vue';
import { ArbiGoldPreset } from './app/theme/arbigold-preset.ts';
import './app/styles.css';

createApp(App)
  .use(createPinia())
  .use(VueQueryPlugin)
  .use(PrimeVue, { theme: { preset: ArbiGoldPreset } })
  .mount('#app');

import Aura from '@primeuix/themes/aura';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { createApp } from 'vue';
import App from './app/App.vue';
import './app/styles.css';

createApp(App)
  .use(createPinia())
  .use(VueQueryPlugin)
  .use(PrimeVue, { theme: { preset: Aura } })
  .mount('#app');

import { createApp } from './infrastructure/app.ts';
import { loadEnv } from './infrastructure/config/env.ts';

const env = loadEnv();
createApp({ corsOrigins: env.CORS_ORIGINS }).listen(env.PORT, () => {
  process.stdout.write(`ArbiGold API escuchando en :${env.PORT}\n`);
});

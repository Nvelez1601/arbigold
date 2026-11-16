import { createApp } from './infrastructure/app.ts';
import { loadEnv } from './infrastructure/config/env.ts';

const env = loadEnv();
createApp({ corsOrigins: env.CORS_ORIGINS, trustProxy: env.TRUST_PROXY }).listen(env.PORT, () => {
  process.stdout.write(`ArbiGold API escuchando en :${env.PORT}\n`);
});

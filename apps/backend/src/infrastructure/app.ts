import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export interface AppOptions {
  readonly corsOrigins: readonly string[];
}

const BODY_LIMIT = '100kb';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 300;

/** Crea la app Express con los controles de seguridad base (instructions/security-compliance.md §4). */
export const createApp = ({ corsOrigins }: AppOptions): Express => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: [...corsOrigins], credentials: true }));
  app.use(rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, limit: RATE_LIMIT_MAX_REQUESTS }));
  app.use(express.json({ limit: BODY_LIMIT }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};

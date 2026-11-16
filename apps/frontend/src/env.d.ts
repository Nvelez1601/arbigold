/// <reference types="vite/client" />

/** Variables públicas del frontend (apps/frontend/.env.example). Nunca secretos. */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

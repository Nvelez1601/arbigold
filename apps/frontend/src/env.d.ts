/// <reference types="vite/client" />

/** Variables públicas del frontend (apps/frontend/.env.example). Nunca secretos. */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** 'demo' (datos en el navegador, por defecto) o 'api'. */
  readonly VITE_DATA_SOURCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

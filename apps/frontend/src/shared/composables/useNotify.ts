import { useToast } from 'primevue/usetoast';

/** Los avisos de éxito se van solos; los errores se quedan hasta cerrarlos porque piden una acción. */
export const SUCCESS_TOAST_LIFE_MS = 4000;

export type NotifySeverity = 'success' | 'error';

/** Avisos consistentes en todo el sistema (mismo tiempo de vida y misma regla para errores). */
export const useNotify = () => {
  const toast = useToast();
  return (severity: NotifySeverity, summary: string, detail: string) =>
    toast.add({
      severity,
      summary,
      detail,
      life: severity === 'success' ? SUCCESS_TOAST_LIFE_MS : undefined,
    });
};

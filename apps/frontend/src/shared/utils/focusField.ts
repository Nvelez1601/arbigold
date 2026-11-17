/**
 * Lleva el foco al elemento cuyo id corresponde al primer campo con error. Si no existe
 * (campo sin id registrado), enfoca el primer elemento focuseable del documento.
 */
export const focusFirstError = (
  fieldIds: Record<string, string>,
  field: string | null | undefined,
) => {
  const targetId = field ? fieldIds[field] : undefined;
  const target = targetId ? document.getElementById(targetId) : null;
  if (target) {
    target.focus();
    return;
  }
  document
    .querySelector<HTMLElement>('input, select, button, [tabindex]:not([tabindex="-1"])')
    ?.focus();
};

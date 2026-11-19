import { flushPromises } from '@vue/test-utils';

/**
 * Elige una opción abierta de un Select de PrimeVue como lo haría una persona.
 * PrimeVue 4 selecciona en `mousedown` (no en `click`): se disparan ambos eventos para que el
 * test no dependa de la versión.
 */
export const pickOption = async (label: string): Promise<void> => {
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!option) throw new Error(`No hay una opción "${label}" abierta`);
  option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  option.click();
  await flushPromises();
};

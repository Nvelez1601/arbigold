import { defaultOptions } from 'primevue/config';
import { describe, expect, it } from 'vitest';
import { PRIMEVUE_LOCALE_ES } from './primevue-locale-es.ts';

describe('locale de PrimeVue en español', () => {
  it('anuncia en español lo que el usuario oye o lee', () => {
    expect(PRIMEVUE_LOCALE_ES.aria.close).toBe('Cerrar');
    expect(PRIMEVUE_LOCALE_ES.accept).toBe('Sí');
    expect(PRIMEVUE_LOCALE_ES.monthNames[10]).toBe('noviembre');
    expect(PRIMEVUE_LOCALE_ES.firstDayOfWeek).toBe(1);
  });

  it('no deja claves sin valor: conserva todas las del locale por defecto', () => {
    const defaults = { ...defaultOptions.locale };
    expect(Object.keys(PRIMEVUE_LOCALE_ES)).toEqual(expect.arrayContaining(Object.keys(defaults)));
    expect(Object.keys(PRIMEVUE_LOCALE_ES.aria)).toEqual(
      expect.arrayContaining(Object.keys(defaults.aria ?? {})),
    );
  });
});

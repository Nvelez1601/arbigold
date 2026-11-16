import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { PRIMARY_SCALE, SURFACE_SCALE } from './palette.ts';

/**
 * Preset de PrimeVue con la paleta de ArbiGold sobre Aura.
 * Botón primario en primary.600 (baltic-blue, 7.5:1 con blanco); bordes de campos en
 * surface.400 (3.3:1, visibles según WCAG 1.4.11); texto en surface.700 (charcoal-blue).
 */
export const ArbiGoldPreset = definePreset(Aura, {
  semantic: {
    primary: {
      ...PRIMARY_SCALE,
      color: 'light-dark({primary.600}, {primary.300})',
      contrastColor: 'light-dark(#ffffff, {surface.950})',
      hoverColor: 'light-dark({primary.700}, {primary.200})',
      activeColor: 'light-dark({primary.800}, {primary.100})',
    },
    surface: SURFACE_SCALE,
    text: {
      color: 'light-dark({surface.700}, {surface.0})',
      hoverColor: 'light-dark({primary.900}, {surface.0})',
      mutedColor: 'light-dark({surface.500}, {surface.400})',
      hoverMutedColor: 'light-dark({surface.600}, {surface.300})',
    },
    formField: {
      borderColor: 'light-dark({surface.400}, {surface.600})',
      hoverBorderColor: 'light-dark({primary.500}, {surface.500})',
    },
    focusRing: { color: '{primary.500}' },
  },
});

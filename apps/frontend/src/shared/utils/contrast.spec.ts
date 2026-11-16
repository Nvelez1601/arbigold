import { describe, expect, it } from 'vitest';
import { WCAG_AA, contrastRatio, relativeLuminance } from './contrast.ts';

describe('contraste WCAG', () => {
  it('negro sobre blanco es el máximo (21:1) y un color contra sí mismo el mínimo (1:1)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#065a82', '#065a82')).toBe(1);
  });

  it('el orden de los colores no cambia el ratio', () => {
    expect(contrastRatio('#ffffff', '#065a82')).toBeCloseTo(contrastRatio('#065a82', '#ffffff'));
  });

  it('calcula ratios conocidos de la paleta', () => {
    expect(contrastRatio('#ffffff', '#065a82')).toBeCloseTo(7.52, 2);
    expect(contrastRatio('#9eb3c2', '#ffffff')).toBeCloseTo(2.17, 2);
  });

  it('acepta mayúsculas y rechaza formatos no soportados', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1);
    expect(() => relativeLuminance('#fff')).toThrow('Color inválido');
    expect(() => relativeLuminance('rgb(0,0,0)')).toThrow('Color inválido');
  });

  it('expone los mínimos AA', () => {
    expect(WCAG_AA).toEqual({ text: 4.5, largeText: 3, uiComponent: 3 });
  });
});

import { describe, expect, it } from 'vitest';
import { ArbiGoldPreset } from './arbigold-preset.ts';
import { BRAND, PRIMARY_SCALE, SURFACE_SCALE } from './palette.ts';

const semantic = ArbiGoldPreset.semantic as Record<string, Record<string, string>>;

describe('preset de PrimeVue', () => {
  it('usa la escala primaria de la paleta (botón en baltic-blue)', () => {
    expect(semantic['primary']?.['600']).toBe(BRAND.balticBlue);
    expect(semantic['primary']?.['color']).toBe('light-dark({primary.600}, {primary.300})');
    expect(semantic['primary']?.['hoverColor']).toContain('{primary.700}');
    expect(semantic['primary']).toMatchObject(PRIMARY_SCALE);
  });

  it('usa las superficies frías de la paleta y texto charcoal-blue', () => {
    expect(semantic['surface']).toMatchObject(SURFACE_SCALE);
    expect(semantic['text']?.['color']).toContain('{surface.700}');
  });

  it('los bordes de los campos son visibles (surface.400)', () => {
    expect(semantic['formField']?.['borderColor']).toContain('{surface.400}');
  });

  it('conserva el resto de Aura (componentes y primitivos)', () => {
    expect(ArbiGoldPreset.components).toBeDefined();
    expect(ArbiGoldPreset.primitive).toBeDefined();
  });
});

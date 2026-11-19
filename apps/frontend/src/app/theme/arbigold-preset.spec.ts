import { describe, expect, it } from 'vitest';
import { ArbiGoldPreset } from './arbigold-preset.ts';
import { BRAND, PRIMARY_SCALE, SURFACE_SCALE } from './palette.ts';

const semantic = ArbiGoldPreset.semantic as Record<string, Record<string, string>>;

describe('preset de PrimeVue', () => {
  it('usa la escala primaria de la paleta (botón en royal-violet)', () => {
    expect(semantic['primary']?.['600']).toBe(BRAND.royalViolet);
    expect(semantic['primary']?.['color']).toBe('light-dark({primary.600}, {primary.300})');
    expect(semantic['primary']?.['hoverColor']).toContain('{primary.700}');
    expect(semantic['primary']).toMatchObject(PRIMARY_SCALE);
  });

  it('usa las superficies lavanda de la paleta y texto surface.700', () => {
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

  it('los Tag info y contrast usan violetas de la paleta, no azul cielo ni negro', () => {
    const tag = (
      ArbiGoldPreset.components as Record<
        string,
        { colorScheme: { light: Record<string, Record<string, string>> } }
      >
    )['tag'];
    expect(tag?.colorScheme.light['info']).toEqual({
      background: '{primary.100}',
      color: '{primary.700}',
    });
    expect(tag?.colorScheme.light['contrast']).toEqual({
      background: '{primary.900}',
      color: '#ffffff',
    });
  });
});

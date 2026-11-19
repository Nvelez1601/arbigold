import { describe, expect, it } from 'vitest';
import { WCAG_AA, contrastRatio } from '../../shared/utils/contrast.ts';
import css from '../styles.css?raw';
import { BRAND, PRIMARY_SCALE, ROLES, STATUS, SURFACE_SCALE } from './palette.ts';

const cssToken = (name: string): string | undefined =>
  new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(css)?.[1]?.toLowerCase();

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('paleta de ArbiGold', () => {
  describe('contraste WCAG AA por rol', () => {
    it.each([
      ['títulos sobre el fondo', ROLES.heading, ROLES.background],
      ['texto sobre el fondo', ROLES.text, ROLES.background],
      ['texto sobre tarjetas', ROLES.text, ROLES.surface],
      ['texto sobre zonas secundarias', ROLES.text, ROLES.surfaceMuted],
      ['texto atenuado sobre el fondo', ROLES.textMuted, ROLES.background],
      ['texto atenuado sobre tarjetas', ROLES.textMuted, ROLES.surface],
      ['enlaces sobre el fondo', ROLES.link, ROLES.background],
      ['texto del botón primario', ROLES.onPrimary, ROLES.primary],
      ['texto del botón primario en hover', ROLES.onPrimary, ROLES.primaryHover],
      ['texto del botón secundario', ROLES.onPrimary, ROLES.secondary],
      ['texto blanco sobre el acento', ROLES.onPrimary, ROLES.accent],
    ])('%s cumple 4.5:1', (_rol, foreground, background) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(WCAG_AA.text);
    });

    it.each(Object.entries(STATUS))(
      'el estado %s es legible con texto blanco y como texto',
      (_s, color) => {
        expect(contrastRatio('#ffffff', color)).toBeGreaterThanOrEqual(WCAG_AA.text);
        expect(contrastRatio(color, ROLES.background)).toBeGreaterThanOrEqual(WCAG_AA.text);
      },
    );

    it('los Tag info (violeta sobre lavanda) y contrast (blanco sobre violeta) cumplen 4.5:1', () => {
      expect(contrastRatio(PRIMARY_SCALE[700], PRIMARY_SCALE[100])).toBeGreaterThanOrEqual(
        WCAG_AA.text,
      );
      expect(contrastRatio('#ffffff', PRIMARY_SCALE[900])).toBeGreaterThanOrEqual(WCAG_AA.text);
    });

    it('los bordes de campos y el anillo de foco se distinguen (≥ 3:1 sobre tarjetas)', () => {
      expect(contrastRatio(ROLES.borderStrong, ROLES.surface)).toBeGreaterThanOrEqual(
        WCAG_AA.uiComponent,
      );
      expect(contrastRatio(ROLES.focusRing, ROLES.surface)).toBeGreaterThanOrEqual(
        WCAG_AA.uiComponent,
      );
    });

    it('el blush y la línea lavanda no alcanzan para texto: quedan solo como detalle', () => {
      expect(contrastRatio(BRAND.blush, ROLES.surface)).toBeLessThan(WCAG_AA.text);
      expect(contrastRatio(BRAND.lavenderLine, ROLES.surface)).toBeLessThan(WCAG_AA.text);
    });
  });

  describe('styles.css es espejo de palette.ts', () => {
    it.each(Object.entries(BRAND))('marca %s', (name, hex) => {
      expect(cssToken(`brand-${kebab(name)}`)).toBe(hex);
    });

    it.each(Object.entries(PRIMARY_SCALE))('primary-%s', (step, hex) => {
      expect(cssToken(`primary-${step}`)).toBe(hex);
    });

    it.each(Object.entries(SURFACE_SCALE))('surface-%s', (step, hex) => {
      expect(cssToken(`surface-${step}`)).toBe(hex);
    });

    it.each(Object.entries(STATUS))('estado %s', (name, hex) => {
      expect(cssToken(name)).toBe(hex);
    });

    it.each([
      ['background', ROLES.background],
      ['heading', ROLES.heading],
      ['text', ROLES.text],
      ['muted', ROLES.textMuted],
      ['accent', ROLES.accent],
      ['border', ROLES.border],
      ['border-strong', ROLES.borderStrong],
    ])('rol %s', (name, hex) => {
      expect(cssToken(name)).toBe(hex);
    });
  });
});

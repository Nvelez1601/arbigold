/** Utilidades WCAG 2.x para verificar contraste de color (https://www.w3.org/TR/WCAG21/#contrast-minimum). */

const HEX_COLOR = /^#([0-9a-f]{6})$/i;

const channel = (value: number): number => {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

/** Luminancia relativa de un color #rrggbb. */
export const relativeLuminance = (hex: string): number => {
  const digits = HEX_COLOR.exec(hex)?.[1];
  if (!digits) throw new Error(`Color inválido: ${hex} (se espera #rrggbb)`);
  const value = Number.parseInt(digits, 16);
  const red = channel((value >> 16) & 255);
  const green = channel((value >> 8) & 255);
  const blue = channel(value & 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/** Ratio de contraste entre dos colores (1 a 21). */
export const contrastRatio = (foreground: string, background: string): number => {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/** Mínimos WCAG AA: texto normal 4.5, texto grande y componentes de UI 3. */
export const WCAG_AA = { text: 4.5, largeText: 3, uiComponent: 3 } as const;

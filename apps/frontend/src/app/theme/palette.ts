/**
 * Paleta de ArbiGold — fuente única de verdad de los colores (docs/design/paleta.md).
 * styles.css (Tailwind) y el preset de PrimeVue derivan de aquí; un spec verifica que no diverjan
 * y que cada rol cumple el contraste WCAG AA.
 *
 * Identidad: violeta profundo como color de acción, rosa orquídea como segundo acento y
 * superficies lavanda muy suaves. El degradado violeta→rosa es la firma de la marca.
 */

/** Colores de marca. */
export const BRAND = {
  royalViolet: '#6d3fd1',
  deepViolet: '#4b2a9b',
  midnightViolet: '#2a1b3d',
  orchid: '#e8579b',
  blush: '#fde8f2',
  lavender: '#f3eefb',
  lavenderLine: '#e8e1f4',
  violetMist: '#faf8fd',
  slateViolet: '#766a8c',
  roseShadow: '#c23f80',
  iris: '#6b4a9e',
} as const;

/** Escala primaria (componentes): anclada en la paleta, de claro (50) a oscuro (950). */
export const PRIMARY_SCALE = {
  50: '#f6f1fe',
  100: '#ede2fd',
  200: '#dcc8fa',
  300: '#c3a4f5',
  400: '#a878ee',
  500: '#8a4bd8',
  600: BRAND.royalViolet,
  700: '#5a31b8',
  800: BRAND.deepViolet,
  900: '#3a2177',
  950: '#24134d',
} as const;

/** Escala de superficies y texto: lavandas cálidas de blanco a violeta medianoche (900). */
export const SURFACE_SCALE = {
  0: '#ffffff',
  50: BRAND.violetMist,
  100: BRAND.lavender,
  200: BRAND.lavenderLine,
  300: '#d5cbe6',
  400: '#9483b2',
  500: BRAND.slateViolet,
  600: '#5f546f',
  700: '#4a3f58',
  800: '#382f45',
  900: BRAND.midnightViolet,
  950: '#1d1229',
} as const;

/** Estados (saldos, alertas). Armonizados con la paleta y ≥ 4.5:1 con blanco y con el fondo. */
export const STATUS = {
  success: '#0f7350',
  warning: '#8a5600',
  danger: '#c23450',
  info: BRAND.royalViolet,
} as const;

/**
 * Roles: claros para fondos, oscuros para texto, medios para componentes,
 * opuestos para detalles (degradados, bordes, acentos).
 */
export const ROLES = {
  background: SURFACE_SCALE[50],
  surface: SURFACE_SCALE[0],
  surfaceMuted: BRAND.lavender,
  heading: BRAND.midnightViolet,
  text: SURFACE_SCALE[700],
  textMuted: SURFACE_SCALE[500],
  primary: BRAND.royalViolet,
  primaryHover: BRAND.deepViolet,
  primaryActive: PRIMARY_SCALE[900],
  onPrimary: '#ffffff',
  secondary: BRAND.roseShadow,
  accent: BRAND.iris,
  link: BRAND.royalViolet,
  border: BRAND.lavenderLine,
  borderStrong: SURFACE_SCALE[400],
  focusRing: BRAND.royalViolet,
} as const;

/** Degradado firma de la marca: violeta profundo → violeta → rosa orquídea. */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${PRIMARY_SCALE[700]}, ${BRAND.royalViolet} 55%, ${BRAND.orchid})`;

/** Rosa suave para superficies destacadas del segundo acento. */
export const PINK_SOFT = BRAND.blush;

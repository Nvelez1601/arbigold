/**
 * Paleta de ArbiGold — fuente única de verdad de los colores (docs/design/paleta.md).
 * styles.css (Tailwind) y el preset de PrimeVue derivan de aquí; un spec verifica que no diverjan
 * y que cada rol cumple el contraste WCAG AA.
 */

/** Colores de marca, tal como los definió el negocio. */
export const BRAND = {
  spaceIndigo: '#21295c',
  regalNavy: '#1b3b6f',
  balticBlue: '#065a82',
  cerulean: '#1c7293',
  powderBlue: '#9eb3c2',
  yaleBlue: '#173b5e',
  steelBlue: '#6f9db8',
  aliceBlue: '#d7e4e8',
  dustyLavender: '#806d91',
  charcoalBlue: '#3d414a',
} as const;

/** Escala primaria (componentes): anclada en la paleta, de claro (50) a oscuro (950). */
export const PRIMARY_SCALE = {
  50: '#f0f5f8',
  100: BRAND.aliceBlue,
  200: BRAND.powderBlue,
  300: BRAND.steelBlue,
  400: '#4688a6',
  500: BRAND.cerulean,
  600: BRAND.balticBlue,
  700: BRAND.regalNavy,
  800: BRAND.yaleBlue,
  900: BRAND.spaceIndigo,
  950: '#151b3c',
} as const;

/** Escala de superficies y texto: fríos, de blanco a charcoal-blue (700). */
export const SURFACE_SCALE = {
  0: '#ffffff',
  50: '#eff4f6',
  100: '#e5edf0',
  200: BRAND.aliceBlue,
  300: '#b0bbc0',
  400: '#878f96',
  500: '#686f76',
  600: '#535860',
  700: BRAND.charcoalBlue,
  800: '#2f3553',
  900: '#282a30',
  950: '#181a1e',
} as const;

/** Estados (saldos, alertas). No vienen en la paleta: armonizados y ≥ 4.5:1 con blanco. */
export const STATUS = {
  success: '#1f7a57',
  warning: '#9a5b00',
  danger: '#b42332',
  info: BRAND.balticBlue,
} as const;

/**
 * Roles: claros para fondos, oscuros para texto, medios para componentes,
 * opuestos para detalles (degradados, bordes, acentos).
 */
export const ROLES = {
  background: SURFACE_SCALE[50],
  surface: SURFACE_SCALE[0],
  surfaceMuted: BRAND.aliceBlue,
  heading: BRAND.spaceIndigo,
  text: BRAND.charcoalBlue,
  textMuted: SURFACE_SCALE[500],
  primary: BRAND.balticBlue,
  primaryHover: BRAND.regalNavy,
  primaryActive: BRAND.yaleBlue,
  onPrimary: '#ffffff',
  secondary: BRAND.cerulean,
  accent: BRAND.dustyLavender,
  link: BRAND.balticBlue,
  border: BRAND.powderBlue,
  borderStrong: SURFACE_SCALE[400],
  focusRing: BRAND.cerulean,
} as const;

/** Degradado de detalle para encabezados y elementos destacados. */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND.spaceIndigo}, ${BRAND.regalNavy}, ${BRAND.balticBlue}, ${BRAND.cerulean})`;

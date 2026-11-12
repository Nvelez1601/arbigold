// Lista CERRADA de exenciones del principio de specs (instructions/testing.md, sección 2).
// Agregar una entrada requiere aprobación explícita en el PR.

/** Raíces donde todo archivo ejecutable debe tener spec. */
export const SOURCE_ROOTS = [/^apps\/[^/]+\/src\//, /^packages\/[^/]+\/src\//, /^scripts\/lib\//];

/** Extensiones de archivos ejecutables. */
export const SOURCE_EXTENSIONS = ['.ts', '.vue', '.mjs'];

/** Archivos que son specs (nunca requieren spec propio). */
export const SPEC_SUFFIXES = ['.int.spec.ts', '.spec.ts', '.contract.ts', '.spec.mjs'];

/** Exentos: bootstrap, solo tipos, declaraciones y puertos (cubiertos por su *.contract.ts). */
export const EXEMPT_PATTERNS = [
  /\.d\.ts$/,
  /\/main\.ts$/,
  /\/server\.ts$/,
  /\.port\.ts$/,
  /\.types\.ts$/,
];

/** Archivos que solo se aceptan con spec de INTEGRACIÓN (DB real o HTTP real). */
export const INTEGRATION_ONLY_PATTERNS = [
  /\.repository\.ts$/,
  /\.routes\.ts$/,
  /\.controller\.ts$/,
  /\/infrastructure\/app\.ts$/,
];

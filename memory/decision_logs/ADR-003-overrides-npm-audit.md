# ADR-003 — Overrides de npm para avisos de `npm audit`

- **Fecha:** 2026-11-16
- **Estado:** Aceptado (temporal: se revierte cuando upstream publique las correcciones)
- **Control:** ISO 27001 A.8.8 / SOC 2 CC7.1 (gestión de vulnerabilidades técnicas)

## Análisis

`npm audit` reportaba 11 entradas de severidad moderada, todas en dependencias de **desarrollo**
(producción: 0). Salían de dos avisos de fondo:

| Aviso                                                                                                                        | Paquete                               | Llega por                                                                                                        | Explotabilidad en ArbiGold                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) — DoS por amplificación de globparts                | `minimatch` ≥7 <11.0.1 (había 10.2.6) | `typescript-eslint` → `@typescript-eslint/typescript-estree`; `@vue/test-utils` → `js-beautify` → `editorconfig` | Baja: los patrones vienen de nuestra config, no de un atacante. Solo corre en tooling local y CI |
| [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) — bypass de AbortSignal en el recorrido de archivos | `glob` ≥9 ≤14.0.1 (había 13.0.7)      | `@vue/test-utils` → `js-beautify`                                                                                | Baja: solo tooling de tests                                                                      |

Las versiones publicadas más recientes de `typescript-eslint` (8.72.2) y `js-beautify` (2.0.3) **todavía**
declaran `minimatch ^10` y `glob ^13`, así que actualizar no lo resuelve. La sugerencia de `npm audit fix`
era _bajar_ `typescript-eslint` a 8.36.0 y `@vue/test-utils` a 2.4.11: se descartó por ser downgrades.

## Decisión

`overrides` **acotados** en el `package.json` raíz: se fuerzan las versiones corregidas solo dentro de los
paquetes que traen las vulnerables, sin tocar el `minimatch@3` que usa ESLint (fuera del rango y con otra API):

```json
"overrides": {
  "@typescript-eslint/typescript-estree": { "minimatch": "^11.0.8" },
  "editorconfig": { "minimatch": "^11.0.8" },
  "js-beautify": { "glob": "^14.0.6" }
}
```

`@vue/test-utils` se movió de `apps/frontend` a las devDependencies de la **raíz**. npm 11 no propaga los
overrides de la raíz a través del enlace de un workspace, y editar el lockfile a mano hacía que npm
**omitiera** `js-beautify` sin reportarlo como faltante: el audit daba un falso "0 vulnerabilidades" con la
instalación rota. Desde la raíz, el override se aplica y el frontend lo resuelve igual (hoisting).

## Verificación

- `npm audit`: 0 vulnerabilidades. `npm ls`: sin paquetes faltantes ni inválidos.
- Smoke test de uso real: `js-beautify.html`, `editorconfig.parse`, `glob.globSync` y `wrapper.html()` de test-utils.
- `npm run verify` completo en verde (el lint ejercita `typescript-estree` con `minimatch@11`).

## Cuándo revertir

Cuando `typescript-eslint` y `js-beautify` publiquen versiones con `minimatch ≥11.0.1` / `glob ≥14.0.2`:
quitar la entrada correspondiente de `overrides` y verificar con `npm audit` + `npm run verify`.

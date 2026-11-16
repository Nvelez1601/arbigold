# ADR-004 — Migración a Node.js 26 LTS

- **Fecha:** 2026-11-16
- **Estado:** Aceptado (actualiza el runtime de ADR-001)

## Contexto

El repo estaba en Node 24 (`.nvmrc`), pero en la práctica corría código en Node 20:

- **Hooks de git:** heredaban el Node de la shell. En la máquina de desarrollo es el `/usr/bin/node` v20 del sistema, porque nvm no tiene un `default`.
- **CI:** `actions/checkout@v4` y `gitleaks-action@v2` declaraban el runtime `node20`, que GitHub quitó de sus runners el 2026-09-16 (hoy se ejecutan forzadas sobre Node 24, con aviso).

Node 26 es **LTS "Lithium"** desde la 26.13.0 (2026-10-28), con soporte hasta 2029.

## Decisión

| Pieza                  | Antes                                                         | Después                                                                                                          |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `.nvmrc`               | `24`                                                          | `26` (hoy 26.13.1, npm 11.20)                                                                                    |
| `engines`              | `node >=24 <25`, `npm >=10`                                   | `node >=26 <27`, `npm >=11`                                                                                      |
| `@types/node`          | 24.x                                                          | 26.x (deduplicado: una sola copia en el árbol)                                                                   |
| `tsconfig.base.json`   | `target`/`lib` ES2023                                         | ES2025 (Node 26 lo soporta completo). El frontend mantiene su `lib` de navegador                                 |
| Hooks de git           | Node de la shell                                              | `.husky/node-env.sh` antepone al PATH la v26.x más nueva de nvm y falla con un mensaje claro si no está          |
| CI                     | `checkout@v4`, `setup-node@v4`, `gitleaks-action@v2` (node20) | `checkout@v7`, `setup-node@v7`, `gitleaks-action@v3` (node24); el job usa Node 26 vía `.nvmrc`                   |
| Scripts de instalación | Se ejecutaban siempre                                         | npm 11.20 los bloquea por defecto: `allowScripts` deniega `esbuild` y `vue-demi` (verificado que no hacen falta) |

## Verificación

- Los 374 paquetes con `engines.node` aceptan 26.13.1 (chequeo con `semver`); 0 incompatibles.
- Instalación limpia con `npm ci` bajo Node 26: 0 paquetes faltantes y 0 vulnerabilidades.
- Funciona sin los install scripts: esbuild compila TS, vue-demi detecta Vue 3, y `vite build` y `npm run verify` pasan completos.
- Hooks probados con el Node 20 del sistema primero en el PATH: el hook usa v26.13.1. Con una versión inexistente en `.nvmrc`, falla con un mensaje.

## Consecuencias

- Para trabajar en el repo hace falta `nvm install 26`. No hace falta tocar el `default` global de nvm (otros proyectos pueden seguir en su versión).
- Una dependencia nueva con `postinstall` dispara el aviso `install-scripts`: se revisa y se aprueba o deniega en `allowScripts`, con justificación en el commit.

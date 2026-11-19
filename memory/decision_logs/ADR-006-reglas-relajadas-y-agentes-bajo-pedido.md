# ADR-006 — Reglas de calidad relajadas y agentes solo bajo pedido

- **Fecha:** 2026-11-19
- **Estado:** Aceptado (modifica límites de `instructions/clean-code.md`, la Regla 2 de `instructions/testing.md` y el uso de las skills de orquestación de ADR-002)
- **Decisores:** Nelson Vélez (owner)

## Contexto

El rediseño del frontend consumió varias sesiones y agentes. Lo encareció el ciclo de las reglas automáticas, no el trabajo pedido:

- **Límite de 250 líneas por archivo:** obligaba a recortar línea por línea.
- **Regla 2 al 100 % de sentencias, funciones y ramas:** bloqueaba el push por ramas defensivas.
- **Orquestación con minions y peer review:** se aplicaba también a cambios chicos.

## Decisión

| Regla                                | Antes                                         | Ahora                                                                   |
| ------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------- |
| Líneas por archivo (fuente / specs)  | 250 / 500                                     | **400 / 800**                                                           |
| Líneas por función                   | 30                                            | **50**                                                                  |
| Parámetros por función               | 3                                             | **4**                                                                   |
| Anidamiento                          | 2                                             | **3**                                                                   |
| Complejidad ciclomática              | 8                                             | **12**                                                                  |
| Regla 2 (cobertura del diff)         | 100 % de sentencias, funciones y ramas nuevas | **≥ 80 % de las sentencias nuevas por archivo** (las ramas no bloquean) |
| Regla 1 (cobertura por archivo)      | ≥ 80 %, dominio ≥ 95 %                        | sin cambios                                                             |
| Skills de orquestación / peer review | se usaban por iniciativa del agente           | **solo si el usuario los pide o acepta tras preguntarle**               |

## Consecuencias

- Menos ciclos de recortes y de tests de ramas sin valor. La calidad se sostiene con la Regla 1, el lint, el typecheck y el gate de specs.
- Si un archivo se acerca a 400 líneas, se extrae un componente o composable con sentido; no se comprime el formato.
- Antes de usar minions o peer review, el agente pregunta y estima el costo (`AGENTS.md`).

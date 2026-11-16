# Plantilla del prompt del agente de análisis

Prompt completo pero mínimo: todo lo que el agente necesita y nada del historial de la
sesión. Rellena `{...}` y despacha con `arbigold-reviewer`. El agente es de **solo lectura**.

## Estructura del prompt

```
Eres un {rol de la tabla de ruteo} revisando el área "{área}" de ArbiGold
(ERP de intermediación de oro). Rango: {DESDE}..{HASTA} (o: working tree sobre HEAD {sha}).
Todo tu output es en español.

RESTRICCIONES DURAS:
- NO edites archivos, NO commitees, NO hagas checkout ni muevas el working tree.
  Solo lectura: git show, git diff, git log, git grep, rg.
- NO despaches sub-agentes.
- Tu respuesta final es un artefacto de datos (el REPORTE), no un mensaje conversacional.

ARCHIVOS DE TU ÁREA:
{lista de archivos del alcance para esta área}

HALLAZGOS YA DESCARTADOS POR EL HUMANO (no los re-reportes):
{huellas de estado.json, o "ninguno"}

PASOS:
1. Lee las normas POR REFERENCIA antes de opinar: AGENTS.md y {normas de la tabla}.
   Un hallazgo que contradice una norma documentada es un falso positivo.
2. Carga del catálogo (.agents/skills/arbigold-orquestador-reviews/references/
   catalogo-riesgos.md) las secciones {secciones}.
3. Por cada archivo: git diff {DESDE} {HASTA} -- <ruta> para ver el cambio, y
   git show "{HASTA}:<ruta>" para el archivo completo  ← SIEMPRE con llaves y comillas.
   Lee también su spec (*.spec.ts / *.int.spec.ts): ¿prueba el contrato?
4. Antes de afirmar que algo "no existe": git grep en el árbol de {HASTA}.
5. Verifica CADA hallazgo contra el código real. Si depende de algo que no puedes
   ver (datos reales, config de Supabase en la nube), dilo como Condición; no lo asumas.

REPORTE (formato de salida):
- Resumen del área (1-3 párrafos): qué cambió y qué riesgo concentra.
- Hallazgos, un bloque por problema:
    Severidad: 🔴 Bloqueante | 🟠 Mayor | 🟡 Menor | 🟢 Nota
    Huella: <archivo>#<título corto en kebab-case>
    Archivo: <ruta>   Línea: <n en {HASTA}>
    Título: <una línea>
    Evidencia: <cita del código>
    Impacto: <qué sale mal, en términos de negocio: dinero, datos, acceso>
    Condición: <cuándo ocurre>
    Norma: <instructions/x.md §y, si viola una norma> 
    Recomendación: <el fix mínimo + el test que lo demuestra>
    Confianza: alta | media | baja
  Sin archivo, línea, condición e impacto concreto, el candidato NO es reportable.
- Walkthrough: archivos verificados sin hallazgos.
- Si algo te bloquea o falta contexto: devuelve "blocked" con el motivo. No inventes.
```

## Variante: refutador de 🔴

```
Tu tarea es REFUTAR este hallazgo contra el código real de {HASTA}:
{bloque completo del hallazgo}
Busca la guarda, validación, constraint de DB, política RLS o test que lo impide.
Responde: REFUTADO (con la evidencia archivo:línea), CONFIRMADO (con la reproducción
mental paso a paso) o DEGRADAR A <severidad> (con el motivo). Solo lectura.
```

## Variante: eje Spec (si hay plan en memory/plans/)

```
Compara el cambio {DESDE}..{HASTA} contra el plan {ruta del plan}. Reporta:
(a) requisitos del plan faltantes o parciales; (b) comportamiento que el plan no pidió
(alcance de más); (c) requisitos que parecen implementados pero mal. Cita la línea del
plan en cada punto. Menos de 400 palabras. Solo lectura.
```

## Formato del informe consolidado (lo arma el orquestador)

```markdown
# Review ArbiGold — {fecha} · {DESDE7}..{HASTA7}

**Alcance:** {n} commits · {n} archivos · áreas: {lista, ⚠ en críticas}
**Veredicto:** {LISTO PARA PUSH | CORREGIR ANTES DE PUSH (n 🔴) | CON OBSERVACIONES}

## Hallazgos
### 🔴 Bloqueantes
### 🟠 Mayores
### 🟡 Menores
### 🟢 Notas
(cada uno con los campos del REPORTE + "Refutador: confirmado/degradado")

## Eje Spec (si corrió)

## Walkthrough (verificado sin hallazgos)

## No revisado
{área — motivo}

<!-- review-state: {"desde":"…","hasta":"…","hallazgos":["huella", …]} -->
```

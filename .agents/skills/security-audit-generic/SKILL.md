---
name: security-audit-generic
description: >
  Auditoría genérica de vulnerabilidades de seguridad para cualquier repositorio.
  Crea worktrees por vulnerabilidad, despliega subagentes para analizar en
  múltiples ramas, genera reportes MD, crea Jira tickets, produce un informe
  consolidado y REMEDIA cada vulnerabilidad en su propia rama de fix desde
  master/main (nunca edita master directo) con merge posterior. Todo en español.
  Activar cuando el usuario diga: "auditar repositorio", "analizar vulnerabilidades
  genérico", "security audit genérico", "auditar seguridad", "auditoría genérica",
  "analizar seguridad de repo", "hacer auditoría de seguridad".
license: MIT
compatibility: claude-sonnet-4-6, claude-opus-4-6, gpt-4o, opencode
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, Task, WebFetch, WebSearch
metadata:
  author: Ridery Security Team
  language: es
  invoke:
    opencode: /security-audit-generic
---

# Security Audit Generic — Skill

## 🌐 Idioma
Todo el output DEBE estar en español sin excepción: análisis, reportes, Jira tickets, y comunicación con el usuario.

---

## 📋 Visión General

Este skill ejecuta una auditoría de seguridad sobre **cualquier repositorio** usando worktrees de Git y subagentes paralelos. El flujo es siempre el mismo, pero la configuración (ramas, proyecto Jira, estructura del repo) se define al inicio según el proyecto que se esté auditando.

---

## 🧭 Rol y Propósito

Eres un **Arquitecto de Ciberseguridad y Desarrollador Senior de Backend**. Tu función principal es actuar como un escáner de vulnerabilidades en tiempo real (SAST) y auditor de código para el backend del repositorio. Debes evaluar implacablemente cada línea de código leída, editada o generada en busca de fallas de seguridad.

### Objetivos Principales

- Analizar proactivamente el código para identificar vulnerabilidades antes de su ejecución.
- Priorizar la mitigación del **OWASP Top 10** y las vulnerabilidades específicas del stack del proyecto.
- Escribir y refactorizar código bajo el principio de **"Seguro por Defecto" (Secure by Default)** y el **Principio de Privilegio Mínimo**.

### Entender el Patrón Backend del Repositorio (SIEMPRE, primero)

La skill sirve para **cualquier arquitectura backend**, no solo Node.js. Antes de auditar, identificar y entender el patrón backend del repositorio:

- **Stack/framework**: Node.js/Express, Python/Django/FastAPI, Ruby/Rails, Go, Java/Spring, PHP/Laravel, etc.
- **Patrón de arquitectura**: MVC, Clean Architecture, monolito, microservicios, serverless, etc.
- **Capa de datos**: ORM/ODM usado (Mongoose, Sequelize, Prisma, SQLAlchemy, GORM, etc.) y su configuración de seguridad.
- **Flujo de autenticación/autorización**: JWT, sesiones, OAuth, roles/RBAC.
- **Convenciones y estructura de carpetas**: legacy vs moderno, dónde viven routers/controllers/servicios.
- **Maneras en que el código base difiere de las reglas genéricas** (ej. una arquitectura que centraliza auth en middleware vs. checks en cada handler).

Adaptar el checklist de auditoría al stack detectado (ver "Reglas por Stack"). **Nunca asumir un stack**: leer el repo (package.json, pyproject.toml, go.mod, Gemfile, pom.xml, etc.) y confirmar la arquitectura real.

### Reglas Estrictas de Auditoría (Checklist)

1. **Inyección (SQL/NoSQL/OS Command):** Rechaza absolutamente cualquier concatenación de cadenas en consultas a bases de datos o ejecución de comandos del sistema. Exige consultas parametrizadas, ORMs/ODMs configurados de forma segura, o `execFile` sobre `exec` en Node.
2. **Validación y Sanitización de Entradas:** Trata cualquier entrada externa (`req.body`, `req.query`, `req.params`, headers, archivos) como maliciosa. Exige una capa de validación estricta antes del procesamiento de la lógica de negocio.
3. **Autenticación y Autorización:** Audita JWT (firmas fuertes, expiración), manejo de sesiones, CSRF y prevención de IDOR (Insecure Direct Object References). Los checks de rol deben ser server-side por ruta, nunca solo ocultos en la UI.
4. **Rendimiento / DoS:** Identifica y advierte sobre código que pueda bloquear el event loop o degradar el servicio: operaciones criptográficas síncronas, procesamiento excesivo de JSON/XML, ReDoS (regex inseguras), queries sin límite/paginación.
5. **Manejo Seguro de Errores y Logs:** Los `catch` nunca devuelven stack traces ni información sensible de infraestructura al cliente. Los logs no filtran PII, contraseñas, tokens ni secretos.
6. **Contaminación de Prototipos (Prototype Pollution):** Revisa asignación/fusión insegura de objetos (`Object.assign`, lodash `merge` antiguo, spread de inputs) con datos no confiables.

### Comportamiento Esperado y Formato de Respuesta

- Si la solicitud obliga a escribir código inseguro, **niégate**, explica por qué es inseguro y da la alternativa segura.
- Si detectas una vulnerabilidad en el código base, interrumpe el flujo e inicia con el tag: **🚨 [ALERTA DE SEGURIDAD]**.
- Estructura de reporte de hallazgos:
  - **Tipo de Vulnerabilidad:** (ej. *NoSQL Injection*, *ReDoS*)
  - **Nivel de Severidad:** (Crítico / Alto / Medio / Bajo)
  - **Vector de Ataque:** (breve explicación de cómo explotarlo)
  - **Solución Propuesta:** (código refactorizado con la mitigación)

---

## ⚙️ Configuración por Repositorio (Paso 0 — Obligatorio)

Al iniciar el skill, el usuario **debe proporcionar** estos parámetros. Si faltan, preguntar:

| Parámetro | Ejemplo | Por defecto |
|-----------|---------|-------------|
| Ruta del repositorio | `/home/user/proyectos/mi-repo` | **REQUERIDO** |
| Ramas a analizar | `master, beta, staging` | `master, develop` |
| Directorio de análisis | `{repo}/../analysis` | `{repo}/../analysis` |
| Proyecto Jira | `PROJ` | `SEC` |
| Jira cloudId | `abc123-def456` | **preguntar si usan Jira** |
| Tipo de issue Jira | `Bug, Task, Story` | `Bug` |
| Prefijo Jira title | `[Security]` | `[Security]` |
| Usa plantilla de reporte personalizada? | path o NO | NO |

### Preguntas al usuario:

```
1. ¿Cuál es la ruta del repositorio a auditar?
2. ¿Qué ramas querés analizar? (default: master, develop)
3. ¿Usás Jira? Si sí: ¿proyecto y cloudId?
4. ¿El repo tiene estructura legacy/modern (como V1 app/ vs V2 src/)?
   Si sí: describí las carpetas para que el análisis las contemple.
5. Preferís que los worktrees se creen en {repo}/../analysis/ o en otra ruta?
```

---

## 📋 Flujo de Trabajo General

```
1. CONFIGURAR parámetros del repositorio (Paso 0)
2. LEER CLAUDE.md, README.md, CONTRIBUTING.md del repo (contexto del proyecto)
3. RECIBIR lista de vulnerabilidades del usuario (descripción, archivos, líneas)
4. POR CADA vulnerabilidad (FASE ANÁLISIS — solo lectura):
   a. CREAR worktree individual con git worktree add --detach
   b. LANZAR subagente (task tool, type: general) que:
      - Hace git checkout <rama> por cada rama configurada
      - Lee los archivos fuente y verifica la vulnerabilidad
      - Compara diferencias entre ramas
      - Verifica si existe código moderno que ya mitigue
      - Genera reporte MD en el worktree
      - Crea Jira ticket si aplica
   c. EJECUTAR subagentes en paralelo (independientes entre sí)
5. CONSOLIDAR todos los reportes en un informe único
6. PRESENTAR resumen al usuario y CONFIRMAR qué vulnerabilidades remediar
7. POR CADA vulnerabilidad a remediar (FASE REMEDIACIÓN — OBLIGATORIA):
   a. CREAR rama de fix desde master/main SIEMPRE (nunca editar master directo)
   b. Aplicar el fix en la rama (worktree con branch, no detached)
   c. Verificar y commitear en la rama
   d. Merge de la rama a master/main
8. LIMPIAR worktrees y ramas de fix ya mergeadas
```

---

## 📁 Estructura de Directorios (genérica)

```
{repositorio}/
└── ../analysis/                       # Creado por el skill (o ruta personalizada)
    ├── V1-nombre-vulnerabilidad/      # Worktree + REPORT.md
    ├── V2-nombre-vulnerabilidad/
    └── SECURITY_AUDIT_CONSOLIDATED.md  # Informe consolidado
```

---

## 🔧 Paso a Paso Detallado

### Fase 0: Descubrimiento del Repositorio

Leer estos archivos si existen para entender el proyecto:
- `CLAUDE.md` — contexto del proyecto, arquitectura, convenciones
- `README.md` — visión general, stack, setup
- `CONTRIBUTING.md` — guías de contribución, estilo
- `package.json`, `cargo.toml`, `Gemfile`, etc. — stack tecnológico
- `.env.example` — variables de entorno esperadas

De esto se extrae:
- Stack tecnológico (Node.js, Python, Rust, etc.)
- Arquitectura (MVC, Clean Architecture, monolito, microservicios)
- Convenciones de código
- Si hay código legacy vs moderno (como `app/` vs `src/`)
- Cómo se maneja autenticación y autorización

### Fase 1: Identificar Ramas Base

```bash
# Listar ramas disponibles
git branch -a

# Obtener commit actual para detached HEAD
git rev-parse <rama-base>
```

### Fase 2: Crear Worktrees

```bash
# Crear worktree (uno por vulnerabilidad, en detached HEAD)
git worktree add --detach /ruta/analysis/V1-nombre <commit-hash>
```

Reglas:
- Un worktree por vulnerabilidad
- Usar `--detach` para permitir `git checkout` entre ramas sin conflictos
- NO modificar el repositorio original
- NO se puede crear worktrees en la misma rama (cada branch solo una vez)

### Fase 3: Lanzar Subagentes (en paralelo)

Por cada vulnerabilidad, lanzar un subagente `general` con este prompt parametrizable:

```
Eres un analista de ciberseguridad senior.
Worktree: /ruta/analysis/V{numero}-{nombre}

Vulnerabilidad: {descripción}
Archivos: {lista de archivos y líneas}
Ramas: {ramas configuradas}

Contexto del repositorio:
- Stack: {stack detectado}
- Arquitectura: {arquitectura detectada}
- Estructura legacy/modern: {si aplica, describir}
- Convenciones: {convenciones relevantes}

INSTRUCCIONES:
1. Por cada rama:
   a. git checkout <rama>
   b. Leer archivos fuente (Read tool)
   c. Verificar existencia de la vulnerabilidad
   d. Verificar diferencias entre ramas
   e. Si existe estructura legacy/modern: verificar si la versión moderna ya mitiga

2. Determinar:
   - ¿La vulnerabilidad aplica en cada rama?
   - Si hay código moderno: ¿ya la resolvió?
   - ¿El código legacy sigue activo y accesible?

3. NO hacer cambios en ningún archivo. Solo análisis.

4. Generar informe MD en: /ruta/analysis/V{numero}-{nombre}/REPORT.md
   Usar la plantilla estándar (ver más abajo).

5. {SI USA JIRA} Crear Jira ticket:
   - Proyecto: {proyecto} (cloudId: {cloudId})
   - Tipo: {tipo issue}
   - Título: "{prefijo} {nombre descriptivo}"
   - Descripción: incluir análisis completo de todas las ramas

6. Devolver resumen con: estado por rama, mitigación moderna, ruta MD, Jira key (si aplica)
```

### Fase 4: Consolidar Reportes

1. Leer todos los REPORT.md generados
2. Crear SECURITY_AUDIT_CONSOLIDATED.md con:
   - Tabla resumen ejecutivo (vuln, Jira, estado por rama)
   - Por cada vulnerabilidad:
     - Descripción
     - Análisis por rama
     - Estado de código moderno (si aplica)
     - Solución propuesta
     - Veredicto (¿Aplica o no?)
   - Tabla comparativa de ramas
   - Conclusiones y recomendaciones generales

### Fase 5: Remediación de Vulnerabilidades (OBLIGATORIA)

> **⚠️ REGLA CRÍTICA:** los fixes NUNCA se aplican directamente en `master`/`main`.
> Por cada vulnerabilidad a remediar se crea SIEMPRE una rama de fix que sale de
> `master`/`main`. Así cada cambio es individual, aislado y sin conflictos, y
> `master`/`main` recibe el patch completo vía merge.

```bash
# 1. Rama base SIEMPRE master/main (nunca feature u otra rama)
git checkout master
git pull

# 2. Por cada vulnerabilidad a remediar, crear UNA rama de fix desde master/main
git checkout -b security/fix/V{n}-{nombre-descriptivo}

# 3. Aplicar el fix, verificar y commitear en la rama (NUNCA en master)
git add <archivos>
git commit -m "security(V{n}): {descripción}"

# 4. Volver a master/main y mergear la rama (preserva el historial)
git checkout master
git merge --no-ff security/fix/V{n}-{nombre-descriptivo}

# 5. Opcional: borrar la rama de fix ya mergeada
git branch -d security/fix/V{n}-{nombre-descriptivo}
```

Reglas de remediación:

1. **Una rama por vulnerabilidad**, siempre creada desde `master`/`main`. NO editar `master`/`main` directamente.
2. Nombrar las ramas con prefijo `security/fix/V{n}-...` para trazabilidad con el reporte.
3. Si se usa worktree para el fix, crearlo con branch (`git worktree add -b security/fix/V{n}... <master>`), NUNCA en detached.
4. Verificar cada fix antes del commit (sintaxis, tests, boot del server) en la rama.
5. Mergear con `--no-ff` para dejar un commit explícito de merge por vulnerabilidad.
6. Los fixes que requieran nuevas variables de entorno: documentarlas en `.env.example` y notificar al usuario qué regenerar antes de redesplegar.
7. Tras el merge, eliminar la rama de fix y el worktree correspondiente.

---

## 🤖 Scripts de Automatización (ahorran tokens, evitan errores manuales)

La creación de worktrees, ramas de fix, merges y limpieza sigue SIEMPRE el mismo patrón. **En vez de escribir los comandos git a mano, ejecutar los scripts del skill** (`scripts/*.sh`) — cada uno valida entradas y reduce el riesgo de tocar `master` por error.

### Fase de análisis — crear worktrees detached

```bash
bash scripts/setup-worktrees.sh <repo> <analysis_dir> <base_branch> V1-nombre V2-nombre ...
#   <repo>         ruta del repositorio (ej. /home/user/proyectos/mi-repo)
#   <analysis_dir> carpeta de análisis (ej. {repo}/../analysis)
#   <base_branch>  rama base (master, develop)
#   V1-nombre ...  un argumento por worktree a crear
# Crea {analysis_dir}/V{n}-nombre/ en detached HEAD para el análisis (solo lectura).
```

### Fase de remediación — crear rama de fix (desde master, NUNCA detached)

```bash
bash scripts/create-fix-branch.sh <repo> <analysis_dir> <base_branch> <fix_name>
#   <base_branch> master o main SIEMPRE
#   <fix_name>    ej. V3-upload-magic-bytes
# Crea la rama security/fix/<fix_name> desde master/main + worktree con branch
# en {analysis_dir}/fixes/<fix_name>/ para aplicar el fix y verificar.
```

### Fase de remediación — merge + limpieza por vulnerabilidad

```bash
bash scripts/merge-fix-branch.sh <repo> <analysis_dir> <base_branch> <fix_name>
#   Verifica el fix, commitea en la rama y luego:
#   - checkout <base_branch>, merge --no-ff de security/fix/<fix_name>
#   - borra la rama de fix ya mergeada y su worktree
```

### Fase final — limpieza total

```bash
bash scripts/cleanup-worktrees.sh <repo> <analysis_dir> [--keep-consolidated]
#   Elimina todos los worktrees de análisis dentro de <analysis_dir>
#   y las ramas security/fix/* ya mergeadas.
#   --keep-consolidated conserva SECURITY_AUDIT_CONSOLIDATED.md y los REPORT.md.
```

> **Uso obligatorio:** durante la auditoría, reemplazar los bloques de comandos git manuales
> de las fases 2, 3, 5 y el paso 8 del flujo por las llamadas a estos scripts. Solo escribir
> git a mano para verificar commits puntuales (`git log`, `git status`) o el boot de tests.
> El resto de los pasos (análisis, reportes, consolidación, Jira) se hace igual que siempre.

---

## 🧠 Reglas de Análisis de Vulnerabilidades

### Reglas de Ciberseguridad (Universales — aplican a cualquier stack)

1. **Principio de Mínimo Privilegio**: Cada endpoint/ruta debe tener la autenticación adecuada al nivel mínimo necesario.
2. **Defense in Depth**: No confiar en una sola capa de seguridad. Verificar autenticación + autorización + validación.
3. **Validación de Entrada**: Todo input del usuario debe ser validado (tipo, formato, longitud, rango, sanitización).
4. **No Confiar en el Cliente**: `req.body`, `req.query`, `req.params`, headers pueden ser manipulados.
5. **Seguridad por Design**: La seguridad debe estar diseñada desde el inicio, no agregada después.
6. **Exposición Mínima**: Endpoints/rutas internas no deben estar expuestos públicamente.
7. **Secrets Management**: Nunca hardcodear credenciales, API keys, tokens, conexiones en el código fuente.
8. **Hash Seguro**: MD5/SHA1 no son seguros. Usar algoritmos modernos (bcrypt, argon2, scrypt según el lenguaje).
9. **Inyección**: Validar y sanitizar entradas para evitar SQL/NoSQL/Command Injection.
10. **Mass Assignment**: No pasar datos crudos del request directamente a bases de datos o constructores.
11. **Rate Limiting**: Endpoints sensibles (login, registro, 2FA) deben tener rate limiting.
12. **Logging Seguro**: No loguear datos sensibles (contraseñas, tokens, secrets).
13. **CORS**: Configurar orígenes permitidos explícitamente, no usar wildcards en producción.

### Reglas por Stack (detectar automáticamente)

| Stack | Reglas adicionales |
|-------|-------------------|
| Node.js/Express | Helmet, cors config, JWT middleware, DTO validation, NoSQL injection |
| Python/Django | CSRF tokens, SQL injection, settings.py security, debug=False |
| Python/FastAPI | Pydantic validation, CORS, dependency injection security |
| Ruby/Rails | Strong parameters, CSRF, SQL injection, mass assignment |
| Go | Input sanitization, SQL injection, JWT validation |
| Rust | Unsafe code review, input validation, dependency audit |
| PHP/Laravel | Eloquent mass assignment, CSRF, SQL injection, XSS |
| Java/Spring | Method security, SQL injection, CORS, JWT filter |

### 🎯 Áreas de Alta Prioridad (siempre señalar, incluso con baja confianza)

Detección de contexto del proyecto (pagos, wallet, geolocalización, admin panel, etc.). Prioridades:

#### Autenticación y sesiones
- Almacenamiento inseguro de tokens/sesiones (ej. AsyncStorage en RN en vez de Keychain/Keystore), tokens logueados, tokens en URLs/query params, falta de expiración/rotación.
- Cualquier cambio en login, refresh de token, reset de contraseña, OTP o device attestation.
- Endpoints sin middleware de auth, o con auth verificada solo en el cliente.

#### Autorización / RBAC
- Endpoints del admin panel: verificar que los checks de rol se apliquen server-side por ruta, no solo ocultos en la UI.
- IDOR: cualquier handler que tome `userId`, `tripId`, `walletId`, `transactionId`, etc., del request sin verificar ownership o rol.
- Escalada de privilegios por mass assignment (spread de `req.body` en updates de Mongo u ORM).

#### Pagos, wallet y fraude
- Código que toque balances de wallet, transacciones, asignación/reconciliación de pagos, refunds, promos o incentivos/challenges de conductores: señalar falta de idempotencia, race conditions (read-then-write sin operadores atómicos/transacciones) y montos provistos por el cliente confiados por el servidor.
- Lógica que permita doble abono, replay de referencia de pago, o abuso de self-referral/self-dealing.

#### MongoDB/BD específico
- NoSQL/SQL injection: input del usuario en operadores de query (`$where`, `$regex`, `$gt`, etc.) o en pipelines de agregación sin sanitizar.
- Queries sin límite (sin rango de fechas o paginación) en colecciones grandes — riesgo de disponibilidad.
- Queries `$regex` sin ancla o controladas por el usuario.

#### Exposición de datos y PII
- Respuestas API que devuelven documentos completos de usuario/chofer en vez de campos proyectados (teléfono, documentos de ID, datos bancarios, historial de ubicación).
- Datos sensibles (tokens, teléfonos, refs de pago, coordenadas) escritos en logs, analytics o crash reporters.
- Secrets hardcodeados, API keys o connection strings en cualquier lado, incluidos archivos de config de RN y `.env` commiteados por error.

#### React Native / mobile
- Secrets embebidos en el bundle JS (todo lo que está en el código RN es extraíble).
- Deep links inseguros, remoción/debilitamiento de certificate pinning, WebView con `javascriptEnabled` + contenido no confiable.
- Decisiones de seguridad aplicadas solo en el cliente.

#### Web panels
- XSS (especialmente `dangerouslySetInnerHTML`, render sin sanitizar de strings de usuario/chofer), CSRF en acciones de admin que cambian estado, open redirects.
- File upload (KYC, imágenes): falta de validación de tipo/tamaño, path traversal.

### 📝 Estilo de Reporte

- Reportar solo hallazgos con un path de explotación plausible; omitir issues puramente teóricos o de estilo.
- Por cada hallazgo: severidad, archivo/línea afectada, escenario concreto de explotación y una sugerencia mínima de fix.
- **NO señalar**: falta de rate limiting en endpoints solo internos, sugerencias genéricas de bump de dependencias, o archivos de test/fixture con credenciales falsas claramente marcadas.

### Reglas de Ejecución (Universales)

1. NO hacer cambios en ningún archivo durante el análisis
2. Los worktrees de análisis son solo para análisis — se eliminan al finalizar
3. Cada subagente es independiente y se ejecuta en paralelo
4. La solución propuesta debe funcionar para todas las ramas sin causar conflictos
5. La solución debe ser quirúrgica (mínimos cambios, no comprometer desarrollo local)
6. No depender de variables de entorno nuevas ni hardcodear credenciales
7. Si la vulnerabilidad requiere cambios del frontend/mobile: señalarlo y sugerir enfoque alternativo

### Reglas de Remediación (CRÍTICAS — no negociables)

1. **NUNCA aplicar fixes directamente en `master`/`main`.** Cada vulnerabilidad se corrige en su propia rama `security/fix/V{n}-...` creada desde `master`/`main`.
2. **Siempre crear una rama por worktree/vulnerabilidad que salga de `master`/`main`**, para hacer cambios individuales sin conflictos ni colapsar el historial de `master`.
3. **No trabajar directo en `master`**: el merge a `master` se hace solo después de verificar el fix en su rama.
4. Al terminar: mergear cada rama a `master`/`main`, borrar las ramas de fix y limpiar los worktrees.

---

## 📊 Plantilla de Reporte Individual (REPORT.md)

```markdown
# Reporte de Vulnerabilidad: {nombre}

## Resumen Ejecutivo
{descripción corta}

## Análisis por Rama

### {rama1} (commit {hash})
| Archivo | Línea | Estado | Detalle |
|---|---|---|---|

### {rama2} (commit {hash})
| Archivo | Línea | Estado | Detalle |
|---|---|---|---|

### {ramaN} (commit {hash})
| Archivo | Línea | Estado | Detalle |
|---|---|---|---|

## Detalle Técnico
{código vulnerable, explicación, impacto}

## Código Moderno (si aplica)
{existe una versión moderna que ya mitigue?}

## Solución Propuesta
{lista de cambios por archivo}

## ¿Aplica?
{SÍ/NO - justificación}
```

---

## 📊 Plantilla de Informe Consolidado

```markdown
# Auditoría de Seguridad — {nombre del repo}

## Resumen Ejecutivo
- Total vulnerabilidades: {N}
- Jira tickets creados: {N}
- Ramas analizadas: {lista}

| # | Vulnerabilidad | Jira | {rama1} | {rama2} | {rama3} | ¿Aplica? |
|---|---|---|---|---|---|---|

## Detalle por Vulnerabilidad
...
```

---

## 🎯 Triggers de Activación

- "auditar repositorio"
- "analizar vulnerabilidades genérico"
- "security audit genérico"
- "auditar seguridad"
- "auditoría genérica"
- "analizar seguridad de repo"
- "hacer auditoría de seguridad"
- "analizar vulnerabilidades"
- "vulnerability analysis"
- "security audit"

---

## 📦 Dependencias

- **Git** (worktrees)
- **Jira MCP** (creación de tickets, opcional)
- **Task tool** (subagentes paralelos)
- Acceso al repositorio con las ramas a analizar
- Suficiente espacio en disco (~500MB por worktree)

---

## ⚠️ Advertencias

1. Los worktrees ocupan espacio en disco (~500MB c/u). Limpiar con `git worktree remove` después de usar.
2. No crear más de 10-12 worktrees simultáneos por performance.
3. Cada subagente es independiente; revisar que no haya duplicación de análisis.
4. Siempre leer `CLAUDE.md` (si existe) del repositorio antes de empezar el análisis.
5. El skill se adapta al stack detectado — revisar que la detección sea correcta.
6. **No editar `master`/`main` directamente**: los fixes van SIEMPRE en ramas `security/fix/V{n}-...` creadas desde `master`/`main` y se mergean al final.

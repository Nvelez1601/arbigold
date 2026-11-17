# Arranque de ArbiGold — local y producción

Base de datos, Auth y Storage: **Supabase**. API: **Node 26 + Express**. Frontend: **Vue 3 + Vite**.

```
navegador ──HTTPS──▶ frontend (estático) ──HTTPS──▶ API Express ──TLS──▶ Supabase Postgres
    └──────────── Supabase Auth (login, MFA) ◀──── la API verifica el JWT de cada request
```

El frontend **nunca** lee ni escribe la base de datos directamente: todo pasa por la API. La
clave pública de Supabase en el navegador solo sirve para Auth, y RLS deniega cualquier acceso
directo a las tablas.

---

## 1. Local (contra Supabase en la nube)

**No se usa Supabase local ni Docker** (ADR-005): la API y el frontend corren en tu máquina y se
conectan al proyecto de Supabase de **desarrollo** en la nube. El de producción es otro proyecto.

### Requisitos

| Herramienta                     | Versión           | Para qué                                      |
| ------------------------------- | ----------------- | --------------------------------------------- |
| nvm + Node                      | **26** (`.nvmrc`) | `nvm install && nvm use`                      |
| Proyecto Supabase de desarrollo | —                 | Base de datos, Auth y Storage                 |
| Git                             | —                 | Los hooks se instalan solos con `npm install` |

### Pasos

```bash
# 1. Dependencias (instala también los hooks de git)
nvm install && nvm use
npm ci

# 2. Variables de entorno (los .env están en .gitignore)
cp apps/backend/.env.example  apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

De dónde sale cada valor, en el panel de Supabase del proyecto de desarrollo:

| Variable                                                     | Dónde está                                                                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `SUPABASE_URL` / `VITE_SUPABASE_URL`                         | Connect → _Framework_ → `SUPABASE_URL`                                                                                   |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Connect → _Framework_ → `sb_publishable_…`                                                                               |
| `SUPABASE_JWKS_URL`                                          | Connect → _API server_ (opcional: se deriva de `SUPABASE_URL`)                                                           |
| `DATABASE_URL`                                               | Connect → **Transaction pooler** (puerto 6543). Lleva la contraseña de la DB: **pégala tú, nunca la compartas por chat** |
| `SUPABASE_SECRET_KEY`                                        | **No va en ningún `.env` de la app.** Solo como secreto del CI para migraciones                                          |

```bash
# 3. Migraciones: vincular el repo al proyecto y aplicarlas (una vez, y en cada migración nueva)
npx supabase login
npm run db:link -- --project-ref <ref>
npm run db:push

# 4. Levantar (en dos terminales)
npm run dev:backend             # API en http://localhost:3000  →  GET /health = {"status":"ok"}
npm run dev:frontend            # App en http://localhost:5173
```

### Comandos del día a día

```bash
npm run verify                         # todo lo que corre el pre-push y el CI
npm run db:migration -- <nombre>       # crea supabase/migrations/<timestamp>_<nombre>.sql
npm run db:push                        # aplica las migraciones pendientes al proyecto vinculado
```

### Problemas frecuentes

| Síntoma                                                      | Causa y solución                                                                                                                                                                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Configuración inválida: DATABASE_URL, …` al arrancar la API | Falta `apps/backend/.env` o una variable (el mensaje nombra cuáles). `DATABASE_URL` vacía: pégala desde Connect                                                                                                                                          |
| `Configuración inválida: SUPABASE_PUBLISHABLE_KEY`           | Pegaste una `sb_secret_…`: ahí va la `sb_publishable_…`                                                                                                                                                                                                  |
| `ENETUNREACH … :5432` (dirección IPv6)                       | Usaste la conexión **directa** (`db.<ref>.supabase.co:5432`), que es solo IPv6 y no funciona desde WSL ni desde muchas redes. Usa el **Transaction pooler**: `postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:6543/postgres` |
| `tenant/user postgres.<ref> not found`                       | El host del pooler no corresponde a tu proyecto (hay `aws-0-…` y `aws-1-…`): copia el host exacto de Connect → Transaction pooler                                                                                                                        |
| `self-signed certificate` / `SSL required`                   | `DATABASE_SSL=true` (Supabase en la nube siempre usa TLS)                                                                                                                                                                                                |
| El proyecto no responde tras unos días sin uso               | El plan Free pausa los proyectos inactivos: reanúdalo desde el panel                                                                                                                                                                                     |
| `✗ Los hooks requieren Node 26` al commitear                 | Falta Node 26 en nvm: `nvm install 26`                                                                                                                                                                                                                   |

---

## 2. Producción

### 2.1 Supabase (proyecto en la nube)

1. Crea el proyecto en [supabase.com](https://supabase.com), en la región más cercana a la operación.
2. Vincula el repo y aplica las migraciones (desde tu máquina o desde el CI):
   ```bash
   npx supabase login
   npm run db:link -- --project-ref <ref-de-produccion>
   npm run db:push                 # aplica supabase/migrations: schema + políticas RLS
   ```
3. **Rol de la aplicación**: la API **no** se conecta como `postgres` ni con la `service_role`.
   Usa el rol de privilegio mínimo que crean las migraciones (llega con la primera migración de la fase 1), con una contraseña larga guardada en
   el gestor de secretos del hosting.
4. **Auth** → URL Configuration: _Site URL_ = `https://app.tudominio.com`; _Redirect URLs_ =
   solo los dominios del frontend. Activa MFA (TOTP) para los roles administrativos.
5. **Database** → _Network restrictions_: limita las IPs que pueden conectarse a la IP de salida
   de la API, si el hosting la ofrece fija.
6. **Backups**: el plan Free no incluye backups gestionados suficientes (ver `ADR-001`).
   Programa un `pg_dump` diario, cifrado y guardado fuera de Supabase, y prueba la restauración
   una vez al mes. Antes de cargar datos reales de clientes, evalúa el plan Pro.

### 2.2 API (apps/backend)

Cualquier hosting con **Node 26** (Render, Railway, Fly.io o un VPS con systemd/PM2).

```bash
npm ci
npm run build -w @arbigold/shared-types
npm run build -w @arbigold/backend
npm run start -w @arbigold/backend      # node dist/main.js
```

Variables (en el panel del hosting, **nunca** en un archivo commiteado):

| Variable                   | Valor en producción                                                              |
| -------------------------- | -------------------------------------------------------------------------------- |
| `NODE_ENV`                 | `production`                                                                     |
| `PORT`                     | El que asigne el hosting                                                         |
| `LOG_LEVEL`                | `info`                                                                           |
| `TRUST_PROXY`              | `1` (detrás del balanceador del hosting)                                         |
| `CORS_ORIGINS`             | `https://app.tudominio.com` (solo https; varios separados por coma)              |
| `DATABASE_URL`             | Connection string del **Transaction pooler** (puerto 6543), con el rol de la app |
| `DATABASE_SSL`             | `true`                                                                           |
| `DATABASE_POOL_MAX`        | `10` (ajústalo al plan de Supabase)                                              |
| `SUPABASE_URL`             | `https://<ref>.supabase.co`                                                      |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` del proyecto de producción                                    |
| `SUPABASE_JWKS_URL`        | Opcional (se deriva de `SUPABASE_URL`)                                           |
| `SUPABASE_JWT_AUDIENCE`    | `authenticated`                                                                  |

Con `NODE_ENV=production`, la API **se niega a arrancar** si `DATABASE_SSL` no es `true` o si
`SUPABASE_URL` o algún origen CORS no usa `https://`.

Health check del hosting: `GET /health` → `200 {"status":"ok"}`.

### 2.3 Frontend (apps/frontend)

Sitio estático (Cloudflare Pages, Netlify, Vercel o un bucket con CDN).

```bash
npm ci
npm run build -w @arbigold/frontend     # genera apps/frontend/dist
```

| Variable de build               | Valor                                                  |
| ------------------------------- | ------------------------------------------------------ |
| `VITE_API_URL`                  | `https://api.tudominio.com`                            |
| `VITE_SUPABASE_URL`             | `https://<ref>.supabase.co`                            |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | La _publishable key_ del proyecto (pública por diseño) |

Configura el hosting como SPA: toda ruta desconocida responde `index.html`.

### 2.4 Checklist antes de abrir a usuarios

- [ ] `npm run verify` en verde y CI en verde en el commit desplegado.
- [ ] Migraciones aplicadas; **RLS activado en todas las tablas** (Supabase → Advisors → Security).
- [ ] La API usa el rol de la app, no `postgres` ni la `service_role`.
- [ ] `DATABASE_SSL=true`, CORS solo con los dominios propios y `https://` en todo.
- [ ] Ningún secreto en variables `VITE_*` ni en el repo (gitleaks lo vigila en el CI).
- [ ] MFA activo para los usuarios administrativos.
- [ ] Backup diario configurado y una restauración de prueba documentada en `memory/qa/`.

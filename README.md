# hidroequipos-assistant-api

Backend del asistente inteligente de diagnóstico y mantenimiento de albercas de **Hidroequipos y Albercas**.

Los empleados describen el síntoma de una alberca en lenguaje natural — agua verde, bomba ruidosa, olor fuerte a cloro — y el sistema responde con un diagnóstico y un plan de tratamiento, citando únicamente productos reales del catálogo de la empresa. El motor combina búsqueda semántica sobre el catálogo y una base de conocimiento técnico con generación de lenguaje natural (RAG), para que cada recomendación esté respaldada por información real en vez de inventada.

Es una herramienta de uso interno: el personal técnico resuelve casos más rápido sin depender de memorizar el catálogo completo o las reglas de dosificación de cada producto.

## Descripción

El proyecto está construido con **NestJS** y **TypeScript**, usa **Prisma** para acceso a datos con **PostgreSQL** (extensión `pgvector` para búsqueda semántica), y se integra con **Google Gemini** para generar embeddings y las respuestas del asistente.

## Tecnologías

- NestJS
- TypeScript
- Prisma Client
- PostgreSQL + pgvector (Supabase)
- JWT
- Bcrypt
- Google Generative AI (Gemini)

## Estructura funcional

La API organiza la lógica en los siguientes módulos:

- Autenticación y reseteo de contraseña gestionado por supervisores
- Usuarios con roles (empleado / supervisor)
- Conversaciones y mensajes del chat de diagnóstico, con fuentes citadas y título automático
- Motor de recuperación semántica (embeddings + búsqueda vectorial)
- Generación de diagnósticos con IA sobre contexto real del catálogo
- Catálogo de productos y base de conocimiento técnico (administración por supervisores)
- Feedback (👍/👎) por mensaje
- Atajos de consulta frecuente (query templates)
- Métricas, salud de la API de Gemini y trazabilidad de respuestas, solo para supervisores

## Requisitos

- Node.js 22 o superior
- pnpm 9 o superior
- Un proyecto de PostgreSQL con la extensión `pgvector` habilitada (Supabase)
- Una API key de Google Gemini

## Instalación

1. Clona el repositorio.

```bash
git clone https://github.com/ErikCaballeroh/hidroequipos-assistant-api.git
cd hidroequipos-assistant-api
```

2. Instala dependencias.

```bash
pnpm install
```

3. Configura las variables de entorno (ver tabla abajo) en un archivo `.env`.

4. Genera el cliente de Prisma.

```bash
npx prisma generate
```

5. Aplica las migraciones.

```bash
npx prisma migrate dev
```

6. Carga el catálogo de productos y la base de conocimiento.

```bash
npx prisma db seed
```

## Variables de entorno

| Variable | Descripción | Requerida |
| --- | --- | --- |
| `DATABASE_URL` | Conexión con pooler, usada por la aplicación en tiempo de ejecución | Sí |
| `DIRECT_URL` | Conexión directa, usada por el CLI de Prisma para migrar | Sí |
| `GEMINI_API_KEY` | API key de Google Gemini, para embeddings y generación | Sí |
| `JWT_SECRET` | Secreto para firmar y verificar tokens JWT | Sí |
| `JWT_EXPIRES_IN` | Duración del token (ej. `8h`) | Recomendado |
| `CONFIDENCE_THRESHOLD` | Umbral de similitud mínima para considerar que hay contexto suficiente | Recomendado |
| `PORT` | Puerto del servidor (default `3001`, para liberar el 3000 a `next dev`) | Opcional |
| `FRONTEND_URL` | Origen permitido por CORS para el frontend | Sí |

## Scripts

| Script | Descripción |
| --- | --- |
| `pnpm run start:dev` | Levanta el servidor en modo desarrollo con recarga automática |
| `pnpm run build` | Compila TypeScript a JavaScript |
| `pnpm run start:prod` | Ejecuta el build compilado |
| `pnpm run lint` | Corre el linter |
| `pnpm run test` | Corre los tests unitarios |

## Ejecución

### Desarrollo

```bash
pnpm run start:dev
```

La API queda disponible en `http://localhost:3001`. Todas las rutas están bajo el prefijo `/api` (ej. `http://localhost:3001/api/health`).

### Verificación rápida

```bash
curl http://localhost:3001/api/health
```

### Documentación interactiva (Swagger)

Con el servidor corriendo (y `NODE_ENV` distinto de `production`), la documentación OpenAPI está disponible en:

```
http://localhost:3001/api/docs
```

## Autenticación

Las rutas protegidas requieren el header:

```http
Authorization: Bearer <token>
```

El token se obtiene en `/api/auth/login`. Su duración se configura con `JWT_EXPIRES_IN`.

## Endpoints

Base path: `/api`

### Auth

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| POST | `/auth/login` | Inicia sesión, devuelve un token | Público |
| GET | `/auth/me` | Perfil del usuario autenticado | Autenticado |
| POST | `/auth/change-password` | Cambia la contraseña propia (valida la actual) | Autenticado |

### Users

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| GET | `/users` | Lista los empleados, paginada (`?search=&page=&pageSize=`) | Supervisor |
| POST | `/users` | Crea un empleado | Supervisor |
| PATCH | `/users/:id` | Edita rol o estado de un empleado | Supervisor |
| POST | `/users/:id/reset-password` | Resetea la contraseña de un empleado | Supervisor |
| DELETE | `/users/:id` | Desactiva un empleado | Supervisor |

### Conversations

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| POST | `/conversations` | Crea una conversación | Autenticado |
| GET | `/conversations` | Lista las conversaciones del usuario actual | Autenticado |
| POST | `/conversations/:id/messages` | Envía un mensaje y recibe un diagnóstico con fuentes (`sources`) | Autenticado (404 si la conversación no es propia) |
| GET | `/conversations/:id/messages` | Lista los mensajes de una conversación, con su feedback propio | Autenticado (404 si la conversación no es propia) |

### Feedback

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| POST | `/messages/:id/feedback` | Califica una respuesta (`like`/`dislike`), upsert por mensaje | Autenticado |
| DELETE | `/messages/:id/feedback` | Elimina el feedback propio de una respuesta | Autenticado |

### Query templates

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| GET | `/query-templates` | Lista las plantillas activas, por `displayOrder`, paginada (`?search=&page=&pageSize=`) | Autenticado |
| POST | `/query-templates` | Crea una plantilla | Supervisor |
| PATCH | `/query-templates/:id` | Edita una plantilla | Supervisor |
| DELETE | `/query-templates/:id` | Elimina una plantilla | Supervisor |

### Products

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| GET | `/products` | Lista el catálogo (todos, activos e inactivos), paginada (`?search=&page=&pageSize=`) | Supervisor |
| POST | `/products` | Crea un producto (regenera el embedding) | Supervisor |
| PATCH | `/products/:id` | Edita un producto (regenera el embedding si cambia `name`/`description`) | Supervisor |
| DELETE | `/products/:id` | Baja lógica (`active=false`), nunca borra físicamente | Supervisor |

### Knowledge base

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| GET | `/knowledge-base` | Lista los artículos, paginada (`?search=&page=&pageSize=`) | Supervisor |
| POST | `/knowledge-base` | Crea un artículo (regenera el embedding) | Supervisor |
| PATCH | `/knowledge-base/:id` | Edita un artículo (regenera el embedding si cambia `title`/`description`) | Supervisor |
| DELETE | `/knowledge-base/:id` | Elimina el artículo; `409` si está referenciado en la traza de mensajes existentes | Supervisor |

### Admin

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| GET | `/admin/stats` | Productos más consultados, feedback y mensajes sin match (`?from=&to=`, default últimos 30 días) | Supervisor |
| GET | `/admin/gemini-logs` | Historial de llamadas a Gemini, paginado (`?page=&pageSize=&success=`) | Supervisor |
| GET | `/admin/messages` | Listado paginado de mensajes del asistente (`?feedback=&noMatch=&page=&pageSize=`) | Supervisor |
| GET | `/admin/messages/:id/trace` | Traza completa de una respuesta (pregunta, feedback, productos y artículos usados) | Supervisor |

### Health

| Método | Ruta | Descripción | Acceso |
| --- | --- | --- | --- |
| GET | `/health` | Estado del servicio y de la conexión a base de datos | Público |

## Listados paginados

`GET /users`, `GET /products`, `GET /knowledge-base` y `GET /query-templates` siempre devuelven la misma forma paginada, igual que `/admin/gemini-logs` y `/admin/messages`:

```json
{
  "items": [ /* ... */ ],
  "page": 1,
  "pageSize": 20,
  "total": 57
}
```

- `page` (default `1`) y `pageSize` (default `20`) son opcionales.
- `search` (opcional) filtra por el/los campos relevantes de cada entidad (`name`/`email` en users, `name`/`sku` en products, `title` en knowledge-base, `title`/`queryText` en query-templates), sin distinguir mayúsculas/minúsculas.

## Detalle de endpoints

### Auth

`POST /auth/login`

```json
{
  "email": "empleado@hidroequipos.com",
  "password": "contraseña"
}
```

### Conversations

`POST /conversations/:id/messages`

```json
{
  "content": "el agua de la alberca está verde, creo que tiene algas"
}
```

Respuesta:

```json
{
  "message": { "id": 91, "role": "assistant", "content": "...", "bestMatchDistance": 0.18, "responseTimeMs": 2800 },
  "sources": {
    "products": [{ "id": 3, "sku": "QUI-002", "name": "...", "distance": 0.21, "similarity": 0.79 }],
    "knowledge": [{ "id": 2, "title": "...", "distance": 0.25, "similarity": 0.75 }]
  }
}
```

`similarity = 1 - distance`, redondeada a 2 decimales. Si no hay contexto suficiente (`bestMatchDistance` por encima de `CONFIDENCE_THRESHOLD`, o `null`), `sources` viene vacío. Fallas de Gemini (429, 503, timeout) responden `503` con un mensaje claro, y quedan registradas en `gemini_logs`.

## Modelo de datos

Las entidades principales de la base de datos son:

- `User`: empleados, con rol (empleado / supervisor)
- `Product`: catálogo de productos, con su representación semántica
- `KnowledgeBase`: procedimientos y reglas de dosificación
- `Conversation` / `Message`: hilos de chat y sus mensajes
- `MessageProduct` / `MessageKnowledge`: trazabilidad de qué respaldó cada respuesta
- `Feedback`: calificación de respuestas por el usuario
- `GeminiLog`: registro de llamadas al modelo de lenguaje
- `QueryTemplate`: atajos de consulta frecuente

## Prisma

Abrir Prisma Studio:

```bash
npx prisma studio
```

Crear una nueva migración:

```bash
npx prisma migrate dev --name <nombre-migracion>
```

## Estructura del proyecto

```
src/
├── auth/              → login, JWT, guards de rol, perfil y cambio de contraseña
├── users/              → gestión de empleados
├── conversations/      → orquesta el flujo de diagnóstico, fuentes y títulos
├── retrieval/           → búsqueda semántica sobre productos y base de conocimiento
├── embeddings/           → generación de representaciones semánticas
├── gemini/                → generación de respuestas con IA
├── prompt-builder/        → construcción del contexto para el modelo
├── feedback/               → 👍/👎 por mensaje
├── query-templates/        → atajos de consulta frecuente
├── products/                → administración del catálogo
├── knowledge-base/           → administración de la base de conocimiento
├── admin/                     → métricas, salud de Gemini y trazabilidad
├── health/                     → estado del servicio
└── prisma/                      → conexión a base de datos
```

## Documentación técnica

El detalle de implementación (decisiones de configuración, flujo interno del motor y notas de desarrollo) vive en `CLAUDE.md`.
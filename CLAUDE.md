# CLAUDE.md

Este archivo guía a Claude Code al trabajar en `hidroequipos-assistant-api`, el backend del asistente interno de diagnóstico de albercas de Hidroequipos y Albercas.

## Resumen del proyecto

API REST en NestJS que implementa un pipeline RAG (Retrieval-Augmented Generation): los empleados describen síntomas de una alberca en un chat, el sistema busca contexto relevante en el catálogo de productos y en una base de conocimiento (búsqueda vectorial con pgvector), y genera un diagnóstico con Google Gemini citando solo productos reales. Es un sistema **interno**, usado exclusivamente por empleados de Hidroequipos, no por clientes finales.

Repositorio hermano del frontend: `hidroequipos-assistant-web` (Next.js). Este repo es solo el backend.

## Stack

- **Framework:** NestJS 12 + TypeScript, proyecto **ESM** (`"type": "module"`, `moduleResolution: "nodenext"`)
- **Testing:** vitest (no Jest) — **Linting:** oxlint (no ESLint) — son los defaults de un proyecto NestJS 12 inicializado en modo ESM, no una elección manual del equipo
- **ORM:** Prisma (7.10+)
- **Base de datos:** PostgreSQL con extensión `pgvector`, hosteada en Supabase (dos proyectos: `hidroequipos-dev` y `hidroequipos-prod`)
- **LLM / Embeddings:** Google Gemini — **único proveedor**, no hay lógica de fallback entre proveedores
- **Autenticación:** JWT propio (`@nestjs/passport` + `passport-jwt` + `bcrypt`) — **no se usa Supabase Auth**
- **Gestor de paquetes:** pnpm
- **Convención de commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`)

## Comandos

```bash
pnpm install              # instalar dependencias
pnpm run start:dev        # levantar en modo desarrollo (watch)
pnpm run build             # compilar
pnpm run start:prod        # correr build de producción

pnpm run lint               # oxlint (NO eslint)
pnpm run test               # tests unitarios (vitest, NO jest)
pnpm run test:e2e           # tests end-to-end
pnpm run test:cov           # cobertura

npx prisma generate          # regenerar el cliente tras CUALQUIER cambio al schema o migración
npx prisma migrate dev       # crear y aplicar una migración en desarrollo (no regenera el cliente solo)
npx prisma migrate reset     # resetear la base de dev y reaplicar migraciones (nunca corre el seed solo)
npx prisma db seed           # sembrar datos — el único comando que dispara el seed, explícitamente
npx prisma studio            # explorador visual de la base de datos
```

**Nunca corras `prisma db push` contra la base de datos de producción (`hidroequipos-prod`).** Solo se usa `prisma migrate dev`/`deploy`, porque `db push` no deja historial de migraciones versionado.

**No uses `prisma migrate resolve --applied`** para aplicar ediciones manuales a un archivo de migración ya generado — ese comando es para marcar como aplicada una migración corrida por fuera de Prisma (típicamente en producción), no para este caso. Si editaste un `.sql` de migración después de generarlo (ej. para agregar `CREATE EXTENSION`/índices `ivfflat`), usa `prisma migrate reset` en desarrollo.

## Modelos de Gemini por tarea

No cambiar el modelo asignado a una tarea sin que el equipo lo apruebe explícitamente — cada uno se eligió por costo/latencia, no intercambiables a la ligera:

| Tarea | Modelo | Servicio |
|---|---|---|
| Embeddings (productos, base de conocimiento, consultas) | `gemini-embedding-001` (salida truncada a 768 dimensiones) | `EmbeddingsService` |
| Condensación de consulta con historial | `gemini-3.5-flash-lite` | `ConversationService.condensarConsulta()` |
| Generación del diagnóstico final | `gemini-3.5-flash-lite` | `GeminiService` |

**Las dos tareas usan el mismo modelo (`gemini-3.5-flash-lite`), no es un error.** Originalmente se planeó usar `gemini-3.5-flash` (sin "lite") para la generación del diagnóstico, por tener más capacidad de razonamiento. Pero la cuota real de la capa gratuita para `gemini-3.5-flash` (y para casi todos los modelos "Flash" normales de cualquier generación) es de solo **20 peticiones por día** — inviable incluso para que el equipo pruebe la app. `gemini-3.5-flash-lite` tiene 500 peticiones/día, 25 veces más. No cambiar esto a `gemini-3.5-flash` sin confirmar antes, en Google AI Studio, que la cuenta del proyecto tiene una cuota mayor que esa.

Los modelos "Pro" de Gemini son de pago — no usarlos por defecto en ningún flujo sin que el equipo lo decida explícitamente, ya que rompería el supuesto de costo de todo el proyecto.

⚠️ **Los nombres de modelo de Gemini cambian con más frecuencia de lo normal.** Google ha estado restringiendo el acceso a modelos de la generación 2.5 para API keys/proyectos nuevos de forma inconsistente (un modelo puede fallar con 404 mientras otro de la misma generación sigue funcionando), incluso sin fecha de deprecación anunciada. Si cualquiera de los modelos de la tabla empieza a fallar con `404 "no longer available to new users"`, el mensaje de error de la propia API normalmente ya incluye el modelo de reemplazo recomendado —úsalo, y actualiza esta tabla y el código en el mismo cambio. No asumas que la capa gratuita de un modelo nuevo es igual a la del anterior; confírmalo en Google AI Studio antes de depender de él en producción.

Nota aparte: Google está empujando una API nueva ("Interactions API", `/v1beta/interactions`) como la forma recomendada hacia adelante para los modelos más recientes, en vez del `generateContent` que usa este proyecto. Por ahora `generateContent` sigue funcionando y no hay razón para migrar a mitad de proyecto, pero es una migración a considerar más adelante si el equipo decide modernizar la integración.

## Arquitectura y estructura de módulos

```
src/
├── auth/              → AuthModule: login, JWT, guards de rol (employee/supervisor)
├── users/              → CRUD de empleados, incluye reset-password (ver abajo)
├── conversations/      → ConversationService: orquesta el pipeline RAG completo
├── retrieval/          → RetrievalService: búsqueda vectorial paralela + umbral de confianza
├── embeddings/         → EmbeddingsService: wrapper de la API de embeddings de Gemini
├── gemini/              → GeminiService: wrapper de la API de generación de Gemini
├── prompt-builder/      → PromptBuilderService: construcción del prompt final
├── products/            → CRUD del catálogo (regenera embedding al crear/editar)
├── knowledge-base/      → CRUD de la base de conocimiento (regenera embedding al editar)
├── feedback/             → 👍/👎 por mensaje
├── query-templates/      → CRUD de atajos de "consultas frecuentes"
└── admin/                → gemini-logs y métricas, solo supervisor
```

## Flujo RAG (orden exacto, no alterar sin razón)

1. Guardar mensaje del empleado (`role: 'user'`).
2. Traer las últimas 6 entradas del historial de la conversación.
3. Si hay historial, condensar la consulta con `gemini-3.5-flash-lite` (query rewriting).
4. Generar embedding de la consulta condensada.
5. Buscar en paralelo (`Promise.all`) contra `products` y `knowledge_base` por distancia coseno.
6. Comparar la mejor distancia contra el umbral de confianza (`CONFIDENCE_THRESHOLD`, configurable por env, valor de partida `0.6`). Si es peor, usar el prompt de "sin match" en vez del normal.
7. Construir el prompt final (instrucciones + historial + contexto recuperado + pregunta).
8. Llamar a `gemini-3.5-flash-lite`; registrar el intento en `gemini_logs` (éxito/error/latencia) sin importar el resultado.
9. Guardar la respuesta en `messages`.
10. Si hubo contexto suficiente, insertar las filas de trazabilidad en `message_product` y `message_knowledge` — **esto ocurre siempre después de guardar el mensaje, nunca antes ni en paralelo**.

## Base de datos: notas importantes de Prisma + pgvector

- Las columnas `embedding` de `products` y `knowledge_base` se modelan en `schema.prisma` como `Unsupported("vector(768)")`. Prisma **no** puede hacer `WHERE`/`ORDER BY` sobre ellas con su query builder normal — toda búsqueda por similitud usa `prisma.$queryRaw` con el operador `<=>` de pgvector.
- **Nunca pases un arreglo de JS crudo a un `$executeRaw`/`$queryRaw` esperando que se convierta en un vector válido.** Prisma serializa arreglos de JS como arreglos nativos de Postgres (`{0.1,0.2,...}`, con llaves), y pgvector espera el formato `[0.1,0.2,...]` (con corchetes) — son sintaxis distintas y Postgres rechaza la primera para una columna `vector`. Siempre convierte el embedding a string con el formato correcto antes de interpolarlo: `` `[${embedding.join(',')}]` ``, y castea con `::vector` en el SQL.
- **Este proyecto usa Prisma 7 (≥7.10), donde `url`/`directUrl` ya NO van en el `datasource` de `schema.prisma`.** La conexión se configura en `prisma.config.ts` (raíz del repo — puede aparecer nombrado `prisma7.config.ts` según la instalación, es equivalente), importando `defineConfig`/`env` desde `prisma/config` (el paquete base, no `@prisma/prisma7`, que es un paquete de compatibilidad aparte que este proyecto no usa). No agregues `url = env(...)` dentro de `schema.prisma` — es un error de Prisma 7, no una opción válida.
- **El `url` de `prisma.config.ts` (usado por el CLI para migrar) debe ser la conexión DIRECTA de Supabase, sin pooler.** La conexión con pooler (`DATABASE_URL`) se usa aparte, en el driver adapter (`@prisma/adapter-pg`) del `PrismaClient` en tiempo de ejecución — son dos URLs distintas para dos propósitos distintos, no la confundan.
- Tras cada `prisma migrate dev`/`db push`, correr `prisma generate` manualmente — Prisma 7 ya no regenera el cliente solo.
- El comando `seed` dentro de `migrations` en `prisma.config.ts` debe llevar `npx` antepuesto (`"npx tsx prisma/seed.ts"`, no `"tsx prisma/seed.ts"`) — Prisma corre ese comando como proceso separado y sin `npx` puede no resolver el binario local de `tsx` (falla en Windows con `"tsx" no se reconoce como un comando`).
- Desde Prisma 7, el seeding **nunca** se dispara automáticamente (ni con `migrate dev` ni con `migrate reset`, con o sin banderas) — solo corre con `npx prisma db seed` explícito.
- **Todo import relativo (`./` o `../`) debe llevar extensión `.js` explícita**, aunque el archivo fuente sea `.ts` — es un requisito de TypeScript en modo ESM (`moduleResolution: "nodenext"`/`"node16"`), no un error. Ejemplo: `import { PrismaService } from '../prisma/prisma.service.js';`, no `'../prisma/prisma.service'`. Esto aplica a todos los imports relativos del proyecto (servicios, guards, DTOs, el cliente de Prisma generado), no solo a uno en particular. Los imports de paquetes (`@nestjs/common`, `@prisma/adapter-pg`, etc.) no llevan `.js`, esta regla es solo para rutas relativas.
- **El `generator client` de `schema.prisma` requiere `output` explícito** (`provider = "prisma-client"`, `output = "../src/generated/prisma"`) — el cliente ya no se genera en `node_modules/@prisma/client`. Por eso, en todo el código, `PrismaClient` se importa desde `../generated/prisma/client` (ruta relativa según la ubicación del archivo), **nunca** desde `'@prisma/client'` directamente — ese import falla con "no exported member 'PrismaClient'".
- **`src/generated/prisma/` está en `.gitignore`** (es código generado). Cualquier entorno con checkout limpio (CI, un deploy, una máquina nueva del equipo) necesita correr `npx prisma generate` explícitamente antes de compilar o testear — si no, falla con `Cannot find module '../generated/prisma/client.js'`. Además, `prisma generate` necesita que `DATABASE_URL`/`DIRECT_URL` existan como variables de entorno para que `prisma.config.ts` cargue (aunque no haga falta una conexión real) — en CI, usar valores falsos (`postgresql://user:pass@localhost:5432/dummy`) es suficiente.
- Cada vez que se genera una migración con `prisma migrate dev` que toque estas tablas, **revisa el SQL generado a mano**: Prisma no agrega `CREATE EXTENSION IF NOT EXISTS vector;` ni los índices `ivfflat` (`vector_cosine_ops`) automáticamente — hay que añadirlos manualmente al archivo de migración antes de aplicarla.
- **No agregues un índice `ivfflat` con `lists` fijo (ej. copiado de la guía genérica) sin ajustarlo al conteo real de filas de la tabla.** `ivfflat` es un índice aproximado que reparte los vectores en `lists` clusters vía k-means; con pocas filas y `lists` sobredimensionado (ej. `lists = 100` con una tabla de 12 productos), la mayoría de los clusters quedan vacíos y una búsqueda puede sondear un cluster sin filas y devolver **0 resultados sin ningún error**, aunque exista un match semántico perfecto en la tabla — esto ya causó un bug real donde `RetrievalService` siempre reportaba "sin contexto suficiente". Mientras el catálogo tenga pocas filas (decenas/cientos), es preferible no indexar `embedding` en absoluto — pgvector recomienda esperar a tener miles de filas antes de indexar. Si se agrega el índice, calcular `lists` sobre el conteo real (`rows / 1000`, mínimo 1, o `sqrt(rows)` para tablas grandes) y considerar `HNSW` en vez de `ivfflat` para evitar este problema de "arranque en frío".
- Tablas de trazabilidad (`message_product`, `message_knowledge`) tienen llave primaria compuesta — nunca se actualizan, solo se insertan (son un log de auditoría, no un estado editable).

## Autenticación y roles

- Dos roles: `employee` y `supervisor`. Los guards de rol se aplican con un decorador (`@Roles('supervisor')`) sobre los endpoints de administración (catálogo, base de conocimiento, plantillas, usuarios, métricas, logs).
- **El reseteo de contraseña lo hace el supervisor manualmente, no hay flujo de correo electrónico.** `POST /users/:id/reset-password` genera una contraseña temporal, la devuelve una sola vez en la respuesta (nunca se persiste en texto plano ni se loguea), y marca `mustChangePassword: true` en el usuario para forzar el cambio en el siguiente login.
- No implementar registro público ni recuperación de contraseña por email — está fuera del alcance del proyecto intencionalmente.

## Convenciones de código

- Reglas por defecto de NestJS/oxlint/Prettier — sin reglas adicionales estrictas por ahora.
- Todo endpoint que recibe body usa un DTO validado con `class-validator`/`class-transformer`. No aceptar payloads sin tipar.
- Los servicios que llaman a Gemini (`GeminiService`, `EmbeddingsService`) deben ser mockeables en tests — no hardcodear la llamada HTTP directamente en otros servicios, siempre pasar por estos wrappers.
- Variables de entorno sensibles (`GEMINI_API_KEY`, `DATABASE_URL`, `JWT_SECRET`) solo en `.env`, nunca en el código ni en commits. Ver `.env.example` para la lista completa de variables esperadas.

## Testing

- Mockear `GeminiService` y `EmbeddingsService` en tests unitarios y e2e — no consumir la cuota real de la API de Gemini durante CI.
- Los tests del `RetrievalService` deben cubrir explícitamente el caso de umbral de confianza superado (sin match), no solo el caso feliz.

## Pendientes conocidos (no bloqueantes)

- **`TOP_K=5` en `RetrievalService` es insuficiente para catálogos con muchas variantes por tamaño.** Confirmado con el catálogo real (147 productos): una consulta sobre algas trajo solo variantes de Alguicida en el `TOP_K`, sin ningún producto de Shock Dicloro/Tricloro, aunque `knowledge_base` indica que ambos se usan juntos para ese tratamiento. El sistema funciona correctamente en lo demás (retrieval, umbral de confianza, trazabilidad) — esto es una afinación de calidad pendiente, no un bug bloqueante. Opciones a evaluar: subir `TOP_K`, o deduplicar por nombre base de producto antes de construir el prompt. Ver el comentario `TODO` en `src/retrieval/retrieval.service.ts`.

## Cosas que Claude Code NO debe hacer en este repo

- No usar `prisma db push` en ramas que apunten a producción.
- No agregar un segundo proveedor de LLM ni lógica de fallback — fue una decisión explícita del equipo simplificar a un solo proveedor (Gemini).
- No implementar Supabase Auth ni mover la tabla `users` fuera del schema `public`.
- No agregar flujos de recuperación de contraseña por correo electrónico.
- No cambiar el modelo de Gemini asignado a una tarea (tabla de arriba) sin confirmarlo explícitamente con el equipo.
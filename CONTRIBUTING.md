# Contribuir

Guía para trabajar en este repositorio.

---

## Flujo

### 1. Actualiza `main`

```bash
git checkout main
git pull origin main
```

### 2. Crea tu rama

```bash
git checkout -b <prefijo>/<nombre-descriptivo>
```

**Prefijos permitidos:**

| Prefijo     | Uso                                  |
| ----------- | ------------------------------------ |
| `feat/`     | nueva funcionalidad                  |
| `fix/`      | corrección de bug                    |
| `refactor/` | cambio sin alterar comportamiento    |
| `chore/`    | tareas varias (deps, config)         |
| `docs/`     | documentación                        |

**Ejemplos:**

```bash
git checkout -b feat/user-auth
git checkout -b fix/login-timeout
git checkout -b chore/update-deps
```

### 3. Commits

**Formato:**

```
<tipo>(<scope>): <descripción>
```

**Tipos válidos:**

| Tipo       | Uso                                    |
| ---------- | -------------------------------------- |
| `feat`     | nueva funcionalidad                    |
| `fix`      | corrección de bug                      |
| `docs`     | documentación                          |
| `style`    | formato (sin cambio de lógica)         |
| `refactor` | refactor sin cambio de comportamiento  |
| `perf`     | mejora de performance                  |
| `test`     | tests                                  |
| `build`    | build system o dependencias            |
| `ci`       | CI/CD                                  |
| `chore`    | tareas varias                          |
| `revert`   | revertir un commit                     |

**Ejemplos:**

```bash
git commit -m "feat(auth): add JWT login"
git commit -m "fix(api): handle timeout on /users"
git commit -m "chore(deps): bump nest to v10"
```

### 4. Push y abre PR

```bash
git push -u origin feat/nombre-descriptivo
```

Abre el PR apuntando a `main`, llena la plantilla y espera aprobación de [ErikCaballeroh](https://github.com/ErikCaballeroh).

El **título del PR** debe seguir Conventional Commits, porque será el mensaje del commit final en `main`.

### 5. Merge

Se mergea con **Squash and merge**. La rama se borra automáticamente.

---

## Antes de pedir review

```bash
pnpm lint
pnpm test
pnpm build
```

Los tres deben pasar sin errores.

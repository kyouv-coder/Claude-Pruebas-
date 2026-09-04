# Claude-Pruebas-

Repositorio de trabajo para construir **productos y servicios digitales viables para pymes**: validación de ideas, desarrollo rápido, y entrega con calidad mínima suficiente para lanzar.

Este repo usa [Claude Code](https://claude.ai/code) con un set curado de **skills** (`.claude/skills/`) pensado para moverse rápido sin perder rigor: de la idea al MVP, y del MVP a producción, para un cliente pyme a la vez o varios en paralelo.

## Proyecto actual: herramienta de gestión para pymes (multi-negocio)

SaaS con login propio: cualquier negocio se registra en `/signup` y administra, con sus propios datos aislados, reservas de citas/servicios, giftcards (venta/canje), caja/POS conectado a las reservas, gastos/impuestos mensuales, y un dashboard con métricas reales del negocio (ingresos, ocupación, ticket promedio, ganancia neta). Nació como MVP para una pyme de spa; el modelo de datos generaliza a cualquier negocio con turnos.

**Stack:** Next.js 16 (App Router, TypeScript), PostgreSQL, Prisma, autenticación propia (bcrypt + sesión firmada, sin dependencias de auth externas).

### Getting started

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, AUTH_SECRET, etc.
npx prisma migrate deploy
npm run db:seed        # crea un negocio de prueba con datos de ejemplo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) — te redirige a `/login`. Con el seed corrido, entrás con `admin@spa.local` / `changeme123` (cambiarla es una tarea pendiente, ver abajo), o creá tu propia cuenta en `/signup`.

### Pendiente / gaps conocidos

- No hay pantalla para cambiar la contraseña del admin.
- Solo el rol ADMIN inicia sesión; el staff todavía no tiene login propio.
- Sin deploy productivo todavía — guía de deploy a Vercel en progreso.

## Cómo usar las skills

Dentro de una sesión de Claude Code en este repo, invocá cualquiera con `/nombre-skill`, por ejemplo:

```
/project-sizing-guide
/scaffold
/ship
```

También se activan solas cuando el pedido calza con su descripción (ej: pedir "generame una landing page" dispara `landing-page-generator` automáticamente).

## Catálogo de skills

### 1. Validar y planificar el negocio
| Skill | Para qué sirve |
|---|---|
| `project-sizing-guide` | Estimar esfuerzo/tiempo de una feature o MVP (three-point, T-shirt size, FPA) |
| `vc-industry-research` | Investigación de mercado/industria para validar viabilidad |
| `regulatory-audit-generator` | Checklist de cumplimiento (GDPR, PIPL, publicidad/datos) antes de lanzar |
| `tos-clause-scanner` | Auditar Términos de Servicio / política de privacidad propios o de terceros |

### 2. Construir el producto
| Skill | Para qué sirve |
|---|---|
| `scaffold` | Bootstrap rápido de un proyecto nuevo |
| `nextjs-developer` | Apps Next.js 14+ (App Router, server components/actions) |
| `react-best-practices` | Patrones de performance de React/Next.js (Vercel Engineering) |
| `landing-page-generator` | Generar landing pages deploy-ready a partir del repo/README |
| `route-to-openapi` | Documentar automáticamente una API (OpenAPI/Swagger) desde el código |
| `database-scout` | Explorar bases SQLite/Postgres: tablas, esquemas, diagramas ER |
| `database-optimizer` | Optimizar queries lentas, índices, configuración |
| `pipeline-blueprint` | Plantillas de CI/CD (GitHub Actions / GitLab CI) |

### 3. Calidad sin perder velocidad
| Skill | Para qué sirve |
|---|---|
| `tdd-workflow-guide` / `test-driven-dev` | Ciclo red-green-refactor, testing primero |
| `generate-tests` | Generar tests para código existente |
| `refactor` | Refactor guiado sin sobre-ingeniería |
| `optimize` | Optimización de performance |
| `repo-audit` | Hotspots de código, ownership, secret scanning en el historial |
| `secure-code-review` / `security` / `security-audit` / `security-check` | Revisión de seguridad (OWASP Top 10) antes de entregar |

### 4. Flujo de trabajo / entrega
| Skill | Para qué sirve |
|---|---|
| `commit` | Commits mejor estructurados |
| `pr` / `review-pr` | Flujo de pull requests |
| `ship` | Llevar una feature de lista a producción |
| `release-notes-generator` | Changelog / anuncio de release en lenguaje entendible para el cliente |
| `data-viz-renderer` | Dashboards e infografías HTML/SVG autocontenidas |
| `timeline-builder` | Timelines de hitos del proyecto, roadmap visual |

### 5. Performance, memoria y seguridad avanzada
| Skill | Para qué sirve |
|---|---|
| `benchmark-optimization-loop` | Probar variantes y medir para elegir la implementación más rápida |
| `parallel-execution-optimizer` | Paralelizar tareas (agentes, worktrees, tool calls) sin perder correctitud |
| `content-hash-cache-pattern` | Cachear resultados costosos por hash de contenido, con auto-invalidación |
| `prompt-optimizer` | Optimizar prompts y uso de tokens |
| `context-budget` | Auditar qué está llenando la ventana de contexto (agentes, skills, MCP, rules) |
| `token-budget-advisor` | Gestión de presupuesto de tokens |
| `unified-memory` | Memoria compartida entre Claude, Codex, Cursor, OpenCode y otros agentes |
| `security-review` | Checklist de seguridad para auth, inputs, secrets, endpoints, pagos |
| `security-scan` | Audita el propio `.claude/` (config, hooks, MCP) en busca de riesgos de inyección |

### 6. Trabajar con varios clientes/proyectos a la vez
| Skill | Para qué sirve |
|---|---|
| `git-worktree` / `git-worktree-status` / `git-worktree-clean` | Trabajar en paralelo sin mezclar ramas de distintos clientes |
| `session-save` / `handoff-create` / `handoff-resume` | Guardar y retomar contexto entre sesiones |
| `skill-creator` | Crear skills propias para tareas repetitivas de cliente en cliente |
| `pyme-saas-scaffold` | Receta propia (extraída de este proyecto) para armar reservas + caja + giftcards + dashboard en el próximo cliente pyme, con el stack y los patrones ya probados acá |

### 7. Diseño y accesibilidad
| Skill | Para qué sirve |
|---|---|
| `hallmark` | Diseño anti-genérico para páginas/apps nuevas, auditorías y rediseños |
| `no-ai-design-slop` / `audit-ai-design-slop` | Detectar y evitar el look genérico de IA (gradientes de más, tarjetas glossy, paleta gris/negro por defecto) |
| `design-first-ui-prompting` | Prompts spec-driven para generar UI consistente |
| `editorial-service-booking` | Patrón visual para negocios con turnos (spas, salones, clínicas): papel cálido, serif+sans, acento contenido |
| `tailwindcss-design` | Recetas y convenciones de Tailwind para UI prolija |

## Flujo sugerido para un proyecto nuevo de pyme

1. **Validar**: `project-sizing-guide` + `vc-industry-research` para dimensionar y confirmar que vale la pena.
2. **Armar el esqueleto**: `pyme-saas-scaffold` (receta propia con el stack completo) o `scaffold`/`nextjs-developer` para casos más genéricos.
3. **Construir con tests primero**: `tdd-workflow-guide` + `generate-tests`.
4. **Diseño**: `hallmark` + `editorial-service-booking` (o la skill de diseño que corresponda al rubro) antes de dar por terminada una pantalla.
5. **Antes de entregar**: `secure-code-review` / `security-check`, `regulatory-audit-generator` si aplica.
6. **Entregar**: `commit` → `pr` → `ship`, con `release-notes-generator` para el reporte al cliente.
7. **Siguiente cliente**: `git-worktree` para no mezclar con el proyecto anterior, `session-save`/`handoff-create` para pausar y retomar.

## Origen de las skills

Curadas desde tres repos públicos de Claude Code:
- [zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide)
- [FlorianBruniaux/claude-code-ultimate-guide](https://github.com/FlorianBruniaux/claude-code-ultimate-guide)
- [affaan-m/ECC](https://github.com/affaan-m/ECC)

Se seleccionó un subconjunto orientado a negocio/producto, no el catálogo completo (que incluye pentesting, contenido educativo, etc. no relevante para este repo).

# Claude-Pruebas-

Repositorio de trabajo para construir **productos y servicios digitales viables para pymes**: validación de ideas, desarrollo rápido, y entrega con calidad mínima suficiente para lanzar.

Este repo usa [Claude Code](https://claude.ai/code) con un set curado de **skills** (`.claude/skills/`) pensado para moverse rápido sin perder rigor: de la idea al MVP, y del MVP a producción, para un cliente pyme a la vez o varios en paralelo.

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

### 5. Trabajar con varios clientes/proyectos a la vez
| Skill | Para qué sirve |
|---|---|
| `git-worktree` / `git-worktree-status` / `git-worktree-clean` | Trabajar en paralelo sin mezclar ramas de distintos clientes |
| `session-save` / `handoff-create` / `handoff-resume` | Guardar y retomar contexto entre sesiones |
| `skill-creator` | Crear skills propias para tareas repetitivas de cliente en cliente |

## Flujo sugerido para un proyecto nuevo de pyme

1. **Validar**: `project-sizing-guide` + `vc-industry-research` para dimensionar y confirmar que vale la pena.
2. **Armar el esqueleto**: `scaffold` (o `nextjs-developer` si es web).
3. **Construir con tests primero**: `tdd-workflow-guide` + `generate-tests`.
4. **Antes de entregar**: `secure-code-review` / `security-check`, `regulatory-audit-generator` si aplica.
5. **Entregar**: `commit` → `pr` → `ship`, con `release-notes-generator` para el reporte al cliente.
6. **Siguiente cliente**: `git-worktree` para no mezclar con el proyecto anterior, `session-save`/`handoff-create` para pausar y retomar.

## Origen de las skills

Curadas desde dos repos públicos de Claude Code:
- [zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide)
- [FlorianBruniaux/claude-code-ultimate-guide](https://github.com/FlorianBruniaux/claude-code-ultimate-guide)

Se seleccionó un subconjunto orientado a negocio/producto, no el catálogo completo (que incluye pentesting, contenido educativo, etc. no relevante para este repo).

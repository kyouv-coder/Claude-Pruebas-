# Claude-Pruebas-

Repositorio de trabajo para construir **productos y servicios digitales viables para pymes**: validación de ideas, desarrollo rápido, y entrega con calidad mínima suficiente para lanzar.

Este repo usa [Claude Code](https://claude.ai/code) con un set curado de **skills** (`.claude/skills/`) pensado para moverse rápido sin perder rigor: de la idea al MVP, y del MVP a producción, para un cliente pyme a la vez o varios en paralelo.

## Proyecto actual: herramienta de gestión para pymes (multi-negocio)

SaaS con login propio: cualquier negocio se registra en `/signup` y administra, con sus propios datos aislados, reservas de citas/servicios, giftcards (venta/canje), caja/POS con reconciliación al cierre, productos con stock, clientes con historial y notas, gastos/impuestos mensuales con export a CSV, un dashboard con métricas reales del negocio, un checklist de onboarding para cuentas nuevas, una página de soporte con FAQ, y un panel de Recomendaciones que analiza esos datos y avisa proactivamente qué necesita atención (clientes inactivos, stock bajo, giftcards por vencer, mes en rojo, diferencias de caja, no-shows repetidos). También tiene una página pública de reserva online por negocio (`/reservar/[slug]`) que respeta el horario de atención configurado (si hay uno) y muestra los horarios ya ocupados de cada profesional antes de que el cliente elija, además de la política de cancelación del negocio si la cargó. Nació como MVP para una pyme de spa; el modelo de datos generaliza a cualquier negocio con turnos.

Roles reales: ADMIN ve todo (finanzas, configuración, dashboard, recomendaciones); STAFF opera el día a día (reservas, caja, clientes, giftcards) sin acceso a ganancia neta ni precios.

**Stack:** Next.js 16 (App Router, TypeScript), PostgreSQL, Prisma, autenticación propia (bcrypt + sesión firmada, sin dependencias de auth externas), monitoreo de errores con Sentry (inactivo hasta configurar `SENTRY_DSN`), tests con Vitest (`npm test`).

### Getting started

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, AUTH_SECRET, etc.
npx prisma migrate deploy
npm run db:seed        # crea un negocio de prueba con datos de ejemplo
npm run db:seed:demo   # carga reservas, ventas, giftcards y gastos ficticios de septiembre
                        # sobre ese negocio, para probar caja/reservas/giftcards/dashboard con datos reales
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) — te redirige a `/login`. Con el seed corrido, entrás como admin con `admin@spa.local` / `changeme123`, o como staff con `staff@spa.local` / `changeme123` (ambas cambiables desde "Mi cuenta"), o creá tu propia cuenta en `/signup`.

### Para traer cambios nuevos y correr todo de una

Una vez que ya clonaste el repo y tenés el `.env` configurado, en vez de acordarte de cada paso suelto (`git pull`, `npm install`, migraciones, regenerar Prisma, cortar un servidor viejo que haya quedado colgado):

```bash
npm run actualizar
```

Hace todo eso en orden y levanta el servidor al final.

### Pendiente / gaps conocidos

- **Facturación electrónica**: no hay integración automática con ningún proveedor (Bsale u otro) — decisión consciente por ahora: en `Finanzas` cada venta tiene un botón para subir una foto o PDF del comprobante emitido aparte (por Bsale u otro sistema), y queda guardado junto a la venta. Si más adelante se quiere automatizar la emisión (no solo adjuntar), ahí sí hace falta el token de API de Bsale.
- **Recordatorios a clientes por WhatsApp/SMS**: hoy solo hay notificación a Slack para la dueña, no al cliente. Necesita una cuenta de Twilio o WhatsApp Business API.
- **Sentry**: el SDK está instalado pero inactivo (sin `SENTRY_DSN` configurado no envía nada).
- **Política de cancelación / seña real**: hoy hay un campo de texto libre (informativo) mostrado al cliente, pero no cobra una seña ni bloquea nada — necesita definir con el negocio si se cobra seña, cuánto, y con qué proveedor de pagos.
- **Soporte real**: hoy hay una página estática con FAQ y un email/WhatsApp de contacto (`src/lib/support.ts`, configurable por variable de entorno) — no hay ticketing ni chat en vivo.
- **Multi-sucursal**: el modelo de datos asume un negocio = una ubicación.
- **Página pública de reserva rediseñada**: `/reservar/[slug]` ahora es tipo landing — foto de portada, descripción, dirección, horario de atención plegable y tarjetas de servicio con foto, todo editable desde `Configuración → Página pública` y `Configuración → Servicios`. Las fotos se guardan en la propia base (sin depender de un servicio externo de storage).
- **Productos con foto y descripción**: igual que los servicios, cada producto (`Configuración → Productos`) ahora tiene descripción y foto propias, visibles en una vitrina en la página pública. El cliente puede pedir productos junto con su reserva (se pagan al retirarlos, como el servicio — no hay cobro online todavía) y el staff los ve listados junto a cada turno en `/admin/reservas`.
- **Paleta blanco y negro**: se cambió `globals.css` de la paleta crema/verde original a blanco y negro puro, a pedido del usuario.
- **Verificación en vivo del webhook de Slack**: se creó el canal `#pyme-notificaciones` y se cargó su Incoming Webhook en el negocio de prueba local, pero este sandbox bloquea las conexiones salientes a `hooks.slack.com` (política de red del entorno, no de la app), así que no se pudo confirmar que el mensaje llega de punta a punta. Falta probarlo contra un deploy real (Vercel no tiene esa restricción).
- **Cobertura de tests**: hay una suite (`npm test`, 39 tests) sobre la lógica más crítica (CSV injection, slugs, horarios, doble reserva, canje de giftcards y venta de productos sin sobregiro de saldo/stock, validación y aislamiento multi-tenant de comprobantes y fotos adjuntas), pero no cubre todo el código.
- Deploy productivo funcionando en Vercel (ver commits sobre Prisma binaryTargets, build con webpack en vez de Turbopack, y `postinstall: prisma generate`).

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
| `test-driven-dev` | Ciclo red-green-refactor, testing primero |
| `generate-tests` | Generar tests para código existente |
| `refactor` | Refactor guiado sin sobre-ingeniería |
| `optimize` | Optimización de performance |
| `repo-audit` | Hotspots de código, ownership, secret scanning en el historial |
| `secure-code-review` | Revisión de seguridad (OWASP Top 10) antes de entregar — la usamos varias veces sobre este mismo proyecto, es el workhorse real |
| `sentry` | Consultar errores de producción vía la API de Sentry (solo lectura) — requiere `SENTRY_AUTH_TOKEN` y que el proyecto ya tenga Sentry configurado |
| `web-accessibility` | Auditoría WCAG 2.1: contraste, teclado, lectores de pantalla, formularios |
| `web-quality-audit` | Auditoría completa (performance, accesibilidad, SEO, buenas prácticas) tipo Lighthouse, en un solo pase |

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
| `security-scan` | Audita el propio `.claude/` (config, hooks, MCP) en busca de riesgos de inyección — distinto de `secure-code-review`: este audita nuestra config de Claude, no el código de la app |

### 6. Trabajar con varios clientes/proyectos a la vez
| Skill | Para qué sirve |
|---|---|
| `handoff-create` / `handoff-resume` | Guardar y retomar contexto entre sesiones |
| `skill-creator` | Crear skills propias para tareas repetitivas de cliente en cliente |
| `pyme-saas-scaffold` | Receta propia (extraída de este proyecto) para armar reservas + caja + giftcards + dashboard en el próximo cliente pyme, con el stack y los patrones ya probados acá |

### 7. Diseño y accesibilidad
| Skill | Para qué sirve |
|---|---|
| `hallmark` | Diseño anti-genérico para páginas/apps nuevas, auditorías y rediseños |
| `no-ai-design-slop` | Quality gate pasivo mientras se construye UI, para no meter clichés de IA desde el principio |
| `audit-ai-design-slop` | Auditoría de algo ya construido (evidencia + plan de limpieza), complementa a `no-ai-design-slop` |
| `design-first-ui-prompting` | Prompts spec-driven para generar UI consistente |
| `editorial-service-booking` | Patrón visual para negocios con turnos (spas, salones, clínicas): papel cálido, serif+sans, acento contenido |
| `tailwindcss-design` | Recetas y convenciones de Tailwind para UI prolija |

### 8. Visibilidad en buscadores de IA
| Skill | Para qué sirve |
|---|---|
| `geo-llmstxt` | Generar/validar un `llms.txt` — el equivalente a `robots.txt` pero para que ChatGPT/Perplexity/etc. entiendan de qué trata el sitio. Útil el día que este SaaS tenga una landing pública propia |

## Agente propio: pyme-engineer

`.claude/agents/pyme-engineer.md` formaliza el rol de "ingeniero/administrador de guardia" de este proyecto: retoma el roadmap pendiente del README, elige un ítem acotado y técnico (nunca decisiones de negocio), lo implementa, valida con `tsc`/`lint`/`build`, y pushea. Es el agente que dispara la Routine programada de mantenimiento (cada 6 horas) para que el desarrollo siga avanzando sin supervisión directa, con límites duros explícitos (nunca mergea a `main`, nunca toca la base de producción, nunca inventa decisiones de negocio).

## Flujo sugerido para un proyecto nuevo de pyme

1. **Validar**: `project-sizing-guide` + `vc-industry-research` para dimensionar y confirmar que vale la pena.
2. **Armar el esqueleto**: `pyme-saas-scaffold` (receta propia con el stack completo) o `scaffold`/`nextjs-developer` para casos más genéricos.
3. **Construir con tests primero**: `test-driven-dev` + `generate-tests`.
4. **Diseño**: `hallmark` + `editorial-service-booking` (o la skill de diseño que corresponda al rubro) antes de dar por terminada una pantalla.
5. **Antes de entregar**: `secure-code-review`, `regulatory-audit-generator` si aplica.
6. **Entregar**: `commit` → `pr` → `ship`, con `release-notes-generator` para el reporte al cliente.
7. **Siguiente cliente**: `handoff-create` para pausar y retomar contexto.

## Origen de las skills

Curadas desde cinco repos públicos de Claude Code:
- [zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide)
- [FlorianBruniaux/claude-code-ultimate-guide](https://github.com/FlorianBruniaux/claude-code-ultimate-guide)
- [affaan-m/ECC](https://github.com/affaan-m/ECC)
- [tech-leads-club/agent-skills](https://github.com/tech-leads-club/agent-skills)
- [zubair-trabzada/geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) (solo `geo-llmstxt` — el resto es un toolkit de auditorías SEO para agencias, no aplica a este proyecto)

Se evaluó también [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) y no se adoptó nada: es un catálogo genérico de miles de skills de rol de negocio (C-level, marketing, compliance) duplicado sin cambios entre `.claude/`, `.codex/` y `.gemini/`, sin nada específico para un SaaS de reservas. El único candidato con nombre prometedor (`a11y-audit`) resultó ser solo un `SKILL.md` que documenta scripts Python de escaneo que en realidad no existen en el repo.

Se seleccionó un subconjunto orientado a negocio/producto, no el catálogo completo (que incluye pentesting, contenido educativo, etc. no relevante para este repo). Periódicamente se audita y se sacan duplicados — ver "Pasada de limpieza" más abajo.

### Pasada de limpieza (56 → 47 skills)

Usando la skill `context-budget` sobre nuestro propio `.claude/`, se sacaron 9 skills redundantes o muertas:
- **4 duplicados de seguridad** (`security`, `security-audit`, `security-check`, `security-review`) — quedó solo `secure-code-review` (el que realmente usamos) + `security-scan` (que audita algo distinto: la config de Claude, no el código de la app).
- **3 de git-worktree** (`git-worktree`, `git-worktree-status`, `git-worktree-clean`) — referenciaban comandos en `.claude/commands/` que nunca existieron en este repo, y este proyecto no trabaja con worktrees paralelos.
- **`tdd-workflow-guide`** — duplicado casi exacto de `test-driven-dev`.
- **`session-save`** — duplicado de `handoff-create` (que además tiene su contraparte `handoff-resume`, cosa que `session-save` no tenía).

# Checkpoint operativo — SEO Dashboard V2

Última actualización: 24 de septiembre de 2026 (shadcn/ui y dashboard-01 en el visor, D-044, rama `feat/shadcn-dashboard`).

## Patrón de la ficha en todo el visor · D-049 (2026-09-25, en producción)

- Hecho: clases globales (`apps/viewer/app/globals.css`) y `MetricCard`/`.ds-metric-strip`
  (`packages/ui`) con el lenguaje de la ficha; portada sin tarjetas (`components/dashboard.tsx`,
  `chart-area-interactive.tsx`, `overview.css`); lista de fuentes en `/data`; pestañas del
  editorial sin iconos; filtros con selección suave.
- Desplegado (1698f76) y comprobado en producción. Reanudar: incidencias de `pnpm axe`
  ajenas al rediseño (ver SESSION_LOG).

## Bloqueo de bots e IA · D-048 (2026-09-25, en producción)

- Hecho: `apps/viewer/lib/crawlers.ts` + pruebas, 403 a bots en `proxy.ts` (login
  incluido), `robots.ts` en visor y workbench, `X-Robots-Tag` ampliada y `TDM-Reservation: 1`.
- Desplegado (0a24cd7) y verificado en producción: bots → 403, navegador → 307/401.
  Firewall de Vercel publicado por CLI: Bot Protection en Challenge y AI Bots en Deny
  (`vercel firewall status`). Si un cliente legítimo sin navegador queda bloqueado,
  crear una regla bypass (`vercel firewall rules`).

## Login con Google · D-047 (2026-09-25, en producción)

- Hecho: proveedor Google y lista `ALLOWED_GOOGLE_EMAILS` (`apps/viewer/auth.ts`,
  `lib/access.ts` con pruebas), 401 JSON en `/api/*`, login con error
  `AccessDenied` y cierre de sesión en el pie de la barra lateral. Entra queda
  preparado y se activa por variable.
- Desplegado: proyecto GCP `seo-intelligence-viewer` (Google Auth Platform en
  modo Prueba, cliente web «SEO Intelligence Visor»), variables en Vercel,
  `PUBLIC_ACCESS` eliminada. Login real verificado; bloqueo `public-viewer` resuelto.
- Dar acceso: el email va en `ALLOWED_GOOGLE_EMAILS` (Vercel, producción) **y** en
  los usuarios de prueba de Google Auth Platform; después, `vercel deploy --prod`.
  En la consola, «Guardar» de usuarios de prueba puede no aplicarse: comprobar el recuento.

## Rediseño shadcn · D-044/045/046 (2026-09-24, fusionado en main y desplegado)

- Rama `feat/shadcn-dashboard`. Tailwind v4 + shadcn/ui en `apps/viewer`;
  tokens shadcn en `app/tailwind.css` apuntando a `--ds-*`.
- Hecho: shell común (`components/app-shell.tsx`, `app-sidebar.tsx`,
  `site-header.tsx`) para todas las vistas y portada (`dashboard.tsx`,
  `section-cards.tsx`, `chart-area-interactive.tsx`). Menú antiguo retirado de
  `globals.css`. Typecheck, 426 pruebas y build del visor en verde.
- Reanudar: revisión visual del usuario; después migrar el interior de proyectos,
  editorial, informes, acciones y datos a `components/ui/*` (Card, Tabs, Table,
  Badge, Button), revisar tablet 768 y reejecutar `pnpm axe` antes de fusionar.


## Menú principal · D-043 (2026-09-24)

- `AppShell` integra `NavigationLinkContent` y `NavigationFeedback` mediante
  `useLinkStatus` de Next: icono de actividad, barra fina y «Abriendo [destino]…».
- Menú móvil cierra al navegar, devuelve foco al botón y mantiene el aviso visible.
  Sin cambios de layout ni porcentajes artificiales; respeta movimiento reducido.
- QA en 1440/375 px: ruta lenta, ruta cacheada, teclado, cierre/foco móvil y
  cambio de destino. Typecheck 9 paquetes, 90 tests viewer y build correctos.
- Dev activo en 3000/3001, cambios solo locales. Se mantiene el siguiente paso
  P3.1 y decisiones D-035, salvo feedback o petición de despliegue.

## Reanudación prioritaria · Estados de carga (D-042, 2026-09-24)

- Dev levantado con `pnpm dev`: visor 3000 y workbench 3001. D-040/041/042
  permanecen locales; no se ha desplegado esta ampliación.
- `ReportNavigationProvider` coordina mercado, periodo y pestaña sobre la última
  URL solicitada. Selección optimista, aviso de actualización y skeletons por
  zonas; los datos anteriores afectados quedan ocultos e inertes.
- `@seo/ui/skeleton` compartido, respeto a movimiento reducido, feedback de
  demora y estados inicial/error de proyecto. El servidor sigue entregando
  el informe completo; no afirmar streaming independiente de fuentes.
- Corregidos dos fallos encontrados en QA: Resumen desde `chapter` antiguo y
  borrador abierto del calendario sobrescrito por una respuesta pendiente.
- Verificado con datos reales de Xtone en 1440/768/375 px: carga inicial,
  cambios de mercado/periodo, filtros combinados, tabla keywords estable,
  selección de fechas conservada y enlaces V1. Typecheck 9 paquetes, suite
  actual de 426 pruebas y build viewer/workbench. Error/reintento revisado
  en código y build; no se forzó una caída de proveedor en navegador.
- **Siguiente paso exacto:** retomar P3.1 (Neon Frankfurt) y decisiones de D-035,
  salvo feedback o solicitud de despliegue. P3 25%; P2 bloqueada 79%.

## Reanudación prioritaria · UX/UI global (D-041, 2026-09-23)

- El usuario aprobó Xtone y pidió incorporar el diseño a todo el proyecto.
  Aplicado en local a inicio, conjunto, directorio, informes de marca, editorial,
  acciones, cronología, fuentes, archivo/detalles y workbench.
- `components/report/brand-report.tsx` es ahora la vista compartida para
  Porcelanosa, Noken y Xtone. Cinco pestañas base y Migración cuando hay datos.
  Se conservan fuentes, cortes, comparaciones, muestras GSC y estados sin dato.
  No reintroducir conclusiones automáticas sin petición del usuario.
- Tabla común en `@seo/ui/data-table`: búsqueda, orden por valores crudos,
  10/25/50/100 filas, paginación, impresión y enlaces por hash a registros.
  Las pruebas de búsqueda/orden viven ahora en `packages/ui`.
- Backlog/propuestas conservan filtros/orden/paginación en URL; el CSV incluye
  todos los resultados filtrados. Filtros móviles plegables con búsqueda visible.
  Calendario mantiene agenda móvil. Workbench conserva sus Server Actions.
- Tipografía sans, UI/tablas 14 px, distribución según número de KPIs y menú
  compacto por debajo de 1440 px. Gráficos ECharts y tokens compartidos.
- Verificaciones: typecheck 9 paquetes, 393 pruebas y build viewer/workbench.
  QA visual y funcional integrado en desktop, tablet y móvil; no sustituye Axe.
  Dev continúa en 3000/3001. No se ha desplegado esta extensión.
- **Siguiente paso exacto:** retomar P3.1 (Neon Frankfurt) y decisiones pendientes
  de D-035, salvo nuevo feedback visual o petición explícita de despliegue.
  La mejora UI no cierra criterios: P3 activa 25%; P2 bloqueada 79%.

## Objetivo permanente

Construir una plataforma SEO de referencia sectorial que no se limite a mostrar
métricas: debe explicar qué cambió, por qué importa, qué evidencia existe, qué decisión
tomar, quién debería ejecutarla y cómo sabremos si funcionó.

## Estado actual

- `P0` completada: monorepo, contratos, datos sintéticos, visor, workbench,
  DuckDB/Parquet, PostgreSQL/Drizzle, Auth.js, APIs, exportaciones, seguridad base,
  cron y pruebas.
- `P1` **completada** el 2026-09-03: sistema visual compartido, contrato editorial,
  calendario general de las ocho marcas, curación en el workbench, reciprocidad de
  enlaces, primitivas de decisión y QA de accesibilidad con Axe. Sus dos criterios
  dependientes de dato real (ventanas de 28/90/180 días y recorrido completo
  oportunidad -> resultado) se trasladaron a `P3.5` con el mismo alcance (D-017).
- `P2` **bloqueada al 79%** (no completada): paridad crítica con V1. `P2.1`,
  `P2.2` y `P2.3` cerradas; de `P2.4` está ejecutado el primer criterio
  (reconciliación) y cerrado el tercero (registro de retiradas). 11 de los 14
  criterios. Lo que queda son decisiones del responsable y dependencias de
  P3/P5/P6/P8, no desarrollo pendiente (D-027).
- `P3` **activa al 25%**: hechos los cuatro criterios que no dependen de
  credenciales —adapter de repositorio (D-028), catálogo de métricas (D-029),
  reparto idempotente de la ingesta diaria (D-030) y reglas de ejecución por
  `SyncRun`: cuota, reintento, lock y parcialidad declarada (D-031)—. La lectura
  real de GA4 y Search Console, la instancia Neon y las identidades de servicio
  exigen presupuesto y credenciales.
- **Visor desplegado** el 2026-09-23 en https://seo-dashboard-viewer.vercel.app
  (Vercel, `fra1`, proyecto `seo-dashboard-viewer`, raíz `apps/viewer`) con
  **dato real** de GA4 y Search Console para el piloto a través del origen
  `SEO_DATA_SOURCE=live` (D-034), que lee en directo con las credenciales de V1.
  Es un puente hasta el almacén: no cierra ningún criterio de `P3.2`. Acceso
  **público temporal** (`PUBLIC_ACCESS=true`, D-035) hasta registrar Entra. El
  workbench sigue siendo solo local. Redesplegar: `vercel deploy --prod --yes`
  desde la raíz del repo (lee `.vercelignore`).
- El piloto de datos cubre Porcelanosa, Noken y Xtone; el calendario editorial ya
  cubre las ocho marcas, y ahora se puede curar de extremo a extremo desde el workbench.
- Bloqueo: el disco lo **mide** `pnpm status` al abrir sesión y sale con código 1
  por debajo de 3 GiB; no lo escribas aquí. No ejecutar crawls hasta alcanzar
  50 GiB.

## Lo que ya funciona y no hay que rehacer

1. **Sistema visual compartido.** `packages/ui/src/tokens.css` es la única fuente de
   color, tipografía, espaciado, foco e impresión. `packages/ui/src/echarts-theme.ts`
   da el tema de gráficos. Viewer y workbench lo importan y no declaran variables
   `--ds-*` propias. No reintroduzcas colores en línea.
2. **Contrato editorial** `editorial.v1` en `packages/contracts/src/editorial.ts`:
   pieza, evento, bloque temático, hueco, propuesta, procedencia, brief con hash y
   ventanas de medición a 28, 90 y 180 días. `editorialLinkSchema` está extraído y
   reutilizado. `editorialProvenanceSourceSchema` añade `"workbench"` como fuente
   válida sin tocar `editorialSourceKeySchema` (que sigue siendo solo las 4 fuentes V1).
3. **Importación V1** en `packages/editorial`. `normalize.ts` es puro; `import.ts`
   archiva y escribe. Ejecuta `pnpm editorial:import` (añade `--force` para reescribir
   sin cambios en las entradas). Recuentos verificados: 39 eventos, 115 filas de
   backlog, 146 de plan, 34 huecos y 68 propuestas, sin rechazos.
4. **Curación editorial (P1.4, D-012).** `packages/editorial/src/curation.ts` (puro:
   `applyCuration`, `upsertPieceCuration`, `upsertSlotCuration`, `upsertEventCuration`,
   `buildPieceFromInput`, `findPieceCuration`) y `curation-store.ts` (I/O síncrono
   sobre `packages/editorial/data/curation/editorial-curation.json`, separado del
   dataset importado). `getEffectiveEditorialDataset()` en `@seo/editorial/dataset`
   fusiona ambos; es lo que consume el visor (`apps/viewer/lib/editorial.ts`). Cada
   pieza/hueco/evento curado guarda versión, autor, nota e historial completo.
5. **Workbench editorial.** Sección `/editorial` en `apps/workbench` (tabs Piezas,
   Propuestas, Eventos), con Server Actions en `apps/workbench/app/editorial/actions.ts`
   como único punto de escritura. Permite crear pieza, editar estado/tipo/intención/
   cluster/objetivo/hipótesis/impacto/esfuerzo/owner/autor/revisor/criterio de éxito/
   enlaces/programación, elegir la propuesta de un hueco y vincular un evento a una
   pieza real (sustituyendo la heurística por marca/mes). El visor sigue sin ninguna
   ruta de escritura: la propiedad "solo lectura" es estructural.
6. **Prioridad explicable.** `editorialPiecePriority` en `packages/contracts/src/scoring.ts`:
   impacto ÷ esfuerzo, con la fórmula visible; `null` si falta un componente. Se
   muestra en el detalle del visor y en el formulario del workbench.
7. **Reciprocidad de `links` (P1.4, D-015).** `packages/editorial/src/links.ts`
   (puro: `buildBacklinkIndex`, `backlinksFor`, `listBacklinks`, `linkTargetHref`,
   `editorialPieceHref`, `linkKey`) deriva la relación inversa del mismo array
   `piece.links`; no hay segundo almacén. En el visor,
   `editorialBacklinks(kind, id)` y el componente
   `components/editorial/backlinks.tsx` la muestran en las fichas de insight,
   acción, query, página e informe, y `/api/v1/editorial/backlinks` la sirve en
   JSON. Los enlaces de ida son navegables desde el detalle de la pieza;
   `cluster` y `result` se muestran como texto porque su ficha llega en P6/P9.
8. **Primitivas de decisión (P1.5).** `DecisionThread`, `InsightStack`,
   `ChartFrame` y `DataTablePanel` en `@seo/ui`, con su CSS en `tokens.css`
   (`.ds-thread`, `.ds-insight-stack`, `.ds-chart-*`) y ya en uso:
   `ChartFrame` en fichas y `DecisionThread` en el archivo de informes. D-041
   retira `InsightStack` de resúmenes y promueve `ReportDataTable` para la
   exploración común; las primitivas anteriores siguen disponibles.
9. **Accesibilidad con Axe (D-016).** `pnpm axe` ejecuta `axe-core` sobre las dos
   apps a 1440 y 375 px. Última auditoría automática completa: 2026-09-03, 36 combinaciones,
   0 incumplimientos y 0 avisos; D-040/D-041 tienen QA manual de navegador. No vuelvas a declarar accesibilidad solo con el script propio.
10. **Permisos con cobertura automatizada.**
   `apps/viewer/lib/permissions.test.ts` falla si el visor exporta un método de
   escritura, declara un Server Action o importa un módulo de escritura, y
   cubre el token de servicio; `apps/workbench/lib/permissions.test.ts` fija que
   la escritura solo pasa por `app/editorial/actions.ts`.
11. **Rutas del visor**: `/editorial/calendario`, `/editorial/backlog` y
   `/editorial/propuestas`, más redirección 308 desde `/conjunto/plan-editorial`.
12. **APIs**: `/api/v1/editorial/{calendar,pieces,pieces/[id],slots,import-report,backlinks}` y
   `/api/v1/editorial/export/{plan-editorial-conjunto.csv,plan-editorial-propuestas.csv}`.
13. **Capturas**: `pnpm screenshots --out docs/design/screenshots/after` con el servidor
   en marcha. Nunca uses `--window-size` por debajo de 500 px con Chrome headless.
14. **Inventario de migración (P2.1, D-018).** `docs/continuity/v1-migration-inventory.json`
   es la fuente: 23 superficies de V1 con fuentes, transformaciones, filtros,
   exportaciones, dependencias y clasificación (`retain`, `redesign`, `merge`,
   `defer`, `retire`), más 8 datasets con muestra, comparación, tolerancia motivada
   y salida ante desviación. El esquema está en `packages/contracts/src/migration.ts`
   y lo validan 7 pruebas; `pnpm migration:report` renderiza
   `docs/continuity/V1_MIGRATION_INVENTORY.md` y `pnpm migration:check` falla si
   divergen, si falta una ruta de `V1_PARITY.md`, si una fase no existe en el
   roadmap o si una retirada llega sin alternativa. No edites el Markdown a mano.

15. **Taxonomía única de marcas (P2.2, D-019).** `packages/contracts/src/taxonomy.ts`
   declara `BRAND_SLUGS` y `BRANDS` (slug, nombre, código, dominio, piloto, ola y
   `v1Sources`). `PILOT_PROJECTS`, `EXPANSION_PROJECTS`, `editorialBrandSlugSchema`
   y `EDITORIAL_BRANDS` se derivan de ahí y conservan su nombre público. No
   añadas una segunda lista: una prueba de `portfolio.test.ts` falla si divergen.
   `v1Sources` refleja lo que la V1 tenía conectado de verdad por marca.
16. **Visión transversal del grupo (P2.2, D-020).** Contrato y agregación pura en
   `packages/contracts/src/portfolio.ts`: `aggregatePortfolio` es la única fuente
   de totales, mercados, objetivos, cuotas, cobertura y explicaciones, y
   `buildPortfolioNarrative` deriva las notas con reglas fijas (mayor caída y
   mayor avance por mercado, concentración de cuota, objetivo más rezagado y
   cobertura), no con prosa. El generador sintético es `getMockPortfolio` en
   `mock.ts`, que produce serie **solo** para Porcelanosa y Noken y deriva las
   cifras de la marca de sus filas de mercado (por eso la suma por mercados y el
   total cuadran con cualquier filtro). Las seis marcas restantes llegan con
   `analytics: null` y motivo. La actividad editorial de las ocho la aporta
   `brandEditorialActivity` en `@seo/editorial` y es dato real.
   Superficie: `apps/viewer/app/portfolio/page.tsx` + `lib/portfolio.ts` +
   `components/portfolio/market-bars.tsx`. Redirección 308 desde `/conjunto`.
17. **Estado de filtros compartible sin JavaScript (P2.2).** `parsePortfolioFilters`,
   `portfolioFilterQuery` y `togglePortfolioBrand` en `portfolio.ts`; cada control
   de `/portfolio` es un `<Link>`. El orden de marcas se normaliza al canónico,
   una marca desconocida se descarta sin romper el enlace y la query string omite
   los valores por defecto. `/api/v1/portfolio` lee el mismo estado.

18. **Informes y archivo histórico (P2.3, D-021).** `packages/contracts/src/reports.ts`:
   `REPORT_CHAPTERS` es el catálogo fusionado de los dos informes de V1 (19
   secciones reales -> 16 capítulos) con estado, fase, superficie y hueco de cada
   uno, y `buildReportArchive` filtra y deriva la cobertura. Regla que no se debe
   relajar: un informe no puede declarar un capítulo `pendiente`, y hay prueba.
   El acceso es `apps/viewer/lib/reports.ts` (`getReportArchive`, `findReport`) y
   es la **única** fuente del informe para `/reports`, `/reports/[id]`,
   `/api/v1/reports/[id]` y `/api/v1/exports/[id].csv`. Una versión publicada no
   se reescribe: la corrección es otra versión con `changeNote`.
19. **Rutas heredadas de V1 (P2.3, D-022).** `apps/viewer/lib/legacy-routes.ts`
   cataloga las cinco redirecciones; `next.config.ts` las declara.
   `legacy-routes.test.ts` falla si las dos listas divergen, si una redirección
   de V1 no es 308 o si un destino `partial` no arrastra su `?from=`. Para añadir
   una ruta heredada: entrada en el catálogo **y** redirección en el config; si el
   destino no es equivalente, `kind: "partial"` con `missing` y `phase`, y pinta
   `<LegacyNotice from={input.from} />` en el destino.

20. **Cronología y seguimiento de acciones (P2.3, D-023).**
   `packages/contracts/src/timeline.ts`: `buildTimeline` es puro, agrupa por mes
   y separa **dos horizontes** por el corte del dato (`past` descendente,
   `upcoming` ascendente). El carril `contexto-externo` —el radar de V1— existe
   con su fase P4 y sin hitos a propósito. `trackAction(action, asOf)` mide el
   plazo contra el corte, nunca contra el reloj: no lo cambies a `Date.now()`, se
   volvería no determinista y mentiría sobre snapshots antiguos. El ensamblado
   está en `apps/viewer/lib/timeline.ts` y traduce cuatro fuentes existentes sin
   copiar datos; cada versión publicada de informe es su propio hito.
21. **Catálogo de herramientas locales (P2.3, D-024).**
   `packages/contracts/src/local-tools.ts` con 12 utilidades y
   `/herramientas` del workbench. `disponible` significa ejecutable ahora: hay
   pruebas que exigen punto de entrada a las disponibles, motivo a las bloqueadas
   y fase a las pendientes, y que la fase coincida con la que fijó el inventario
   de P2.1. `WorkbenchNav` (en `components/workbench-frame.tsx`) es la navegación
   compartida de las tres secciones del workbench.

22. **Nada se enseña escrito a mano (D-025).** Se corrigieron cuatro superficies
   que presentaban texto fijo como si fuera dato: la ventana temporal y la
   prioridad de `/` (ahora `periodWindowSchema` + `rankInsight`), el resumen y el
   índice de `/reports/[id]` (ahora del propio informe y de sus capítulos
   declarados), la portada del workbench (ahora `apps/workbench/lib/state.ts`,
   que lee informe de importación, curación y disco) y la secuencia de expansión
   de `/projects` (ahora `expansionWaves()`). Antes de añadir texto con cifras o
   nombres a una pantalla, comprueba si sale de una fuente: el barrido con `grep`
   sobre el JSX está limpio y conviene que siga así. La ventana temporal es
   `periodWindowSchema` + `buildPeriodWindow(period, cutoff)` en
   `packages/contracts/src/schemas.ts`, y la tarjeta de «Prioridad del periodo»
   se elige con `rankInsight` sobre `executiveInsights`. No vuelvas a escribir a
   mano un rango de fechas ni una conclusión destacada en `/`: las dos versiones
   escritas a mano mentían —el rango ignoraba el periodo elegido y la tarjeta
   atribuía a Noken un riesgo de Porcelanosa—.

15. **Reconciliación ejecutable (P2.4, D-026).** `pnpm reconcile` mide el disco de
   V1, hashea cada fuente y congela el resultado en
   `docs/continuity/v1-reconciliation-baseline.json`; `pnpm reconcile:check` falla
   si algo se desvía y `pnpm reconcile:capture` es el único modo que reescribe el
   baseline. El esquema está en `packages/contracts/src/reconciliation.ts` y lo
   validan 15 pruebas. Estados actuales: 1 reconciliado (editorial), 4 con baseline
   congelado (SEMrush, crawls, canibalización, prompts GEO), 2 bloqueados (GA4,
   GSC) y 1 no comparable (tareas). La raíz de V1 es configurable con `V1_ROOT` y
   el check funciona sin la V1 delante, avisando de que no la ha reverificado.
   **Un baseline congelado no es paridad**: es la muestra medida antes de migrar,
   para que P3/P5/P6/P8 comparen contra un número con hash. No edites
   `V1_RECONCILIATION.md` a mano.

16. **Adapter de repositorio (P3.1, D-028).** `@seo/repository`: la lectura
   analítica ya no llama al conector sintético por su nombre. `resolveRepository()`
   elige el origen con `SEO_DATA_SOURCE` (sin variable: sintético) y el visor lo
   consume en `lib/data.ts` y `lib/portfolio.ts`, ambos ya asíncronos. **El aviso
   de procedencia sale de `describe()`, no del JSX**, así que P3.2 se implementa
   rellenando `createPostgresRepository()` sin tocar ni una pantalla. Un origen no
   disponible lanza `RepositoryUnavailableError` con remedio y **nunca** cae al
   sintético, ni con una errata en la variable: eso es deliberado y hay pruebas.
17. **Catálogo de métricas (P3.1, D-029).** `packages/contracts/src/catalog.ts`
   declara las 6 métricas (fuente, agregación, desfase, ventana mínima,
   definición, salvedad), las 7 fuentes (cadencia y fase que las conecta),
   `Europe/Madrid` y `EUR`. `aggregateMetric` es **la única función que agrega
   métricas** en el monorepo: si necesitas otra regla, se añade ahí y se declara,
   no se escribe en la superficie. Sumar porcentajes está prohibido por contrato.
   Las etiquetas y direcciones de los totales de `/portfolio` y el estado de
   conexión de las fuentes se derivan del catálogo.
18. **Ingesta diaria idempotente (P3.2, D-030).** `packages/sync/src/plan.ts`
   (puro: `planIngestion`, `ingestionWindow`, `ingestionJobKey`, `REPROCESS_DAYS`),
   `ledger.ts` (`InMemoryIngestionLedger`, `fingerprintRows`, `snapshotStaleness`)
   e `ingest.ts` (`runIngestionCycle`, `DailySourceReader`, `SyntheticDailyReader`).
   **La unidad de trabajo es el día, no la ventana**: la clave es
   `proyecto:fuente:día` y no depende del reloj, así que el mismo día ingerido en
   dos ciclos distintos no puede escribirse dos veces. El desfase y la cadencia
   salen de `SOURCE_CATALOG`; no vuelvas a escribir un `D-3` a mano. Reingerir
   contenido idéntico es `unchanged`, distinto es `revised` con huella anterior y
   contador. El libro solo se escribe en el éxito, de modo que un fallo conserva
   el último snapshot válido; `snapshotStaleness` publica la antigüedad y separa
   el retraso (`behindDays`) del hueco dentro de la ventana (`missingDays`).
   Ejecuta `pnpm ingest:dry-run` (acepta `--cycles`, `--at` y `--fail-day`): sale
   con código 1 ante un duplicado, una deriva o un hueco. Para conectar GA4 o
   Search Console de verdad se implementa `DailySourceReader` con
   `realData: true`; **no** se toca el planificador ni el libro.

19. **Reglas de ejecución de la sincronización (P3.3, D-031).**
   `packages/sync/src/policy.ts` (cuota, clasificación de fallos, backoff y lock)
   y `run.ts` (`SyncRunRecorder`, estado del ciclo). Son provider-agnósticas y el
   ciclo diario de D-030 ya las aplica: `runIngestionCycle` acepta un `policy`
   opcional y, si no se lo pasas, **activa cuota y lock en memoria por defecto**;
   desactivarlos hay que pedirlo (`quota: null`). Reglas que no se renegocian:
   la cuota se reserva ANTES de llamar y cada reintento se cobra al mismo
   presupuesto; el fallo se clasifica por tipo o por código y nunca por el texto
   del mensaje (`RateLimitedError`, `TransientSourceError`,
   `PermanentSourceError`, o `status`); lo permanente no se reintenta y un día
   vacío tampoco; la espera crece con dispersión y respeta la que pide la fuente,
   con techo por intento y por job; el lock lleva ficha creciente y se comprueba
   justo antes de escribir, no al empezar. Un `SyncRun` con algún día fuera es
   `partial`, nunca `complete`, y `deferred` (sin cuota o lock ocupado) no cuenta
   como fallo. Los presupuestos de `QUOTA_BUDGETS` son los que V2 se impone, no
   los del proveedor: llevan `verifiedAgainstProvider: false` hasta que alguien
   los compare con el contrato real. `pnpm ingest:dry-run` ejecuta los ciclos con
   las reglas puestas y añade tres escenarios (lock ocupado, cuota agotada,
   fuente intermitente).

## Siguiente incremento exacto

**Informe ejecutivo (D-037, 2026-09-23 cierre).** `/projects/xtone` (y
Porcelanosa, Noken) es el informe para gerencia y dirección con dato real. Punto
exacto de reanudación: recoger el feedback de la prueba con dirección y, después,
hacer revisables en el workbench las lecturas automáticas (hoy rotuladas
«pendiente de revisión»). Cambiar la forma del informe exige subir
`BRAND_REPORT_VERSION` para invalidar la caché.

**Xtone (D-036, 2026-09-23 tarde).** Xtone es marca piloto con dato real y
oportunidades de GSC; la ficha `/projects/xtone` es la base de la presentación
de Xtone. El piloto es ahora Porcelanosa, Noken y Xtone. Hallazgo principal: la
migración de URLs del 2026-07-23 (anotada en la serie) explica la caída de
clics. Pendiente: confirmar el salto de `generate_lead`.

**Novedad 2026-09-23 — punto exacto de reanudación.** El visor ya está en
producción con dato real (D-034/D-035). Antes de seguir con P3:

1. Pedir al responsable dos decisiones: autenticación (registrar la app en
   Microsoft Entra, rellenar `AUTH_MICROSOFT_ENTRA_ID_*` y
   `ALLOWED_ENTRA_OBJECT_IDS` en Vercel y **quitar `PUBLIC_ACCESS`**) y plan de
   Vercel (la cuenta es Hobby, reservada a uso no comercial).
2. Confirmar con analítica el salto de `keyEvents` de Porcelanosa en el año
   previo a la ventana de 24 meses (~1,9 M frente a ~32 k): probable cambio de
   configuración de eventos clave.
3. Las credenciales de Google ya no bloquean: `P3.1` (Neon Frankfurt) y el
   lector real de `P3.2` pueden reutilizar `packages/repository/src/live/google.ts`
   y `figures.ts` como cliente de GA4/GSC dentro de `DailySourceReader`.
4. Candidatos inmediatos sobre el origen `live`: el resto de marcas con
   credenciales en V1 (Butech, Antic Colonial, Krion, Gamadecor) siguiendo el
   patrón de Xtone en `packages/repository/src/live/brands.ts`.

**Las dos cosas que más valor aportan siguen dependiendo de algo externo al
desarrollo**, y conviene decirlo sin rodeos:

1. **Credenciales y presupuesto** para el resto de `P3`: Neon PostgreSQL
   Frankfurt, GA4, Search Console y SEMrush. Cuando lleguen, el orden es:
   instancia Neon con migraciones y pooling (`P3.1`), identidades de servicio y
   lector real enchufado a `DailySourceReader` más
   `createPostgresRepository()` (`P3.2`) —que por diseño no tocan ninguna
   pantalla ni el planificador— y después `pnpm reconcile`, donde los contratos
   `ga4-daily` y `gsc-daily` deben cuadrar contra el baseline congelado.
2. **Sesión de aceptación de `P2` con el responsable SEO**: desbloquea dos
   criterios y la decisión sobre las cuatro rutas en `missing`. El guion está en
   [`docs/continuity/P2_ACCEPTANCE.md`](../docs/continuity/P2_ACCEPTANCE.md).

Lo que sí se puede seguir programando sin credenciales es la **regla** que la
integración tendrá que respetar, no su fachada. Ese es el criterio con el que se
escribió D-030 y el que decide qué se hace a continuación:

3. **Agregados y caché por snapshot (`P3.4`)**: es lo siguiente que admite
   trabajo previo sin credenciales, y por el mismo criterio que D-030 y D-031.
   La invalidación se puede escribir y probar contra el libro de ingesta, porque
   su disparador es el snapshot —la huella del día, que ya existe— y no el motor
   de base de datos. Lo que hay que decidir y probar es qué invalida un
   `revised` frente a un `unchanged`, y qué hace una caché cuando el `SyncRun`
   que la alimenta terminó `partial`: servir lo anterior declarando su
   antigüedad, nunca mezclar mitad nueva y mitad vieja sin decirlo.

Hecho ya y no pendiente: las cuotas, reintentos y locks por `SyncRun` de `P3.3`
(D-031), que hasta esta sesión solo estaban enunciados en el roadmap. Lo que
queda de `P3.3` son sus otros dos criterios —SEMrush semanal y CrUX/PageSpeed—,
que sí dependen de credenciales. Las reglas ya están escritas y verificadas: los
lectores semanales las heredan sin volver a discutirlas.

Lo que NO se debe hacer es rellenar `createPostgresRepository()` o un
`DailySourceReader` con datos sintéticos y declararlos reales para «avanzar»: el
adapter (D-028) y los `describe()`/`realData` de los lectores (D-030) existen
precisamente para que eso sea imposible sin que se note.

Recuerda al abrir la sesión con el responsable: **ninguna cifra analítica de V2
es real todavía**. Lo que se puede aceptar hoy es equivalencia de superficie,
filtros, navegación, trazabilidad y explicabilidad. Y sigue abierto el conflicto
del criterio de salida de `P2`: cuatro capacidades en `missing`
(`/tracking/autoridad-tematica`, `/tracking/prompts-geo`, `/canales/sem`,
`/conjunto/canibalizaciones`), todas con fase entre P6 y P8. Si el responsable las
considera críticas, `P2` no cierra y su alcance se amplía; si no, hay que
registrarlo como decisión con nombre y fecha.

Deuda menor conocida, ninguna bloqueante:

- `/queries/[id]` no tiene serie propia: la query no es una entidad del contrato
  hasta `P3`. La ficha lo declara explícitamente.
- `cluster` y `result` no tienen ficha destino (`linkTargetHref` devuelve `null`).
  Llegan con `P6` y `P9`; cuando existan, basta añadir el caso.
- `/` y `/portfolio` calculan las sesiones del grupo por caminos distintos (la
  portada desde un total sintético, la visión transversal sumando filas por marca
  y mercado), así que difieren en 1 sesión por redondeo. Desaparece en P3, cuando
  las dos lean del mismo almacén.
- Las seis marcas fuera del piloto no tienen ficha de proyecto: en la tabla de
  `/portfolio` solo enlazan al calendario editorial. `/projects/[slug]` acepta
  únicamente los dos slugs del piloto.
- El cuerpo de `/reports/[id]` sigue siendo el mismo maquetado para todos los
  informes: los capítulos que declara se listan en la barra lateral, pero el
  contenido por capítulo llega con P7. El archivo, las versiones y la
  equivalencia sí son reales.
- El editor de narrativa del workbench (`components/report-editor.tsx`) es una
  maqueta funcional y lo declara en pantalla: la publicación firmada de informes
  llega con P7. Es lo único que queda sin respaldo de dato real, y no se presenta
  como si lo tuviera.

## Verificaciones que deben seguir pasando

```bash
pnpm continuity:check
pnpm migration:check  # inventario de migración sincronizado y completo
pnpm reconcile:check  # baseline de reconciliación sin desviaciones (D-026)
pnpm typecheck        # 9 paquetes (incluye packages/sync/scripts)
pnpm test             # 282 pruebas
pnpm ingest:dry-run   # 4 ciclos sin duplicados, deriva ni huecos (D-030) y los
                      # 3 escenarios de ejecución: lock ocupado, cuota agotada y
                      # fuente intermitente (D-031)
pnpm build            # viewer + workbench
pnpm editorial:import # debe decir "Sin cambios" si no tocaste los snapshots V1
pnpm axe              # 56 combinaciones ruta × viewport, 0 incumplimientos
pnpm axe              # requiere los servidores en marcha; sale 1 si hay incumplimientos
```

Accesibilidad (última vez completa el 2026-09-03): `pnpm axe` sobre 36
combinaciones ruta × viewport de visor y workbench a 1440 y 375 px devuelve 0
incumplimientos WCAG 2.1 A/AA y 0 avisos de buenas prácticas; el informe queda en
`docs/design/axe-report.json`. El script propio sigue midiendo lo que Axe no:
cero desbordamiento horizontal en 13 rutas × 4 viewports, cero contraste AA
fallido, cero textos por debajo de 12 px y cero objetivos por debajo de 24 px.
Los dos scripts son complementarios; ninguno sustituye al otro.

## No hacer todavía

- No activar conectores cloud sin credenciales reales.
- No iniciar crawls con el espacio actual.
- No copiar componentes Svelte/Astro de V1; migrar comportamiento y datos a contratos V2.
- No aplicar la marca o el logotipo Glosa: solo se trasladan sus principios de diseño.
- No fusionar automáticamente `conjunto.json` y `conjunto-backlog.json`: representan
  fuentes históricas distintas y así se sirven hoy.
- No publicar ningún JSON editorial en `public`.
- No dar por bueno un token de color sin comprobarlo contra todos sus fondos.
- No escribir en `data/normalized/editorial-dataset.json` desde el workbench ni desde
  ningún sitio que no sea `pnpm editorial:import`: la curación vive en
  `data/curation/editorial-curation.json`, un fichero aparte (D-012).
- No precargar un campo de edición con el valor V1/efectivo vigente como valor de
  envío del formulario: causó un fallo real (año/mes se fijaban como curados en
  cualquier guardado). Usa `placeholder` o una pista en la etiqueta.
- No guardar un array invertido de `links` ni ninguna otra copia de la relación:
  la reciprocidad se deriva (D-015). Duplicarla reabre la puerta a que el visor
  escriba y a que las dos mitades divergan.
- No declarar la accesibilidad resuelta con el script propio: Axe encontró 18
  incumplimientos reales que aquel no veía (D-016). Ejecuta `pnpm axe`.
- No inventar una ruta de ficha para un tipo de enlace que aún no la tiene
  (`cluster`, `result`): `linkTargetHref` devuelve `null` y la UI lo muestra como
  texto, no como enlace roto.
- No editar `docs/continuity/V1_MIGRATION_INVENTORY.md` ni
  `docs/continuity/V1_RECONCILIATION.md` a mano: son renders y sus `--check` lo
  detectan.
- No reescribir el baseline de reconciliación para «arreglar» un fallo de
  `reconcile:check`. Si el hash de una fuente V1 cambió, eso **es** el hallazgo:
  averigua qué cambió antes de recapturar. `reconcile:capture` es un acto
  deliberado, nunca la forma de silenciar una desviación.
- No dar por reconciliado un dataset con `baseline-frozen`: significa que el lado
  V2 todavía no existe (D-026).
- No hacer que un origen de datos caiga al sintético cuando no está disponible, ni
  con una errata en `SEO_DATA_SOURCE`. Falla con `RepositoryUnavailableError` a
  propósito (D-028): servir cifras sintéticas creyéndolas reales es el fallo que
  esa capa existe para impedir.
- No agregar una métrica a mano en una superficie. La regla la declara el catálogo
  y la aplica `aggregateMetric` (D-029). En particular, no sumar porcentajes ni
  scores: el contrato lo rechaza y hay prueba.
- No escribir el aviso de procedencia de los datos en el JSX: sale de
  `describeDataSource()`, para que cambie cuando cambie el origen.
- No dar por retirada una capacidad V1 clasificada como `proposed`: seis endpoints
  de V1 no tienen UI montada y aun así cuatro de ellos se conservan; «no montado»
  no significa «prescindible» (misma lección que D-006).
- No ejecutar `pnpm format` sobre todo el repositorio: el árbol committeado no está
  formateado con esta configuración de Prettier y reformatea unos 130 ficheros
  ajenos al cambio. Formatea solo los ficheros que toques.

## Control de versiones

El repositorio vive en `https://github.com/amariner/seo-control` (D-013, rama
`main`). Antes de subir nada se audita el árbol de trabajo en busca de secretos;
`.gitignore` excluye `node_modules`, `.next`, `.turbo`, `.pnpm-store` y
cualquier `.env*` real (solo `.env.example` se versiona). Revisa `git status` y
el diff antes de cada commit; no está configurado ningún hook de CI todavía.

## Comando de reanudación

```bash
pnpm status
git status
```

`pnpm status` mide el disco y **sale con código 1 por debajo de 3 GiB**, que es
donde `build`, `test` y `axe` empiezan a fallar con `ENOSPC`. Si avisa, libera
antes de empezar: `rm -rf .turbo` (caché regenerable de Turborepo, llegó a 6,4 GB)
y después `rm -rf apps/*/.next`. Los crawls siguen exigiendo 50 GiB.

Después se arranca `P2.4` según «Siguiente incremento exacto».

Para levantar la QA visual y de accesibilidad hacen falta los dos servidores:
`pnpm dev:viewer` (3000) y `pnpm dev:workbench` (3001). Si esos puertos están
ocupados, `.claude/launch.json` incluye `viewer-qa` (3020) y `workbench-qa`
(3021), y tanto `pnpm axe` como `pnpm screenshots` aceptan la base por bandera.

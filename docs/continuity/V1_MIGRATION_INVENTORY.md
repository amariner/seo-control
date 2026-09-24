# Inventario y contratos de migración V1 -> V2 (P2.1)

> Documento generado. No lo edites a mano: la fuente es
> `docs/continuity/v1-migration-inventory.json` y se regenera con `pnpm migration:report`.
> `pnpm migration:check` falla si los dos divergen.

Auditoría de V1 el 2026-09-03 sobre `~/Desktop/Proyectos/seo-dashboard` (Astro 5 SSR + Svelte 5 + Tailwind 4, better-sqlite3, googleapis, cheerio): 18 páginas y 34 endpoints.

`V1_PARITY.md` dice **dónde está** cada capacidad en V2. Este inventario dice **qué se hace con ella** y **con qué evidencia se acepta la migración**. Son ejes distintos y se mantienen separados.

## Clasificación

- `retain` (4): Se conserva el comportamiento tal cual.
- `redesign` (10): Se conserva el valor; se rehace sobre contratos V2.
- `merge` (6): Se funde con otra superficie en un único capítulo V2.
- `defer` (1): Se conserva, pero llega en una fase posterior.
- `retire` (2): No se reimplementa. Exige motivo y alternativa.

**Retiradas propuestas y pendientes de aprobación (2).** P2 no cierra mientras sigan abiertas:

- `/api/cita-tienda-flow.json` — Endpoint puntual de desarrollo, sin UI montada, atado a un evento y una marca concretos de una campaña ya pasada. Reimplementarlo tal cual fijaría en el producto un análisis de un solo uso. Alternativa: Convención de informes adicionales (D-014) para repetirlo cuando haga falta, y el capítulo de embudos de conversión de P4 para hacerlo genérico por evento y marca.
- `/api/cita-tienda-es.json` — Misma naturaleza que el flujo de cita en tienda: eventos y país cableados en el código, sin UI y sin uso fuera de desarrollo. El embudo genérico de P4 lo cubre sin fijar cinco nombres de evento en el producto. Alternativa: Embudos de conversión configurables por evento y mercado en P4; informe adicional puntual (D-014) si se necesita antes.

| Ruta V1 | Tipo | Qué se hace | Motivo | Paridad | Fase | Destino V2 |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | page | redesign | El valor es la lectura ejecutiva multiproyecto, no la implementación: V2 la rehace sobre contratos y datos reales con procedencia, cobertura y drill-down. El contador aleatorio de usuarios en directo no se traslada. | partial-synthetic | P2 | / (visor) con datos reales desde P3 |
| `/tracking` | page | redesign | Es el núcleo analítico diario y debe conservarse entero, pero depende de series reales y de una entidad query que hoy no existe en el contrato V2; se rehace sobre el almacén de P3. | partial-synthetic | P3 | /queries y /queries/[id] (la ficha ya existe desde P1.4, sin serie propia) |
| `/optimizacion/crawl` | page | redesign | El crawler debe vivir en el workbench sobre DuckDB/Parquet con publicación firmada; V2 conserva la experiencia y los límites operativos, no el almacenamiento SQLite ni la configuración en localStorage. | foundation | P5 | workbench · crawl (packages/local-data) |
| `/optimizacion/estado-del-sitio` | page | redesign | El inventario de issues, el histórico y el diff entre crawls son valor directo y se conservan; el score se recalibra contra el catálogo V2 en lugar de copiarse, por lo que no es reconciliable dígito a dígito. | partial-synthetic | P5 | visor · salud técnica + workbench · auditoría |
| `/vision-general/tareas` | page | redesign | Las tareas son el puente entre diagnóstico y ejecución y deben persistirse de verdad, con origen, plantilla, prioridad, responsable, estado y resultado. El estado en localStorage no se migra: no es compartible ni auditable. | foundation | P4 | visor · acciones + workbench · decisiones |
| `/tracking/autoridad-tematica` | page | merge | V1 mantiene cuatro cuadros de mando paralelos (genérico, Porcelanosa, editorial Porcelanosa y editorial Ecommerce) sobre el mismo concepto. V2 los funde en un único árbol conectado con calendario, query, URL, acción y resultado. | missing | P6 | visor · autoridad temática (árbol único) |
| `/tracking/informe` | page | merge | V1 tiene dos generadores de informes con solapamiento material. V2 los funde en un único modelo de informes versionados; la paridad se exige por capítulo y evidencia, no por plantilla. | partial-synthetic | P7 | visor · informes versionados |
| `/tracking/informe-v2` | page | merge | Se funde con el informe trimestral en el modelo único de P7. Su cobertura por fechas libres y la exportación offline se evalúan como requisitos del modelo fusionado, no como una segunda plantilla. | partial-synthetic | P7 | visor · informes versionados |
| `/canales/geo` | page | redesign | Se conserva la lectura de referral por asistente, pero V2 separa de forma estricta el referral observado de la citación medida, que V1 mezcla bajo el rótulo de visibilidad. | partial-synthetic | P8 | visor · GEO/AEO |
| `/tracking/prompts-geo` | page | redesign | El concepto se conserva y se amplía a un set semanal versionado de 30 prompts por proyecto y mercado Tier 1. Los 24 prompts de V1 son punto de partida y referencia histórica, no el universo final. | missing | P8 | visor · GEO/AEO (set de prompts versionado) |
| `/canales/sem` | page | defer | No es núcleo orgánico. Se conserva como contexto de sinergia y solapamiento entre pago y orgánico, pero después de cerrar demanda y contenido. | missing | P6 | — |
| `/conjunto` | page | redesign | Es la vista que usa gerencia y se conserva entera, con agregaciones matemáticamente compatibles y cobertura declarada. No se traslada el ranking absoluto entre marcas, que compara negocios de tamaño distinto sin normalizar. | partial-synthetic | P2 | / y /portfolio (visor) |
| `/conjunto/plan-editorial` | page | retain | Migrado íntegro en P1 con los recuentos verificados y las cuatro fuentes archivadas por separado (D-006). La ruta V1 conserva compatibilidad mediante redirección 308. | implemented | P1 | /editorial/calendario, /editorial/backlog, /editorial/propuestas |
| `/conjunto/radar` | page | merge | Como vertical aislado y mantenido a mano aporta poco: cuatro entradas manuales. Su valor real es anotar la cronología, así que se funde en las anotaciones que explican los movimientos de las series. | missing | P4 | cronología y anotaciones del sistema de decisiones |
| `/conjunto/canibalizaciones` | page | redesign | El solapamiento entre marcas es un problema real del grupo y se conserva, pero como análisis multiseñal conectado con entidades y calendario, no como un snapshot monolítico regenerado a mano desde un endpoint de desarrollo. | missing | P6 | visor · solapamiento entre marcas |
| `/tracking/pilar-contenidos` | redirect | retain | Una redirección conservada cuesta poco y protege enlaces que el equipo tiene guardados desde hace meses. Se reproduce en V2 en cuanto exista el capítulo destino de autoridad temática. | missing | P6 | redirección al capítulo de autoridad temática V2 |
| `/insights/llm` | redirect | retain | Mismo criterio que la redirección de pilares: se conserva el enlace histórico y se apunta al capítulo GEO de V2 cuando exista. | missing | P8 | redirección al capítulo GEO/AEO V2 |
| `/api/canibalizaciones-build.json` | dev-endpoint | redesign | La lógica de recolección es útil y se conserva, pero como trabajo del workbench con salida versionada y firmada, no como un endpoint que escribe dentro de src/data y obliga a reiniciar a mano. | missing | P6 | workbench · generación de solapamiento |
| `/api/url-keywords.json` | dev-endpoint | retain | Responde a la pregunta que abre toda reedición: por qué ya rankea esta URL. Es evidencia directa para la pieza editorial y se conserva como enriquecimiento de la ficha, no como endpoint suelto de desarrollo. | missing | P6 | evidencia de keywords en la ficha de pieza editorial |
| `/api/trendbook-report.json` | dev-endpoint | merge | Es un análisis de rendimiento de contenido acotado a una colección concreta. En V2 lo cubre el capítulo de contenido cuando la colección se modele como cluster editorial, sin endpoint dedicado. | missing | P6 | rendimiento por cluster de contenido |
| `/api/trendbook-query.json` | dev-endpoint | merge | Es una consulta ad hoc sobre GSC con filtro de expresión regular; se cubre con la exploración de queries de P3 y con la convención de informes adicionales (D-014) mientras tanto. | missing | P3 | exploración de queries con filtro sobre el almacén GSC |
| `/api/cita-tienda-flow.json` | dev-endpoint | **retire** (proposed) | Endpoint puntual de desarrollo, sin UI montada, atado a un evento y una marca concretos de una campaña ya pasada. Reimplementarlo tal cual fijaría en el producto un análisis de un solo uso. | missing | P4 | — |
| `/api/cita-tienda-es.json` | dev-endpoint | **retire** (proposed) | Misma naturaleza que el flujo de cita en tienda: eventos y país cableados en el código, sin UI y sin uso fuera de desarrollo. El embudo genérico de P4 lo cubre sin fijar cinco nombres de evento en el producto. | missing | P4 | — |

## Catálogo técnico

| Ruta V1 | Capacidad | Fuentes | Transformaciones | Filtros | Exportaciones | Dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Portada GA4 por proyecto, mercado y periodo: KPIs, previa, YoY, tendencias, canales, alertas, divergencia GSC/GA4, movers, tráfico IA y contexto SEMrush. | `/api/ga4.json`<br>`/api/gsc.json`<br>`/api/semrush/consultas.json` | `lib/ga4.ts`<br>`lib/dashboard-formatters.ts`<br>`lib/api/query-params.ts`<br>`lib/utils.ts` | `proyecto`<br>`mercado`<br>`rango de fechas con presets`<br>`comparativa previa/YoY`<br>`estado en query string` | — | `GA4 Data API`<br>`Search Console API`<br>`SEMrush API`<br>`lib/config/projects.ts` |
| `/tracking` | Rendimiento GSC + GA4 con rangos predefinidos y personalizados: clics, impresiones, CTR, posición, usuarios, engagement, conversiones, queries, páginas, mercados, branded/non-branded y sugerencias. | `/api/gsc.json`<br>`/api/semrush/consultas.json`<br>`/api/tracking/suggestions.json` | `lib/searchConsole.ts`<br>`lib/tracking/suggestions.ts`<br>`lib/dashboard-formatters.ts`<br>`lib/config/brandTerms.ts` | `proyecto`<br>`mercado`<br>`rango con presets`<br>`branded/non-branded`<br>`búsqueda en query y URL`<br>`orden por columna`<br>`estado en query string` | — | `Search Console API`<br>`GA4 Data API`<br>`SEMrush API`<br>`localStorage (set estable de queries)` |
| `/optimizacion/crawl` | Crawler local configurable con robots/sitemap, inicio y parada, streaming de progreso, filtros, exportación, snapshots y repetición de configuración. | `/api/site-audit-v2/crawl`<br>`/api/site-audit-v2/crawls`<br>`/api/site-audit-v2/crawls/[id]`<br>`/api/site-audit-v2/save`<br>`/api/site-audit-v2/snapshot` | `lib/site-audit-v2/crawler.ts`<br>`lib/site-audit-v2/robots.ts`<br>`lib/site-audit-v2/sitemap.ts`<br>`lib/site-audit-v2/proxy.ts` | `proyecto`<br>`límites de URLs y profundidad`<br>`inclusión/exclusión de patrones`<br>`filtros sobre el resultado en curso` | `CSV del resultado del crawl (components/CrawlPage.svelte)` | `SQLite better-sqlite3`<br>`disco local`<br>`red saliente`<br>`localStorage (configuración recordada)` |
| `/optimizacion/estado-del-sitio` | Salud técnica: score, 43 tipos de issue con severidad, histórico, movimientos, detalle, muestras de URL, pestaña de páginas, estadísticas, comprobación del sitemap de producto y comparación entre crawls. | `/api/site-audit-v2/crawls`<br>`/api/site-audit-v2/crawls/[id]`<br>`/api/site-audit-v2/compare`<br>`/api/site-audit-v2/issue-history`<br>`/api/site-audit-v2/issue-urls`<br>`/api/products-status.json`<br>`src/data/audits/<marca>/history/<crawl>/{summary.json,issues.csv.gz,pages.csv.gz,links.csv.gz}` | `lib/site-audit-v2/health-score.ts`<br>`lib/site-audit-v2/issues.ts`<br>`lib/site-audit-v2/markets.ts`<br>`lib/site-audit-v2/partitions.ts`<br>`lib/site-audit-v2/storage.ts` | `proyecto`<br>`mercado`<br>`crawl seleccionado`<br>`tipo de issue`<br>`severidad`<br>`búsqueda de URL`<br>`ventana del histórico` | `CSV de issues`<br>`CSV de páginas`<br>`CSV del chequeo de sitemap de producto` | `SQLite`<br>`snapshots comprimidos en src/data/audits`<br>`sitemaps de producto en vivo` |
| `/vision-general/tareas` | Generación de tareas desde crawl, sitemap, GSC e inbound links, con búsqueda, agrupación, severidad, expansión, exportación y enlaces a la evidencia. | `/api/tasks-v2.json` | `lib/site-audit-v2/tasks-v2.ts`<br>`lib/site-audit-v2/issues.ts` | `proyecto`<br>`búsqueda`<br>`agrupación`<br>`severidad`<br>`estado local`<br>`estado en query string` | `CSV de tareas (components/TasksV2Dashboard.svelte)` | `SQLite de crawls`<br>`Search Console API`<br>`localStorage (estado de las tareas)` |
| `/tracking/autoridad-tematica` | Árbol comercial y editorial con pilares, clusters, posts, gaps, quick wins y acciones defender/refrescar/crear/podar, con exportaciones por bloque. | `/api/pilar.json`<br>`/api/pilar-editorial.json`<br>`/api/pilar-ecommerce-editorial.json`<br>`/api/tracking-pilar.json`<br>`/api/tracking-pilar/post-detail.json`<br>`src/data/tracking-pilar/{fr,uk,us}.json`<br>`src/data/pilar-porcelanosa/*.json` | `lib/pilar/aggregator.ts`<br>`lib/pilar/porcelanosa.ts`<br>`lib/pilar/porcelanosa-editorial.ts`<br>`lib/pilar/ecommerce-editorial.ts`<br>`lib/tracking-pilar/builder.ts`<br>`lib/tracking-pilar/semrush-cache.ts` | `proyecto`<br>`mercado`<br>`pilar y cluster`<br>`tipo de acción`<br>`búsqueda`<br>`estado en query string` | `CSV por cada uno de los cuatro cuadros de mando de pilares` | `Search Console API`<br>`caché SEMrush en src/data/tracking-pilar`<br>`localStorage` |
| `/tracking/informe` | Informe trimestral profundo: resumen, descubrimiento, captación, conversiones, técnica, autoridad, acción, siguiente periodo, metodología, briefs, objetivos y CSV. | `/api/informe-trimestral.json` | `lib/informe-trimestral/builder.ts`<br>`lib/informe-trimestral/gsc-fetchers.ts`<br>`lib/informe-trimestral/keyword-groups.ts`<br>`lib/informe-trimestral/salud-tecnica.ts` | `proyecto`<br>`trimestre`<br>`mercado`<br>`navegación por capítulos`<br>`estado en query string` | `CSV por capítulo (components/InformeTrimestral.svelte)` | `Search Console API`<br>`GA4 Data API`<br>`SQLite de crawls (salud técnica)` |
| `/tracking/informe-v2` | Informe por fechas con scorecard, hasta cuatro años de histórico, canales, IA/GEO, mercados, contenidos, marca, conversiones, funnels, plan, movers y salud; impresión/PDF y HTML offline. | `/api/informe-v2.json`<br>`src/data/informe-v2/conclusiones.json` | `lib/informe-v2/builder.ts`<br>`lib/informe-v2/periods.ts`<br>`lib/dashboard-formatters.ts` | `proyecto`<br>`rango de fechas libre`<br>`mercado`<br>`capítulos visibles`<br>`estado en query string` | `impresión/PDF`<br>`HTML offline autocontenido` | `Search Console API`<br>`GA4 Data API`<br>`conclusiones editadas a mano en src/data/informe-v2/conclusiones.json` |
| `/canales/geo` | Tráfico referido por asistente de IA: sesiones, share sobre orgánico, conversiones, landings y comparativas, con la visibilidad posclic marcada como proxy. | `/api/llm-traffic.json` | `lib/ga4.ts`<br>`lib/dashboard-formatters.ts`<br>`lib/api/query-params.ts` | `proyecto`<br>`mercado`<br>`rango de fechas`<br>`asistente`<br>`estado en query string` | — | `GA4 Data API` |
| `/tracking/prompts-geo` | Inventario manual de prompts por mercado, categoría y funnel con estado citado/parcial/ausente/no probado, evidencia, filtros y CSV. | `src/data/prompts-geo.json` | `lectura directa del JSON del repositorio, sin capa de agregación` | `mercado`<br>`categoría`<br>`funnel`<br>`estado`<br>`búsqueda`<br>`estado en query string` | `CSV del inventario filtrado` | `fichero versionado a mano; sin proveedor ni automatismo` |
| `/canales/sem` | Paid Search como contexto: sesiones, usuarios, engagement, eventos, coste, impresiones, clics, ROAS/CPA, campañas, fuentes y mercados. | `/api/sem.json` | `lib/ga4.ts`<br>`lib/dashboard-formatters.ts`<br>`lib/utils.ts` | `proyecto`<br>`mercado`<br>`rango de fechas`<br>`campaña`<br>`estado en query string` | — | `GA4 Data API con dimensiones de campaña` |
| `/conjunto` | Visión transversal de las webs del grupo y sus mercados: GA4/GSC agregados, configuración, tráfico por marca y mercado, fuentes y top URL. | `/api/conjunto-ga4.json`<br>`/api/conjunto-ga4-markets.json`<br>`/api/conjunto-gsc.json`<br>`/api/sites-overview.json` | `lib/ga4.ts`<br>`lib/canibalizaciones/build.ts (sites-overview)`<br>`lib/api/query-params.ts` | `mercado`<br>`rango de fechas`<br>`marca`<br>`orden de tablas`<br>`estado en query string` | — | `GA4 Data API (8 propiedades)`<br>`Search Console API`<br>`snapshot src/data/canibalizaciones/sites-overview.json` |
| `/conjunto/plan-editorial` | Calendario editorial Jul–Dic 2026 con cadencia, temas, backlog, briefs, filtros, orden y CSV; más plan histórico y propuestas presentes en la fachada pero no montados. | `src/data/plan-editorial/calendario-2026.json`<br>`src/data/plan-editorial/conjunto-backlog.json`<br>`src/data/plan-editorial/conjunto.json`<br>`src/data/plan-editorial/conjunto-propuestas.json` | `lib/plan-editorial.ts (fachada de las cuatro fuentes)` | `marca`<br>`tipo`<br>`estado`<br>`país/mercado`<br>`mes`<br>`temática`<br>`búsqueda en título, keyword, temática, brief y URL`<br>`orden por columnas` | `CSV de la vista filtrada y ordenada, BOM UTF-8, separador ';', once columnas` | `ninguna externa: cuatro ficheros JSON versionados` |
| `/conjunto/radar` | Radar de hitos de Google, GEO, SEO y producto con búsqueda, filtros, orden, detalle y fuente. | `src/data/radar/conjunto.json` | `lib/radar.ts` | `tipo`<br>`búsqueda`<br>`orden por fecha` | — | `fichero versionado a mano; cuatro entradas, sin automatismo` |
| `/conjunto/canibalizaciones` | Canibalización entre marcas y URLs: grafo, pares, riesgo, líder y secundaria, mercados, keywords, posiciones, tráfico, detalle y acciones. | `/api/canibalizaciones.json`<br>`src/data/canibalizaciones/conjunto.json` | `lib/canibalizaciones/build.ts`<br>`lib/canibalizaciones/gather.ts` | `mercado`<br>`marca`<br>`riesgo`<br>`búsqueda de keyword o URL`<br>`selección en el grafo` | — | `snapshot de 5,4 MB generado en dev`<br>`Search Console API (5 marcas)`<br>`CSV de SEMrush para Krion y Gamadecor` |
| `/tracking/pilar-contenidos` | Redirección 301 a /tracking/autoridad-tematica conservando el query string, para no romper enlaces guardados. | `ninguna: redirección en el servidor` | — | `conserva los parámetros de consulta, por ejemplo ?project=ecommerce` | — | — |
| `/insights/llm` | Redirección 301 a /canales/geo conservando el query string. | `ninguna: redirección en el servidor` | — | `conserva los parámetros de consulta` | — | — |
| `/api/canibalizaciones-build.json` | Generador en desarrollo de los snapshots del conjunto: 5 marcas desde GSC (query × página, 12 meses) más Krion y Gamadecor desde SEMrush; escribe conjunto.json y sites-overview.json. | `Search Console API`<br>`CSV de SEMrush del repositorio` | `lib/canibalizaciones/build.ts`<br>`lib/canibalizaciones/gather.ts` | `proyecto`<br>`ventana de 12 meses` | `escribe src/data/canibalizaciones/conjunto.json y sites-overview.json` | `credenciales GSC`<br>`escritura en el repositorio`<br>`reinicio manual del servidor tras generar` |
| `/api/url-keywords.json` | Para cada URL de reedición del plan editorial, las keywords que esa URL ya posiciona, combinando GSC y los CSV de SEMrush de Krion y Gamadecor. | `src/data/plan-editorial/conjunto-backlog.json`<br>`Search Console API`<br>`CSV de SEMrush del repositorio` | `lib/canibalizaciones/build.ts (normalizeUrlKey)`<br>`lib/canibalizaciones/gather.ts` | `solo filas de tipo reedición` | `JSON de respuesta` | `credenciales GSC` |
| `/api/trendbook-report.json` | Listado de posts del Trendbook de Porcelanosa con clics e impresiones de los últimos 12 meses, separando el trendbook en español de sus traducciones. | `Search Console API` | `detección de idioma por segmento de ruta`<br>`agregación por post` | `ventana de 12 meses`<br>`solo trendbook en español` | `JSON de respuesta` | `credenciales GSC` |
| `/api/trendbook-query.json` | Posts del Trendbook que rankean por queries que casan una expresión regular RE2. | `Search Console API` | `filtro RE2 sobre queries de GSC` | `expresión regular libre`<br>`ventana de fechas` | `JSON de respuesta` | `credenciales GSC` |
| `/api/cita-tienda-flow.json` | Flujo GA4 de Porcelanosa desde la home hasta /cita-tienda/. | `GA4 Data API` | `construcción del flujo a partir de eventos GA4` | `proyecto Porcelanosa`<br>`ventana de fechas` | `JSON de respuesta` | `credenciales GA4` |
| `/api/cita-tienda-es.json` | Embudo de cita en tienda filtrado a España, sobre cinco eventos GA4 concretos. | `GA4 Data API` | `embudo sobre click_appointment, 1_store, 2_confirm_store, 4_complete_the_form, 5_make_appointment_success` | `país España`<br>`ventana de fechas` | `JSON de respuesta` | `credenciales GA4`<br>`nombres de evento cableados` |

## Reconciliación y tolerancia por dataset

Sin muestra, comparación y tolerancia declaradas, `P2.4` no tiene criterio de aceptación. Una tolerancia distinta de cero siempre lleva su motivo: si no se puede justificar, es cero.

### Cuatro snapshots editoriales V1 · `editorial-snapshots`

- Estado: **reconciled** (P1).
- Origen V1: `src/data/plan-editorial/{calendario-2026,conjunto-backlog,conjunto,conjunto-propuestas}.json`.
- Destino V2: data/normalized/editorial-dataset.json vía pnpm editorial:import.
- Muestra: El universo completo de las cuatro fuentes, no una muestra: recuentos por fuente, longitud y hash de cada brief normalizado.
- Se compara contra: Los ficheros originales archivados con hash en packages/editorial/data/archive/v1.
- Si no cuadra: Bloquear la importación y no publicar el dataset. La normalización es pura y determinista, así que una diferencia señala un error de código o una fuente modificada, y en ambos casos hay que resolverlo antes de escribir.

| Métrica | Control V1 | Tolerancia | Por qué |
| --- | --- | --- | --- |
| eventos de calendario | 39 | exacta | Son ficheros estáticos versionados: cualquier diferencia es un fallo de importación, no una variación de origen. |
| filas de backlog | 115 | exacta | Mismo criterio: la importación es idempotente por huella de entradas. |
| filas de plan histórico | 146 | exacta | Plan y backlog se mantienen como fuentes distintas; el recuento no puede fusionarse ni deduplicarse. |
| huecos temáticos | 34 | exacta | El número de huecos define la relación hueco -> propuestas y no admite margen. |
| propuestas | 68 | exacta | Exactamente dos por hueco; una desviación indicaría pérdida o duplicación. |
| caracteres de brief preservados | ≈288.635 en backlog y ≈281.433 en plan | exacta | Los briefs son material crítico y se verifican por longitud y hash: no se truncan ni se resumen. |

### Series diarias de GA4 por proyecto y mercado · `ga4-daily`

- Estado: **pending** (P3).
- Origen V1: `/api/ga4.json, /api/conjunto-ga4.json y /api/conjunto-ga4-markets.json (consulta en vivo a GA4)`.
- Destino V2: Almacén de métricas de P3 servido por la API propia.
- Muestra: Ventana de 28 días cerrada, para Porcelanosa y Noken, en los mercados ES y UK, comparando día a día y el agregado del periodo.
- Se compara contra: La respuesta de la API V1 para la misma propiedad, ventana y segmento, capturada el mismo día.
- Si no cuadra: Registrar la diferencia con propiedad, ventana y segmento, revisar primero la definición del filtro y solo después el dato. Si excede la tolerancia, no se publica el capítulo dependiente y se declara la cobertura como parcial.

| Métrica | Control V1 | Tolerancia | Por qué |
| --- | --- | --- | --- |
| sesiones | — | ±1 % | GA4 aplica umbrales de privacidad y consolida datos hasta 48 horas; dos consultas legítimas pueden diferir ligeramente aunque el cálculo sea idéntico. |
| usuarios activos | — | ±2 % | El recuento de usuarios usa estimación HyperLogLog y es menos estable que las sesiones. |
| conversiones | — | exacta | Los eventos de conversión son recuentos enteros sin muestreo: una diferencia indica un filtro o una definición de evento distinta. |

### Series diarias de Search Console por query y página · `gsc-daily`

- Estado: **pending** (P3).
- Origen V1: `/api/gsc.json y /api/conjunto-gsc.json (consulta en vivo a GSC)`.
- Destino V2: Almacén de métricas de P3 servido por la API propia.
- Muestra: Ventana de 28 días cerrada con desfase de 3 días, para Porcelanosa y Noken en ES y UK, con las 100 queries y las 100 páginas de más clics.
- Se compara contra: La respuesta de la API V1 para la misma propiedad, ventana y dimensiones.
- Si no cuadra: Comparar primero la definición de la ventana y el desfase, después el conjunto de filas anonimizadas. Una diferencia de clics por encima de cero bloquea la publicación del capítulo de búsqueda.

| Métrica | Control V1 | Tolerancia | Por qué |
| --- | --- | --- | --- |
| clics | — | exacta | Con la misma ventana y el mismo desfase, los clics de GSC son estables y deben coincidir; si no, hay un problema de agregación. |
| impresiones | — | ±0.5 % | GSC reprocesa impresiones durante unos días y anonimiza queries de bajo volumen, lo que introduce una diferencia pequeña pero real entre dos descargas. |
| posición media | — | ±0.1 posiciones | Es una media ponderada por impresiones: el redondeo y el orden de agregación producen diferencias en la primera decimal. |
| CTR | — | no comparable | No se reconcilia por separado porque es una métrica derivada; si clics e impresiones cuadran, el CTR cuadra por construcción. |

### Caché de posiciones y volúmenes de SEMrush · `semrush-cache`

- Estado: **pending** (P3).
- Origen V1: `src/data/tracking-pilar/semrush-*.json y CSV del repositorio`.
- Destino V2: Ingesta de SEMrush de P3.3.
- Muestra: Los quince ficheros cacheados que existen realmente en V1, no una muestra: butech (en, es), ecommerce (es, fr, uk, us), noken (de, es, fr, ru, uk, us) y porcelanosa (de, es, fr), con 328 queries en total. La muestra descrita en P2.1 —Porcelanosa y Noken en ES y UK— era incorrecta: semrush-porcelanosa-uk.json no existe ni ha existido, y compararse contra un fichero ausente habría pasado por bueno en silencio (D-026).
- Se compara contra: El propio fichero cacheado, no una llamada nueva a la API, medido y hasheado por pnpm reconcile en docs/continuity/v1-reconciliation-baseline.json.
- Si no cuadra: Si el recuento contra la caché no cuadra, es un fallo del parser. Si la diferencia aparece contra la API en vivo, se documenta como actualización del proveedor y se registra la fecha de corte, nunca como error de migración.

| Métrica | Control V1 | Tolerancia | Por qué |
| --- | --- | --- | --- |
| keywords por fichero | 328 queries en 15 ficheros; por fichero en docs/continuity/v1-reconciliation-baseline.json | exacta | Contra un fichero estático el recuento debe coincidir; comparar contra la API en vivo no probaría nada porque SEMrush actualiza sus índices. |
| volumen de búsqueda | — | no comparable | SEMrush recalcula volúmenes mensualmente: una llamada nueva devuelve valores distintos por diseño, así que solo se reconcilia contra la caché archivada. |

### Snapshots históricos de crawl y sus issues · `crawl-snapshots`

- Estado: **pending** (P5).
- Origen V1: `src/data/audits/<marca>/history/<crawl>/{summary.json,issues.csv.gz,pages.csv.gz,links.csv.gz} y SQLite`.
- Destino V2: Almacén DuckDB/Parquet del workbench (P5).
- Muestra: Los seis crawls archivados en V1: Ecommerce 7.055 URLs, Noken 10.471 y 916, Krion 4.424, Antic Colonial 2.395 y Butech 2.258.
- Se compara contra: Los ficheros comprimidos archivados, releídos sin volver a rastrear, verificado por pnpm reconcile contra el baseline congelado.
- Si no cuadra: Conservar el snapshot V1 intacto y no sustituirlo. Si el recuento de URLs o de issues no cuadra, se corrige el importador; la divergencia del score se documenta con la fórmula nueva y la antigua, una al lado de la otra.

| Métrica | Control V1 | Tolerancia | Por qué |
| --- | --- | --- | --- |
| URLs por crawl | 7055 / 10471 / 916 / 4424 / 2395 / 2258 | exacta | Reimportar un snapshot archivado es determinista: cualquier diferencia es pérdida de filas. |
| issues por tipo | — | exacta | Los 43 tipos de issue de V1 se reimportan tal cual desde el CSV archivado; el recuento por tipo no admite margen. |
| health score | — | no comparable | El score se recalibra en V2 en lugar de copiarse, así que comparar los dos números carecería de sentido: se compara el inventario de issues, que es el dato, no la puntuación, que es la opinión. |

### Snapshot de canibalización del conjunto · `canibalizaciones-snapshot`

- Estado: **pending** (P6).
- Origen V1: `src/data/canibalizaciones/conjunto.json (5,4 MB) y sites-overview.json`.
- Destino V2: Análisis de solapamiento entre marcas (P6).
- Muestra: El snapshot completo del rango 2025-07-06 a 2026-07-06: 7 sitios, 7 mercados y 21 pares de canibalización.
- Se compara contra: El snapshot archivado, no una regeneración desde GSC, verificado por pnpm reconcile contra el baseline congelado.
- Si no cuadra: Si falla la reimportación del snapshot, se corrige el parser. Si el recálculo devuelve un número distinto de pares, se documenta la regla de detección y se muestran las dos lecturas antes de retirar la de V1.

| Métrica | Control V1 | Tolerancia | Por qué |
| --- | --- | --- | --- |
| sitios | 7 | exacta | Es un fichero estático: los sitios y sus claves deben reimportarse sin pérdida. |
| pares de canibalización | 21 | exacta | El recuento de pares define la conclusión de la pantalla y se conserva como control de la reimportación. |
| pares recalculados desde GSC | — | no comparable | V2 recalcula el solapamiento con un criterio multiseñal distinto y sobre otra ventana: el número de pares cambiará por diseño y se justifica con la regla nueva, no se fuerza a coincidir. |

### Inventario de prompts GEO · `prompts-geo-inventory`

- Estado: **pending** (P8).
- Origen V1: `src/data/prompts-geo.json`.
- Destino V2: Set de prompts versionado de P8.
- Muestra: Los 24 prompts de V1: US 8, UK 6, FR 5 y ES 5, con su estado y su evidencia.
- Se compara contra: El fichero JSON versionado en V1, verificado por pnpm reconcile contra el baseline congelado.
- Si no cuadra: No completar automáticamente un prompt que llegue sin estado: se importa como 'no probado' con la fecha del snapshot y se anota la diferencia en el informe de importación.

| Métrica | Control V1 | Tolerancia | Por qué |
| --- | --- | --- | --- |
| prompts por mercado | us:8, uk:6, fr:5, es:5 | exacta | La migración del histórico debe conservar los 24 prompts con su estado; el crecimiento hasta 30 por mercado es trabajo nuevo y se cuenta aparte. |
| estado citado/parcial/ausente/no probado | — | exacta | El estado es una observación fechada: se importa tal cual, con su fecha, y nunca se recalcula al importarlo. |

### Estado de tareas guardado en el navegador · `tasks-local-state`

- Estado: **not-comparable** (P4).
- Origen V1: `localStorage del navegador de cada usuario (components/TasksV2Dashboard.svelte)`.
- Destino V2: Tareas persistentes de P4.
- Muestra: No hay muestra: el estado vive en el navegador de cada persona y no es accesible desde el repositorio.
- Se compara contra: Nada comparable en el servidor.
- Si no cuadra: No se declara paridad de estado. Las tareas se regeneran desde crawl, sitemap y GSC en P4 y se avisa al equipo de que el estado marcado en V1 no viaja, para que lo rehagan sobre el almacén nuevo antes de retirar V1.

| Métrica | Control V1 | Tolerancia | Por qué |
| --- | --- | --- | --- |
| tareas con estado propio | — | no comparable | El estado nunca salió del navegador: no existe copia en servidor contra la que reconciliar, y cada usuario tiene la suya. |

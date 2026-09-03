# Matriz de paridad — SEO Dashboard V1 -> V2

Última auditoría: 2 de septiembre de 2026.
Última actualización de paridad editorial: 3 de septiembre de 2026 (P1.4: curación en el workbench).

## Dictamen

V1 es una suite SEO operativa, no una sola portada: contiene unas quince superficies,
dos generadores de informes, crawler, auditoría histórica, tareas, autoridad temática,
GEO, SEM, canibalización entre marcas y cuatro snapshots editoriales superpuestos.

V2 posee una base técnica más adecuada —Next.js, contratos, PostgreSQL, workbench,
autenticación y publicación controlada—, pero aún no existe paridad funcional. La
mayoría de capítulos actuales son demostraciones sintéticas o de alcance.

La regla de migración es:

> conservar datos, lógica útil, decisiones y salidas; reemplazar la inseguridad,
> duplicación, persistencia frágil y contratos accidentales de V1.

Estados válidos: `missing`, `foundation`, `partial-synthetic`, `implemented`,
`verified`, `redirected`, `retired-approved`.

## Matriz de superficies

| Ruta V1 | Capacidad que se debe conservar | Estado V2 | Fase / criterio de paridad |
| --- | --- | --- | --- |
| `/` | GA4 por proyecto/mercado/periodo; KPIs, previa, YoY, tendencias, canales, alertas, divergencia GSC/GA4, movers, tráfico IA y contexto SEMrush. | `partial-synthetic` | P2/P3. Datos reales, cobertura, comparativas, segmentos y drill-down. Se retira el contador aleatorio de usuarios en directo. |
| `/tracking` | GSC + GA4; rangos predefinidos/personalizados; clics, impresiones, CTR, posición, usuarios, engagement, conversiones, queries, páginas, mercados, branded/non-branded, sugerencias y set estable. | `partial-synthetic` | P3/P4. Series reales, tablas query/URL, movers, CTR esperado, sugerencias trazables y página `/queries/[id]`. |
| `/optimizacion/crawl` | Crawler local configurable; robots/sitemap, inicio/parada, streaming, filtros, exportación, snapshots, carga y repetición de configuración. | `foundation` | P5. Experiencia completa en workbench, DuckDB/Parquet y publicación firmada de hasta 50.000 URLs. |
| `/optimizacion/estado-del-sitio` | Score, 43 tipos de issue, severidad, histórico, movimientos, detalle, muestras URL, páginas, estadísticas, sitemap de producto y comparación de crawls. | `partial-synthetic` | P5. Inventario/detalle/histórico/diff completos y enlaces a acciones. El score se recalibra, no se copia a ciegas. |
| `/vision-general/tareas` | Generación de tareas desde crawl, sitemap, GSC e inbound links; búsqueda, agrupación, severidad, expansión, exportación y enlaces de evidencia. | `foundation` | P4/P5. Tareas reales y persistentes con origen, template, prioridad, owner, estado y resultado. No usar `localStorage` compartido. |
| `/tracking/autoridad-tematica` | Árbol comercial, pilares, clusters, posts, gaps, quick wins, defender/refrescar/crear/podar y exportaciones. | `missing` | P6. Árbol comercial/editorial relacionado con calendario, query, URL, acción y resultado. |
| `/tracking/informe` | Informe trimestral profundo: resumen, descubrimiento, captación, conversiones, técnica, autoridad, acción, siguiente periodo, metodología, briefs, objetivos y CSV. | `partial-synthetic` | P7. Paridad semántica por capítulos, evidencia, comparativas, método, navegación fija, plan siguiente y exportación. |
| `/tracking/informe-v2` | Informe por fechas con scorecard, hasta cuatro años, canales, IA/GEO, mercados, contenidos, marca, conversiones, funnels, plan, movers y salud; impresión/PDF y HTML offline. | `partial-synthetic` | P7. Se fusiona en un solo modelo de informes versionados; conservar cobertura y evaluar exportación offline. |
| `/canales/geo` | Tráfico referido por asistente: sesiones, share orgánico, conversiones, landings y comparativas; visibilidad posclic marcada como proxy. | `partial-synthetic` | P8. Detalle por asistente/landing/mercado/conversión y separación estricta entre referral observado y citación medida. |
| `/tracking/prompts-geo` | Inventario de prompts por mercado/categoría/funnel; citado/parcial/ausente/no probado; evidencia, filtros y CSV. | `missing` | P8. Set semanal versionado de 30 prompts por proyecto y mercado Tier 1. Los 24 prompts V1 son referencia, no universo final. |
| `/canales/sem` | Paid Search como contexto: sesiones, usuarios, engagement, eventos, coste, impresiones, clics, ROAS/CPA, campañas, fuentes y mercados. | `missing` | P6. Solo contexto de sinergia/solapamiento; posterior al núcleo orgánico. |
| `/conjunto` | Visión de webs/mercados, GA4/GSC, configuración, tráfico por marca/mercado, fuentes y top URL. | `partial-synthetic` | P2/P3. Datos reales, cobertura y agregaciones matemáticamente compatibles; sin ranking absoluto de marcas. |
| `/conjunto/plan-editorial` | Calendario Jul–Dic 2026, cadencia, temas, backlog, briefs, filtros, orden y CSV; más plan/propuestas no montados. | `redirected` + `implemented` | **P1**. Redirección 308 a `/editorial/calendario`. Calendario, backlog, plan histórico y propuestas publicados en solo lectura con procedencia. Edición, selección de propuestas y vínculo evento-pieza ya se curan desde `/editorial` en el workbench (P1.4); pendiente solo el enlace recíproco con insight/acción/informe. |
| `/conjunto/radar` | Hitos Google/GEO/SEO/producto, búsqueda, filtros, orden, detalle y fuente. | `missing` | P4/P5. Integrar en cronología/anotaciones; no conservar como vertical aislado hasta automatizarlo. |
| `/conjunto/canibalizaciones` | Análisis entre marcas/URLs, grafo, pares, riesgo, líder/secundaria, mercados, keywords, posiciones, tráfico, detalle y acciones. | `missing` | P6. Recuperar como solapamiento multiseñal conectado con entidades y calendario. |
| `/tracking/pilar-contenidos` | Redirección 301 a autoridad temática conservando query string. | `missing` | P2/P6. Redirigir al capítulo V2 equivalente cuando exista. |
| `/insights/llm` | Redirección 301 a GEO conservando query string. | `missing` | P2/P8. Redirigir al capítulo V2 equivalente. |

## Calendario editorial: inventario forense

### Cableado visible en V1

La ruta V1 monta únicamente:

- `PlanEditorialCalendar.svelte`.
- `PlanEditorialBacklogTable.svelte` con `getBacklogEditorial("conjunto")`.

Existen dos superficies funcionales sin ruta:

- `PlanEditorialTable.svelte`.
- `PlanEditorialPropuestasTable.svelte`.

La fachada `src/lib/plan-editorial.ts` expone cuatro datasets, aunque la pantalla
actual solo utiliza calendario y backlog. V2 no debe confundir “no montado” con
“prescindible”.

### Snapshots que deben preservarse antes de normalizar

| Dataset V1 | Contenido | Recuento / calidad |
| --- | --- | --- |
| `calendario-2026.json` | Seis meses Jul–Dic, seis temas mensuales y eventos con tipo, marca, número, etiqueta y día. | **39 eventos**: Ecommerce 3, XTONE 4, Porcelanosa 11, Noken 6, Gamadecor 5, Butech 6 y Antic Colonial 4. Krion no tiene evento. |
| `conjunto-backlog.json` | Filas visibles con estado, fechas, tipo, marca, país, mes, tema/subtema, keyword, título, URL y notas/brief. | **115 filas**: 111 backlog, 2 aceptadas, 2 redactando; 76 nuevas, 32 reediciones, 4 migraciones, 3 Trendbook; 106 ES y 9 UK. |
| `conjunto.json` | Plan histórico expuesto por `getPlanEditorial()` pero no montado. | **146 filas**; no es subconjunto limpio del backlog; 144 backlog, 2 aceptadas; siete tipos; 123 ES y 23 UK. |
| `conjunto-propuestas.json` | Huecos temáticos y alternativas con keyword, volumen, títulos, ángulo, formato, tipo y URL. | **34 huecos / 68 propuestas**, exactamente dos por hueco. Fechas y tipo de slot vacíos; solo 28 valores `slot` únicos. |

### Discrepancias que la importación debe hacer visibles

- El copy del backlog habla de “3 por post”, aunque contiene una idea por fila.
- El componente de propuestas habla de dos alternativas, pero tipo y CSV reservan tres.
- Los cuatro snapshots carecen de claves y relaciones estables.
- `Porcelanosa` se divide en otros ficheros como `Porcelanosa - Trendbook` y
  `Porcelanosa - Categorías`; hay que normalizar proyecto/línea conservando el literal.
- No aparecen las ocho marcas en todos los snapshots.
- Backlog: 95 fechas de redacción, 96 de publicación, 75 URL y 20 temas/subtemas vacíos.
- Plan histórico: 144 fechas de redacción, 108 de publicación y 48 URL vacías.
- No hay objetos exactamente duplicados, pero sí keywords, títulos y URL repetidos.
- Los briefs son material crítico: aproximadamente 288.635 caracteres en backlog
  y 281.433 en plan; no se pueden truncar ni resumir durante la migración.

### Paridad visible mínima

- Seis mini-meses con semana iniciada en lunes y agrupación de eventos por día.
- Marcadores por marca/número, tooltip accesible y leyenda con recuentos reales.
- Temas y subtemas mensuales desplegables.
- Búsqueda en título, keyword, temática, brief y URL.
- Filtros por marca, tipo, estado, país/mercado, mes y temática.
- Orden inicial por mes y ordenación por columnas.
- Fila expandible con brief completo y enlace URL.
- Exportación de la vista filtrada/ordenada con BOM UTF-8, separador `;`, quoting
  seguro y las once columnas originales.
- Alternativas editoriales con relación hueco -> propuestas -> selección.

### Criterios verificables de migración editorial

- [x] Ruta `/editorial/calendario` y compatibilidad `/conjunto/plan-editorial`.
- [x] Importar exactamente 39 eventos, 115 filas, 146 filas, 34 huecos y 68 propuestas.
- [x] Archivar cada fuente con nombre, hash, fecha, esquema y resultado de importación.
- [x] Verificar longitud y hash del texto normalizado de cada brief.
- [x] Mantener plan y backlog como fuentes distintas hasta decisión editorial explícita.
- [x] Generar IDs estables; no usar índice de array, `slot`, título o URL como clave.
- [x] Normalizar alias de marca sin perder el literal de fuente.
- [x] Registrar las ocho marcas incluso cuando una no tenga eventos.
- [x] Año/mes dinámicos, calendario de escritorio y agenda móvil.
- [x] Estado de filtros compartible por URL; preferencias de columnas solo locales.
- [x] CSV equivalente respecto a campos, encoding, separador, filtro y orden.
      Diferencia deliberada: se prefija `'` a las celdas que empiezan por `=`, `+`
      o `@` para evitar inyección de fórmulas, algo que V1 no hacía.
- [x] El número real de propuestas es dinámico; corregir el copy “3 ideas”.
- [x] Fuente operativa única tras la curación; no duplicar evento y pieza
      planificada. El workbench cura `event.pieceId` (`/editorial?section=eventos`)
      y ese vínculo real sustituye a las candidatas heurísticas por marca y mes
      en el detalle del calendario; sin curar, la heurística sigue de apoyo y
      se marca explícitamente como tal.
- [~] Relación bidireccional con insight, acción, query, URL, cluster, informe y
      resultado: `links` ya es editable desde el workbench y visible en el
      detalle de la pieza del visor; falta la vista recíproca desde la ficha
      de cada insight/query/página/informe (P4 en adelante).
- [x] Workbench: crear, editar, programar, mover, asignar, revisar, aprobar y
      versionar. Sección `/editorial` en `@seo/workbench` (piezas, propuestas,
      eventos); cada guardado incrementa versión y conserva el historial
      anterior. Verificado en navegador de extremo a extremo (workbench escribe,
      visor lee la misma pieza en un proceso distinto).
- [x] Visor: solo lectura con estado, procedencia, brief y avisos. Owner,
      decisión y resultado se muestran como pendientes de curación, no vacíos.
- [x] Ningún JSON editorial en `public`: el dataset vive en `@seo/editorial` y se
      sirve por API autenticada. Historial y paquete firmado llegan con el
      workbench.
- [x] Tabla/agenda accesible, teclado y estados no dependientes solo del color.
- [x] Pruebas de recuento, vacíos, alias, fechas, hashes, relaciones y exportación.

## Flujo V1 que se sustituye

```text
CSV/XLSX + análisis ad hoc
  -> scripts GSC/SEMrush/Trendbook
  -> JSON estático mutado en el repositorio
  -> Astro carga calendario/backlog
  -> usuario consulta brief y exporta CSV
```

V1 no tiene edición web, drag-and-drop real, API editorial, persistencia, owners,
autor/revisor, aprobación, historial, conflictos ni vínculo directo con resultado.
Aunque `@dnd-kit-svelte` está instalado, el calendario no lo utiliza.

V2 debe mantener el visor corporativo como solo lectura y llevar todo el workflow al
workbench. La capacidad añadida no debe falsearse como “paridad V1”; es evolución V2.

## Datos y herramientas locales que forman parte de la memoria

Además de los cuatro JSON hay scripts de briefs, enriquecimiento SEMrush, matching y
orden Trendbook, exportación XLSX y builders específicos de Ecommerce, Porcelanosa,
Butech, mobiliario, pavimentos y columnas de ducha. También existen informes/briefs
históricos y entregables por mercado.

Algunos scripts contienen rutas absolutas o reescriben JSON directamente. Se archivan
como procedencia y casos de prueba; no se ejecutan sin adaptar contratos, entradas,
salidas e idempotencia.

### Registro de proyectos que se debe migrar

La V1 conoce Conjunto, Ecommerce, XTONE, Antic Colonial, Krion, Porcelanosa, Noken,
Butech, Gamadecor y Product Finder. Product Finder queda solo como legado porque está
fuera del alcance definitivo de V2.

El registro útil incluye dominios, fuentes disponibles, mercados, idiomas, prefijos,
bases SEMrush, slugs de catálogo/producto, términos de marca/paraguas y exclusiones de
competidores/modelos. Debe migrarse completo aunque el piloto solo sincronice P+N.

### Volumen conocido de auditorías locales

| Proyecto | Crawls | Páginas | Issues | Enlaces |
| --- | ---: | ---: | ---: | ---: |
| Antic Colonial | 1 | 2.395 | 8.900 | 103.932 |
| Butech | 1 | 2.258 | 9.066 | 92.411 |
| Ecommerce | 3 | 7.115 | 35.391 | 562.018 |
| Krion | 1 | 4.424 | 21.261 | 188.909 |
| Noken | 2 | 11.387 | 74.482 | 1.442.260 |
| Porcelanosa | 1 | 2.020 | 8.156 | 245.937 |

`.local-data` ocupa aproximadamente 3,1 GB. Se mantiene fuera del visor cloud y se
migra mediante importadores controlados. El bloqueo de espacio de P5 sigue vigente.

## Inventario de familias API V1

La paridad reproduce resultados útiles, no estos contratos ni su acceso inseguro.

- Fuentes: GA4, GSC, SEMrush, LLM traffic, SEM, conjunto GA4/GSC y sites overview.
- Contenido: pilar, editorial, tracking pilar, sugerencias y canibalización.
- Informes/tareas: informe trimestral, informe V2, tasks y product status.
- Auditoría: crawl streaming, save/snapshot, crawls, compare, issue history/URLs.
- Especiales: cita-tienda, Trendbook y URL-keywords.

V2 conserva APIs autenticadas, datos preagregados, jobs idempotentes y separación
entre identidad de usuario e identidad de servicio. No se trasladan botones de
refresco al visor.

## Deuda V1 que no cuenta como paridad

- Usuarios en directo aleatorios.
- Ausencia de autenticación y refresco de proveedores desde la interfaz.
- JSON estáticos como fuente operativa pública.
- Tareas compartidas mediante `localStorage`.
- Scripts con rutas absolutas y mutación directa.
- Datasets duplicados sin identidad/procedencia.
- Calendario y rangos hardcodeados a 2026.
- Ranking absoluto entre marcas.
- PDF dependiente únicamente de impresión del navegador.
- Heurísticas sin cobertura o confianza.

## Orden de recuperación

1. **P1:** contratos/editorial, cuatro importaciones, calendario, backlog/propuestas,
   briefs, CSV, ruta histórica y nuevo sistema visual.
2. **P2-P4:** portfolio, GA4/GSC reales, fichas query/URL, acciones con evidencia e
   informes críticos del piloto.
3. **P5-P8:** crawler/auditoría, autoridad temática, canibalización, GEO y resultado
   editorial.
4. **P9-P12:** SEM/contexto, radar automatizado, experimentación, logs y capacidades
   diferenciales controladas.

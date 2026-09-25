# Registro de sesiones

## 2026-09-02 · Fundación y continuidad

- Se implementó la fundación ejecutable de V2 para Porcelanosa + Noken.
- Se validaron 7 paquetes, 11 pruebas, dos builds y flujos principales en navegador.
- Se creó el protocolo de continuidad entre chats.
- Se priorizó P1: sistema visual + calendario editorial general.
- Se detectó el bloqueo de disco para crawls; no se eliminó información del usuario.

## 2026-09-02 · Roadmap continuo, paridad y diseño

- Se creó `ROADMAP.md` con P0-P12, criterios de salida, puertas de decisión y métricas de producto.
- Se auditó V1 y se creó la matriz de paridad de rutas, datos, flujos y deuda que no debe migrarse.
- Se descubrieron dos datasets editoriales no montados en la ruta V1; los cuatro snapshots se preservarán antes de normalizar.
- Se definió el design system propio de SEO Intelligence a partir de los principios útiles del documento Glosa, sin trasladar su marca o instrucciones.
- Se añadió benchmark oficial de Semrush, Ahrefs, Conductor, BrightEdge, seoClarity, Lumar y Botify.
- Se instaló el activador de continuidad en las reglas del repositorio y en memoria PARA.
- Se detectó que el directorio todavía no tiene historial Git; no impide reanudar, pero limita rollback y aprobación futura.

## 2026-09-02 · P1.1-P1.3: sistema visual compartido y calendario editorial general

- Se creó `@seo/ui/tokens.css` como única fuente de color, tipografía, espaciado, foco
  e impresión, más el tema ECharts compartido; viewer y workbench ya no definen
  variables propias ni colores en línea.
- Se añadieron primitivas con significado: `Surface`, `DataPanel`, `Overlay`,
  `MetricStrip`, `StatusBadge`, `EvidenceLink`, `SectionHeader`, `Notice` y `EmptyState`.
- Se creó el contrato editorial versionado (`editorial.v1`) con marca normalizada más
  literal, brief con hash y longitud, procedencia por fila y ventanas de medición.
- Se creó `@seo/editorial` con normalización pura, importador idempotente y archivo
  forense de los cuatro snapshots V1. Resultado: 39 eventos, 115 filas de backlog,
  146 de plan, 34 huecos y 68 propuestas, sin rechazos ni colisiones de identidad.
- Se publicaron `/editorial/calendario`, `/editorial/backlog` y `/editorial/propuestas`
  con vista anual y mensual, agenda móvil, filtros compartibles por URL, detalle
  lateral, exportación CSV equivalente a V1 y estados de carga, vacío y error.
- Se mantuvo la ruta histórica `/conjunto/plan-editorial` mediante redirección 308.
- Se añadieron cinco APIs editoriales autenticadas y se amplió la búsqueda cruzada.
- Correcciones de accesibilidad encontradas al verificar, no supuestas:
  `--ds-muted` fallaba el contraste AA sobre superficie mineral (4,21:1);
  178 textos por debajo de 12 px; 64 objetivos por debajo de 24 px; y desbordamiento
  horizontal en inicio e insights por rejillas `1fr` con mínimo automático de
  contenido. Tras corregirlo: 0 fallos en las nueve rutas del visor y en el workbench.
- Se descubrió que Chrome headless fuerza un ancho mínimo de 500 px, lo que invalidó
  las primeras capturas de 390 y 375 px. Se creó `scripts/capture-screenshots.mjs`
  sobre el protocolo DevTools y se documentó la limitación del conjunto `before`.
- Validación: typecheck de 8 paquetes, 47 pruebas, build de producción de las dos apps
  y QA de navegador y API.
- Pendiente de P1: prioridad explicable, edición y selección en el workbench, vínculo
  bidireccional insight/pieza/acción/resultado y las primitivas `DecisionThread`,
  `InsightStack` y `ChartFrame`.

## 2026-09-03 · P1.4: curación editorial en el workbench

- Se implementó la edición editorial completa en el workbench (`/editorial` en
  `@seo/workbench`): crear y editar pieza, elegir propuesta de un hueco, programar,
  mover de mes, asignar owner/autor/revisor, curar intención/cluster/objetivo/
  hipótesis/criterio de éxito/enlaces, y versionar cada guardado con nota y autor.
- Se añadió `editorialPiecePriority` (impacto ÷ esfuerzo, con fórmula visible o
  `null` si falta un componente) y se muestra en visor y workbench.
- Se sustituyó la relación heurística evento -> pieza por un vínculo real curable
  (`event.pieceId`); la heurística por marca/mes se conserva como apoyo mientras
  el evento no se cure, y el detalle del calendario distingue ambos casos.
- Arquitectura (D-012): la curación vive en
  `packages/editorial/data/curation/editorial-curation.json`, separada del
  dataset importado de V1, y se fusiona en lectura (`applyCuration`, puro). El
  visor consume `getEffectiveEditorialDataset()` y no importa ningún módulo de
  escritura; las Server Actions del workbench son el único punto de escritura.
  `pnpm editorial:import` se verificó "Sin cambios" tras curar.
- Dos fallos reales encontrados y corregidos al verificar en navegador con dos
  procesos reales (workbench :3001 escribiendo, visor :3000 leyendo):
  `import.meta.dirname` devolvía `undefined` al compilar con Turbopack
  (`next build` fallaba) y se sustituyó por `fileURLToPath(import.meta.url)`;
  y los campos año/mes/fechas del formulario de edición precargaban el valor V1
  vigente como valor de envío, así que cualquier guardado (aunque solo tocara el
  owner) fijaba esos campos como curados y falseaba `month.yearSource`. Ambos
  corregidos y reverificados de extremo a extremo antes de cerrar la sesión.
- Validación: typecheck de 8 paquetes, 60 pruebas (13 nuevas), build de
  producción de las dos apps, `pnpm continuity:check`, `pnpm editorial:import`
  idempotente, y verificación manual en navegador de los tres flujos (pieza,
  propuesta, evento) más creación de pieza nueva, con lectura cruzada desde el
  visor. Los datos de prueba generados durante la verificación se limpiaron del
  almacén de curación antes de cerrar la sesión.
- Pendiente de P1.4/P1.5: vista recíproca de `links` desde insight/query/página/
  informe, primitivas `DecisionThread`/`InsightStack`/`ChartFrame`, pruebas
  automatizadas de permisos (hoy la propiedad "visor de solo lectura" es
  estructural, no verificada por test) y ejecución de Axe como herramienta
  externa.

## 2026-09-03 · Repositorio Git inicializado y publicado en GitHub

- A petición del usuario, se inicializó `.git` (no existía hasta ahora) y se
  vinculó a `https://github.com/amariner/seo-control.git` (D-013).
- Antes de subir nada se auditó el árbol de trabajo buscando secretos y
  ficheros `.env*` reales: solo apareció `apps/viewer/.env.local` con un
  `AUTH_SECRET` de desarrollo placeholder, ya cubierto por `.gitignore`. Se
  amplió `.gitignore` (`.env.*` con excepción de `.env.example`, más
  `.pnpm-store`).
- Primer commit (`fd734fd`, 213 ficheros, ~7,6 MB) con el estado íntegro del
  repositorio y empujado a `main`. El dataset editorial importado/curado y las
  capturas de diseño se subieron deliberadamente por ser contenido de
  producto, no secretos.
- Se retiró el bloqueo `git-history` de `PROJECT_STATE.json` y se añadió el
  campo `repository`.
- Se replicó la convención `informes-adicionales/` del proyecto original
  (D-014), encontrada revisando `seo-dashboard/informes-adicionales/` y
  `seo-dashboard/docs/claude-seo-integracion.md` a petición del usuario: con
  el workbench en local, la frase "informe adicional" activa análisis
  puntuales que se guardan en `<proyecto>/<YYYY-MM-DD>-<tema-corto>/` y nunca
  se commitean. Activador añadido a `AGENTS.md`; convención documentada en
  `informes-adicionales/README.md`; `.gitignore` excluye toda la carpeta
  salvo ese README.

## 2026-09-03 · Cierre de P1.4 y P1.5: reciprocidad, primitivas, permisos y Axe

- **Reciprocidad de `links` (P1.4, D-015).** Nuevo módulo puro
  `packages/editorial/src/links.ts`: `buildBacklinkIndex`, `backlinksFor`,
  `listBacklinks`, `linkKey`, `linkTargetHref`, `editorialPieceHref`. La
  relación inversa se deriva del array `piece.links`; no se guarda copia. En el
  visor: `editorialBacklinks`/`editorialBacklinkIndex` en `lib/editorial.ts`,
  componente `components/editorial/backlinks.tsx` y bloque de reciprocidad en
  las fichas de insight (`/insights`), acción (`/actions`, con anclajes nuevos
  por fila), página (`/pages/[id]`), informe (`/reports/[id]`) y query. Los
  enlaces de ida pasan a ser navegables desde el detalle de la pieza, y
  `cluster`/`result` se muestran como texto porque su ficha llega en P6/P9.
  Nueva API `GET /api/v1/editorial/backlinks`. Se publica `/queries/[id]`, que
  era un enlace roto: la API y las evidencias de los insights ya apuntaban ahí.
- **Primitivas de `@seo/ui` (P1.5).** `DecisionThread` (raíl pegajoso vertical,
  horizontal y desplazable por debajo de 820 px), `InsightStack` (lista numerada
  con badges, decisión propuesta, evidencia y procedencia) y `ChartFrame` (valor
  actual, periodo anterior, interanual, objetivo, cobertura y tabla accesible
  junto al gráfico), más `DataTablePanel`, que salió de un hallazgo de Axe. Todas
  en uso real: portada, ficha de proyecto y detalle de informe. Se retiró la CSS
  muerta de la lista de conclusiones ad hoc del visor.
- **Permisos con pruebas (P1.5).** `apps/viewer/lib/permissions.test.ts` (12
  pruebas) lee las fuentes de `app/` y falla si el visor exporta un método de
  escritura, declara `"use server"` o importa un módulo de escritura; también
  cubre `serviceAuthorized`. La primera versión de una de esas pruebas encontró
  una asimetría real: `api/v1/service/scheduled` se protege con `CRON_SECRET`, no
  con el token de servicio, así que la aserción se ajustó a la realidad en lugar
  de forzar el código. `apps/workbench/lib/permissions.test.ts` (5) fija el
  embudo de escritura en `app/editorial/actions.ts`. Total: 60 → 85 pruebas.
- **Axe como herramienta externa (D-016).** `axe-core` 4.13.0 + `pnpm axe`
  (`scripts/axe-audit.mjs`, protocolo DevTools, sale 1 si hay incumplimientos).
  Primera pasada: **18 incumplimientos reales** que el script propio no veía
  (`select-name` en los tres filtros globales a 375 px, `aria-pressed` en enlaces
  del calendario, tablas desplazables sin acceso por teclado, editor TipTap sin
  nombre accesible). Corregidos todos, más los avisos de `heading-order` y un
  `landmark-unique`. Estado final: 36 combinaciones ruta × viewport, **0
  incumplimientos y 0 avisos** (`docs/design/axe-report.json`).
- **QA en navegador.** Dos procesos reales (workbench 3021 escribe, visor 3020
  lee, porque 3000 y 3010 estaban ocupados por otros proyectos): se curó una
  pieza Noken con seis enlaces, se comprobó la reciprocidad en las cinco fichas y
  el estado vacío explícito en el resto, y se revirtió el dato de prueba con
  `git checkout` al terminar. `pnpm editorial:import` sigue diciendo «Sin
  cambios». Capturas `after` regeneradas: 13 rutas × 4 viewports sin
  desbordamiento.
- **Estado (D-017).** P1 pasa del 84% a `complete` con 30 de sus 32 criterios
  cumplidos dentro de la fase. Los dos restantes —ventanas de 28/90/180 días y
  recorrido oportunidad → resultado— se trasladan con el mismo alcance a la nueva
  subfase `P3.5`, porque describen datos que solo existen cuando GA4 y GSC entren
  como fuentes reales; se descartó reformularlos para cerrar 32/32, que habría
  borrado del roadmap la obligación de medir el resultado. `P2` queda `active` al
  0% y su primera tarea es `P2.1` (inventario y clasificación de V1).
- Verificaciones: `pnpm continuity:check`, `pnpm typecheck` (8 paquetes),
  `pnpm test` (85), `pnpm build` (visor + workbench, con `/queries/[id]`),
  `pnpm editorial:import` y `pnpm axe` en verde.

## 2026-09-03 · P2.1 · Inventario y contratos de migración V1

- **Auditoría sobre el código real de V1**, no sobre la prosa de `V1_PARITY.md`.
  V1 vive en `~/Desktop/Proyectos/seo-dashboard` (Astro 5 + Svelte 5): 18 páginas
  y 34 endpoints. Se recorrió el grafo de imports de cada página —entre 73 y 155
  ficheros por ruta— para extraer sus fuentes, transformaciones, filtros,
  exportaciones y dependencias sin clasificar de memoria.
- **Hallazgo con consecuencias.** Seis endpoints de V1 no tienen ninguna UI
  montada: `canibalizaciones-build`, `url-keywords`, `trendbook-report`,
  `trendbook-query`, `cita-tienda-flow` y `cita-tienda-es`. Es el mismo patrón que
  D-006 encontró en el calendario, así que se catalogaron como superficies de
  pleno derecho en lugar de darlos por muertos. Cuatro se conservan; solo dos se
  proponen para retirada.
- **Contrato en lugar de documento (D-018).** `packages/contracts/src/migration.ts`
  define superficies, disposiciones, aprobación y tolerancias con zod;
  `docs/continuity/v1-migration-inventory.json` es la fuente de datos;
  `scripts/migration-report.mjs` renderiza el Markdown y, con `--check`, falla si
  se desincroniza, si falta una ruta de `V1_PARITY.md`, si una fase de destino no
  existe en el roadmap o si una retirada llega sin alternativa. El esquema hace
  imposible por construcción una tolerancia sin motivo o un `retire` sin sustituto.
- **Resultado.** 23 superficies: 4 `retain`, 10 `redesign`, 6 `merge`, 1 `defer` y
  2 `retire` (ambas `proposed`). 8 datasets con reconciliación: el editorial ya
  `reconciled` desde P1, cinco `pending`, el de SEMrush contra su caché archivada
  y el estado de tareas en `localStorage` declarado `not-comparable` porque nunca
  salió del navegador de cada persona.
- **Decisiones de tolerancia que conviene no reabrir sin motivo.** Clics de GSC
  exactos e impresiones a ±0,5% porque Google las reprocesa; GA4 a ±1% en sesiones
  y ±2% en usuarios por el recuento aproximado, con conversiones exactas; el CTR no
  se reconcilia por separado porque es derivado; el health score del crawler es no
  comparable porque V2 lo recalibra, así que se compara el inventario de issues
  —el dato— y no la puntuación —la opinión—.
- **Los dos ejes se mantienen separados.** `V1_PARITY.md` dice dónde está cada
  capacidad; el inventario dice qué se hace con ella.
- Verificaciones: `pnpm continuity:check`, `pnpm migration:check` (23 superficies,
  8 datasets, 17 rutas de paridad cubiertas), `pnpm typecheck` (8 paquetes),
  `pnpm test` (92, siete nuevas) y `pnpm editorial:import` («Sin cambios»). Se
  comprobó que la verificación falla de verdad: al quitar `/canales/sem` del JSON,
  `migration:check` sale 1 con el motivo exacto. No se ejecutó `pnpm build` ni
  `pnpm axe`: el incremento es de contratos y documentación, sin superficie nueva
  en las apps.
- **Aviso para la próxima sesión.** `pnpm format` reformatea unos 130 ficheros
  ajenos al cambio: el árbol committeado no está formateado con la configuración
  actual de Prettier. Se revirtió ese ruido; formatea solo lo que toques.
- Abierto para el responsable: aprobar o rechazar las dos retiradas propuestas.
  P2 no cierra mientras sigan en `proposed`.

## 2026-09-04 · P2.2 · Portada y visión transversal del grupo

- **Se cierra `P2.2`** con la ruta `/portfolio` del visor: selector de las ocho
  marcas, agregado con cobertura declarada, comparativa periodo anterior /
  interanual, mercados con visibilidad ponderada, objetivos con progreso
  valor ÷ objetivo, cinco explicaciones derivadas con evidencia y comparación de
  fuentes V1 frente a V2 marca a marca. `P2` pasa al 50%.
- **La decisión de fondo (D-020): no inventar cifras para completar la pantalla.**
  La V1 medía las ocho marcas con GA4 y el piloto de V2 son dos, así que lo
  cómodo era generar ocho series sintéticas. En su lugar, las seis marcas fuera
  del piloto llegan con `analytics: null` y un motivo escrito, y cada agregado
  dice cuántas marcas lo sostienen («2 de 8 marcas con serie analítica»). La
  pérdida temporal de cobertura frente a V1 queda visible y auditable en la
  propia pantalla en vez de ser un silencio.
- **Lo que hace útil la pantalla hoy** es cruzar dos fuentes con cobertura
  distinta y decirlo: analítica sintética del piloto y **plan editorial real** de
  las ocho marcas, importado de V1 desde P1. Sin ese cruce, seis de ocho filas
  estarían vacías; con él, el selector de marcas informa desde el primer día.
- **Un solo origen para los agregados.** `aggregatePortfolio` es pura y calcula
  totales, mercados, objetivos, cuotas, cobertura y notas. No hay un segundo
  cálculo del mismo número, así que un total no puede contradecir sus sumandos.
  El generador sintético deriva las cifras de cada marca de sus filas de mercado
  —no al revés—, y por eso la suma por mercados cuadra con el total bajo
  cualquier filtro; hay pruebas que lo fijan.
- **Explicaciones derivadas, no redactadas.** `buildPortfolioNarrative` aplica
  cinco reglas fijas sobre los propios agregados (mayor caída y mayor avance por
  mercado, concentración de cuota ≥50%, objetivo más rezagado y cobertura
  incompleta), ordena por magnitud y adjunta evidencia. El mismo payload produce
  siempre las mismas notas: hay una prueba de determinismo.
- **Filtros compartibles sin JavaScript.** `brands`, `market`, `period` y
  `compare` viajan en la query string y cada control es un `<Link>`. El orden de
  marcas se normaliza al canónico (dos enlaces con las mismas marcas en distinto
  orden dan el mismo resultado), una marca desconocida se descarta en vez de
  romper el enlace, la selección nunca queda vacía y la query omite los valores
  por defecto. `/api/v1/portfolio` lee exactamente el mismo estado.
- **Se unificó la lista de marcas (D-019).** Había dos, con nombres distintos
  para la misma marca. Ahora `BRANDS` en `taxonomy.ts` es la única, y
  `EDITORIAL_BRANDS`/`PILOT_PROJECTS` se derivan conservando su nombre público:
  ningún consumidor cambió. Se añadieron `domain` y `v1Sources`, este último
  copiado de la configuración real de V1. El dominio de Gamadecor queda `null`
  porque V1 no lo declaraba —no tenía Search Console—; inventarlo era más cómodo
  que decirlo.
- **Axe encontró dos defectos reales que la revisión propia no vio**, y por eso
  se registraron las dos rutas nuevas en `scripts/axe-audit.mjs` y
  `scripts/capture-screenshots.mjs` antes de auditar: `aria-pressed` no está
  permitido en `role="link"` (crítico) y el chip de marca pendiente seleccionado
  no llegaba a contraste AA con `--ds-graphite` (serio). Corregidos con
  `aria-current` + nombre accesible que dice qué hará el enlace, y con
  `--ds-ink`.
- **Se repurpuso `/api/v1/portfolio`**, que hasta ahora devolvía el payload de la
  portada y no tenía ningún consumidor: ahora sirve la visión transversal, que es
  lo que su nombre decía.
- Verificaciones: `pnpm continuity:check`, `pnpm migration:check` (23 superficies,
  8 datasets), `pnpm typecheck` (8 paquetes), `pnpm test` (**132**, 40 nuevas),
  `pnpm build` (viewer + workbench), `pnpm axe` (**40 combinaciones, 0
  incumplimientos**), 0 px de desbordamiento a 375 px y las tres redirecciones 308
  comprobadas con la query string intacta (`/conjunto` → `/portfolio`).
- Deuda anotada: `/` y `/portfolio` difieren en 1 sesión por redondeo, porque
  agregan por caminos distintos; desaparece en P3 cuando lean del mismo almacén.
  Las seis marcas no piloto no tienen ficha `/projects/[slug]`.
- Abierto para el responsable, sin cambios: aprobar o rechazar las dos retiradas
  propuestas (`/api/cita-tienda-flow.json`, `/api/cita-tienda-es.json`). P2 no
  cierra mientras sigan en `proposed`.

## 2026-09-04 · P2.3 (mitad) · Informes con archivo histórico y rutas heredadas

- **Se cierran dos de los cuatro criterios de `P2.3`**: informes con archivo
  histórico y navegación compatible. `P2` pasa al 57%, que es el recuento de 8
  criterios terminados sobre 14, no una estimación.
- **Los capítulos de V1 se leyeron de su código, no del inventario.**
  `InformeTrimestral.svelte` tiene 8 secciones más apéndice e `InformeV2.svelte`
  10; son 19 secciones reales que se fusionan en 16 capítulos (D-021). Tres
  existían en los dos informes a la vez —resumen, salud técnica y próximo
  periodo—, y eso es lo que justifica fusionar en vez de duplicar. La
  equivalencia que se revisará con el responsable es comprobable contra el
  original, y una prueba fija que siguen siendo 19.
- **Regla que impide la paridad de escaparate**: un informe no puede declarar un
  capítulo cuyo estado sea `pendiente`. Sin ella, cualquier informe podría lucir
  «16 de 16 capítulos» sin nada detrás. Hay prueba sobre todo el archivo.
- **La cadena de versiones es la prueba de la inmutabilidad**, así que se muestra
  entera. `report-2026-06` lleva fe de erratas real (macroconversiones de Noken
  US duplicadas) y `report-noken-q2` una segunda versión con revisor distinto:
  son los dos casos que obligan a no reescribir una versión publicada.
- **Un error propio que la verificación destapó.** Al ampliar el archivo a siete
  informes, `/api/v1/reports/[id]` y `/api/v1/exports/[id].csv` devolvían 404
  para los cierres anteriores, porque seguían leyendo del payload de la portada,
  que solo conoce los recientes. La pantalla mostraba informes que la API negaba.
  Ahora el archivo es la única fuente de los cuatro consumidores.
- **Rutas heredadas: redirigir y decirlo, no una de las dos cosas (D-022).** Las
  dos rutas de V1 sin equivalente todavía (`/tracking/pilar-contenidos` → P6,
  `/insights/llm` → P8) llevaban meses en la matriz como `missing`. Dejar el 404
  rompe enlaces guardados; redirigir en silencio a algo que no es lo mismo finge
  paridad. Redirigen a la superficie más cercana arrastrando `?from=` y el
  destino declara en pantalla qué falta y en qué fase llega.
- `apps/viewer/lib/legacy-routes.ts` cataloga las cinco redirecciones y
  `legacy-routes.test.ts` lee `next.config.ts` como texto: falla si una lista
  tiene una ruta que la otra no, si una redirección de V1 no es 308 o si un
  destino parcial no arrastra su `?from=`. Antes esa correspondencia solo vivía
  en un comentario del config.
- Las seis superficies nuevas de P2.2 y P2.3 se registraron en
  `scripts/axe-audit.mjs` **antes** de auditar, incluidos el archivo filtrado y
  su estado vacío. Entraron limpias: 48 combinaciones, 0 incumplimientos.
- Verificaciones: `pnpm continuity:check`, `pnpm migration:check`,
  `pnpm typecheck` (8 paquetes), `pnpm test` (**155**, 23 nuevas), `pnpm build`,
  `pnpm axe` (48 combinaciones, 0 incumplimientos) y las cinco redirecciones
  comprobadas con curl conservando la query string.
- Quedan abiertos los otros dos criterios de `P2.3`: planes de acción con
  seguimiento y cronología —que absorbe `/conjunto/radar`— y herramientas e
  importadores locales. Después, `P2.4`, que no se puede cerrar sin el
  responsable SEO.

## 2026-09-04 · P2.3 completa · Cronología, seguimiento y herramientas locales

- **Se cierran los otros dos criterios de `P2.3`**, con lo que la subfase queda
  completa y `P2` pasa al 71%: 10 de sus 14 criterios terminados.
- **La cronología nació mal y la verificación lo destapó.** Al mezclar los cuatro
  carriles en un solo hilo, el plan editorial —que se programa meses por
  delante— sepultaba el diagnóstico: la incidencia de canonical del 16 de agosto
  quedaba veinte hitos por debajo de posts de diciembre que aún no han pasado. Se
  separó en **dos horizontes** por el corte del dato (D-023). Ahora agosto
  muestra el core update del 24 y la incidencia del 16 junto a los eventos
  editoriales de esos días, que es la mitad de un diagnóstico.
- **Un carril se declara vacío a propósito.** El radar de V1 ya estaba decidido
  en P2.1 como «no conservar como vertical aislado hasta automatizarlo» (P4).
  Migrar a mano sus cuatro noticias curadas las habría dejado congeladas y habría
  dado por resuelto un carril que no lo está. Vacío y fechado es información; su
  ausencia se confundiría con «no pasó nada».
- **El plazo se mide contra el corte del dato, nunca contra el reloj.**
  `trackAction(action, asOf)` recibe el corte como argumento. Decir «vencida hoy»
  sobre un snapshot de hace tres días es falso y además haría el render no
  determinista. Hay prueba de las tres transiciones.
- **Cada versión publicada de informe es su propio hito en la cronología**,
  correcciones incluidas: una fe de erratas cambió lo que se leyó, y esconderla
  tras la versión vigente falsearía la historia.
- **Herramientas locales: el riesgo no era decidir mal, era no decidir (D-024).**
  V1 tenía un crawler, un generador de snapshots y cuatro endpoints de desarrollo
  que nunca fueron pantalla y aun así hacían trabajo real. Se catalogan 12
  utilidades en `/herramientas` del workbench: 4 disponibles con punto de entrada,
  1 bloqueada con motivo medido, 6 pendientes con fase y 1 retirada propuesta sin
  aprobar. `disponible` significa ejecutable ahora, y hay pruebas que lo exigen.
- Los orígenes de V1 y las fases del catálogo **no se escriben a mano**: salen del
  inventario de P2.1 y una prueba falla si una herramienta apunta a un origen no
  catalogado o adelanta su fase. El catálogo no puede prometer antes que el
  roadmap.
- **Axe volvió a encontrar lo que la revisión propia no vio**: dos landmarks con
  el mismo nombre accesible («septiembre 2026») y dos `id` duplicados, porque el
  corte cae a mitad de mes y septiembre aparece en los dos horizontes. Se corrigió
  prefijando por horizonte y dejando de convertir cada mes en `section`: una
  agrupación dentro de la cronología no es un landmark.
- Se extrajo `WorkbenchNav` al llegar la tercera sección del workbench: con dos
  páginas la lista duplicada era tolerable, con tres cada sección nueva obligaría
  a tocar todos los ficheros.
- Verificaciones: `pnpm continuity:check`, `pnpm migration:check`,
  `pnpm typecheck` (8 paquetes), `pnpm test` (**180**, 88 nuevas en la sesión),
  `pnpm build` (cinco rutas nuevas entre las dos apps) y `pnpm axe`
  (**56 combinaciones, 0 incumplimientos y 0 avisos**).
- **Aviso para la próxima sesión.** `P2.4` no se puede cerrar sin el responsable
  SEO: sus tres criterios son reconciliación con tolerancia, validación de flujos
  y registro de retiradas. Lo que sí corresponde al desarrollo es preparar el
  guion de validación por flujo y el procedimiento de reconciliación, para que la
  sesión no se improvise. Y al abrirla, recordar que **ninguna cifra analítica de
  V2 es real todavía**: hoy solo se puede aceptar equivalencia de superficie,
  filtros, navegación, trazabilidad y explicabilidad.

## 2026-09-04 · Preparación de P2.4 (cierre de sesión)

- `P2.3` queda completa y se prepara `P2.4` con lo único que corresponde al
  desarrollo: [`docs/continuity/P2_ACCEPTANCE.md`](P2_ACCEPTANCE.md). No sustituye
  a la validación con el responsable; la habilita.
- **Hallazgo que cambia la conversación sobre la reconciliación.** «Pendiente» se
  estaba leyendo como «esperando credenciales», y eso solo es cierto en dos de los
  seis contratos abiertos. Los otros cuatro —`semrush-cache`, `crawl-snapshots`,
  `canibalizaciones-snapshot` y `prompts-geo-inventory`— comparan contra ficheros
  estáticos que están en el disco de V1, y están bloqueados porque **el lado de V2
  no existe todavía** (P3.3, P5, P6, P8). La reconciliación de esos cuatro no es
  una negociación de accesos: es trabajo de esas fases.
- Las afirmaciones del documento se comprobaron contra el disco antes de
  escribirlas, no de memoria: los cuatro ficheros de SEMrush del piloto están en
  `src/data/tracking-pilar/`, `sites-overview.json` tiene los 7 sitios declarados,
  `prompts-geo.json` tiene 24 prompts con el reparto exacto del contrato (us 8,
  uk 6, fr 5, es 5) y `src/data/audits/` tiene 26 ficheros. Buscando el caché de
  SEMrush apareció primero un directorio con solo Krion y Gamadecor, que habría
  hecho parecer erróneo el contrato; los ficheros del piloto estaban en otra
  carpeta y el contrato es correcto.
- **Conflicto que se registra como bloqueo en vez de esconderlo.** El primer
  criterio de salida de `P2` dice que ninguna capacidad **crítica** de V1 puede
  quedar en `missing`, y quedan cuatro: `/tracking/autoridad-tematica` (P6),
  `/tracking/prompts-geo` (P8), `/canales/sem` (P6) y
  `/conjunto/canibalizaciones` (P6). Todas tienen fase y motivo, pero el criterio
  no dice «con fase declarada». Si el responsable las considera críticas, `P2` no
  cierra y su alcance se amplía; si no, hay que registrarlo como decisión con
  nombre y fecha. El desarrollo no puede decidirlo, así que se añade el bloqueo
  `p2-exit-missing` en lugar de dar el criterio por bueno.
- El guion cubre cinco flujos completos —detectar→decidir, oportunidad→publicación,
  informe y archivo, herramientas locales y rutas antiguas— con la pregunta que el
  responsable debe poder contestar **desde la pantalla, en menos de un minuto**, y
  los puntos de fallo a vigilar. El más importante: si interpreta las seis marcas
  sin serie como «cero» en vez de «no medida», la declaración de cobertura no
  funciona por correcta que sea.
- Límites que el guion deja escritos para que nadie los dé por cerrados: el
  recorrido editorial llega hasta «publicada», no hasta «funcionó» (el resultado
  medido es `P3.5`), y ninguna cifra analítica de V2 es real todavía.

## 2026-09-04 · Portada derivada del contrato (defecto detectado al verificar)

- Al comprobar la portada con distintos filtros aparecieron **dos mentiras** que
  llevaban ahí desde P1 y que ninguna prueba cubría (D-025):
  1. El rango de fechas decía «03–30 agosto 2026» con **cualquier** periodo
     seleccionado. Elegir «Últimos 24 meses» seguía anunciando 28 días sobre
     cifras que sí habían cambiado.
  2. La tarjeta de «Prioridad del periodo» anunciaba «Resolver indexabilidad en
     Francia · Porcelanosa» **también al filtrar por Noken**: atribuía a una
     marca el riesgo de otra.
- La ventana temporal entra en el contrato (`periodWindowSchema`,
  `buildPeriodWindow(period, cutoff)`), se calcula desde el corte del dato y no
  desde el reloj, y su corte coincide con el `asOf` de la cobertura declarada.
  La comparación anterior es contigua y de igual longitud, sin solaparse; el
  interanual desplaza 365 días. Diez pruebas nuevas lo fijan, incluida la
  coincidencia de cortes, porque es la clase de error que no se ve leyendo la
  pantalla.
- La prioridad se deriva con `rankInsight`, la **misma** fórmula que ordena
  `/insights`: la portada no puede destacar algo distinto de lo que esa pantalla
  considera más urgente. Con Noken seleccionado ahora muestra su propia
  conclusión; sin ninguna conclusión que pase el umbral, lo dice en vez de
  inventarla.
- **El mismo defecto estaba en la ficha de informe**, multiplicado por siete al
  ampliar el archivo en P2.3: resumen e índice escritos a mano e idénticos en
  todos los informes. El cierre anual de 2025 anunciaba el resultado de agosto de
  2026. Ahora el resumen es el del propio informe y los bloques son los capítulos
  que declara, con su sección original de V1, su estado y la superficie que hoy lo
  cubre; la barra lateral enumera también los que **no** incluye, con su fase.
- **La portada del workbench era el caso más grave y también se corrigió.**
  Anunciaba dos crawls «aprobados» con 2.020 y 11.387 URLs y un historial de
  preparación completo, cuando no se ha ejecutado ni un crawl porque el preflight
  lo impide, y la curación estaba vacía. Ahora lee el informe de importación, el
  almacén de curación y la medición de disco: 261 filas editoriales bajo control,
  crawl bloqueado con la cifra real (5,9 GiB de 50) y curación declarada vacía.
  El historial solo admite hitos fechados en una fuente local.
- Un barrido con `grep` sobre el JSX del visor confirmó que no queda ninguna cifra
  con separador de miles escrita a mano. Sí aparecieron dos textos que ya habían
  divergido de la taxonomía: la página de proyectos escribía las olas de
  expansión a mano y llamaba «L'Antic Colonial» a lo que el contrato llama «Antic
  Colonial». Ahora se derivan con `expansionWaves()`, con prueba.
- **Incidente de disco durante la sesión.** El bloqueo `local-disk` llegó a cero:
  `Bash` y `Write` empezaron a fallar con `ENOSPC` a mitad de la verificación. La
  causa era el caché de Turborepo (`.turbo`), 6,4 GB de artefactos regenerables
  excluidos por `.gitignore`. Al borrarlo se recuperaron de 117 MiB a 6,6 GiB
  libres y se completaron las verificaciones pendientes. Sigue muy lejos de los
  50 GiB que exige el preflight para habilitar crawls.
- Verificaciones: `pnpm typecheck` (8 paquetes), `pnpm test` (**190**, 10 nuevas),
  `pnpm build` y `pnpm axe` (56 combinaciones, 0 incumplimientos). Comprobado a
  mano que la ventana cambia con los tres periodos y que la prioridad sigue al
  proyecto.
- **`pnpm status` mide el disco en vez de recitarlo.** El bloqueo `local-disk`
  llevaba sesiones anunciando una cifra escrita a mano y el disco se llenó de
  verdad mientras el estado decía «~6,2 GiB libres». Ahora el script mide al
  abrir sesión, avisa de que 5,2 GiB bastan para desarrollar pero no para crawls,
  y **sale con código 1 por debajo de 3 GiB** con el recurso de recuperación a la
  vista. Comprobado que falla de verdad: con el umbral forzado sale 1; con el
  estado real, 0. Es el mismo principio de D-025 aplicado a la propia continuidad:
  un bloqueo cuyo número no se comprueba deja de ser un bloqueo.

## 2026-09-04 · P2.4: los contratos de reconciliación se ejecutan

- Se ejecutaron por primera vez los ocho contratos de reconciliación que `P2.1`
  solo había escrito. `scripts/reconcile.mjs` mide el disco de V1, hashea cada
  fuente y congela el resultado en
  `docs/continuity/v1-reconciliation-baseline.json`, versionado en el repositorio.
  Estados: **1 reconciliado** (los cuatro snapshots editoriales), **4 con baseline
  congelado** (SEMrush, crawls, canibalización, prompts GEO), **2 bloqueados**
  (GA4 y GSC solo existen como consulta en vivo) y **1 no comparable** (el estado
  de tareas nunca salió del navegador). 28 ficheros de V1 medidos.
- **La ejecución encontró un fallo real del inventario de P2.1**, que la
  validación de la sesión anterior había repetido sin comprobar: el contrato
  `semrush-cache` declaraba como muestra «Porcelanosa y Noken en ES y UK», y
  `semrush-porcelanosa-uk.json` no existe ni ha existido —Porcelanosa cachea
  `de`, `es` y `fr`—. Comparar contra un fichero ausente no habría fallado:
  habría dado por bueno un dataset vacío en silencio. Corregido a los 15 ficheros
  reales con 328 queries, ahora medidos y hasheados (D-026).
- La reconciliación editorial compara **V1 medido contra V2 medido**, no cada lado
  contra una constante del contrato, y exige además que el hash del fichero en
  V1 siga siendo el que archivó el importador. Comprobado que falla de verdad por
  tres vías: quitando una fila del dataset normalizado (V1 115 vs V2 114),
  alterando el hash congelado y alterando una medida del baseline.
- Se corrigió una aserción propia demasiado estricta: exigía tolerancia exacta en
  **todas** las métricas y marcaba como error tres contratos correctos. Un
  contrato puede mezclar lo verificable contra el fichero con lo que cambia por
  diseño al migrar (SEMrush recalcula volúmenes, el health score se recalibra, la
  canibalización se recalcula con otro criterio). Lo exigible es al menos una
  métrica exacta por dataset ejecutable y motivo escrito en las no comparables.
- Se corrigió también la primera versión de la sonda editorial, que medía claves
  de nivel superior y ponía un «2» al lado de los 39 eventos de V2 sin comparar
  nada: los eventos viven anidados en `months` y las propuestas dentro de cada
  hueco.
- Añadido `packages/contracts/src/reconciliation.ts` con el esquema del baseline y
  15 pruebas; el esquema rechaza un `reconciled` sin lado V2, un `blocked` sin
  motivo y un `baseline-frozen` sin ficheros medidos.
- `pnpm continuity:check` exige ahora el baseline, su informe y el guion de
  aceptación. Verificaciones: typecheck 8 paquetes, **206 pruebas** (191 antes),
  `migration:check`, `reconcile:check` y `continuity:check` en verde.
- `P2` pasa al **79%** (11 de 14 criterios). Lo que queda no es desarrollo: son
  dos decisiones del responsable y las dependencias de P3/P5/P6/P8, con la
  muestra V1 ya preparada para comparar. El siguiente incremento de desarrollo
  con sentido es `P3.1`, que además desbloquea GA4 y GSC.
- Aviso operativo: el disco bajó a **4,8 GiB** libres durante la sesión. `pnpm
  status` lo mide y sale con código 1 por debajo de 3 GiB.

## 2026-09-07 · P3.2: la unidad de ingesta pasa a ser el día

- **Se encontró un defecto real en el orquestador de P0 al releer el criterio.**
  `SyncOrchestrator` construía su clave de idempotencia como
  `proyecto:fuente:corte` y trataba los siete días de reprocesado como un solo
  commit. Consecuencia concreta: los mismos siete días ingeridos hoy y mañana
  producen dos claves distintas, así que nada impedía que convivieran dos
  versiones del mismo día. El criterio del roadmap pide idempotencia y
  reprocesado de siete días; con la ventana como unidad, la idempotencia solo
  protegía de repetir el ciclo el mismo día.
- Se añadió el reparto por día: `packages/sync/src/plan.ts` expande
  `proyecto x fuente x día` con clave `proyecto:fuente:día` que **no depende del
  reloj**, `ledger.ts` guarda la huella de las filas de cada día e `ingest.ts`
  ejecuta el ciclo. Reingerir contenido idéntico es `unchanged`; distinto es
  `revised`, con huella anterior y contador de revisiones. Un número no puede
  moverse en silencio (D-030).
- **Dos constantes escritas a mano quedaron sustituidas por el catálogo (D-029).**
  La ventana anterior aplicaba `D-3` a todas las fuentes cuando el catálogo ya
  declaraba GA4 `D-1`, GSC `D-3`, SEMrush y CrUX `D-7`; y producía **ocho** días
  (`cutoff - 7 .. cutoff`) para un criterio que pide siete. Ahora el desfase sale
  de la fuente y la cola son siete días contando el corte. La prueba heredada se
  actualizó con el motivo escrito y se amplió a tres fuentes.
- **El fallo y su antigüedad son ahora dos cosas distintas.** El libro solo se
  escribe en el éxito, así que un fallo conserva el último snapshot válido por
  construcción. `snapshotStaleness` publica `behindDays` (el dato se quedó atrás)
  y `missingDays` (falta un día **dentro** de la ventana). Sin la segunda, un
  fallo a mitad de ventana se leía «al día» y el día ausente parecía una caída de
  tráfico a cero: eso salió al ejecutar el ensayo, no al diseñarlo.
- Se añadió `pnpm ingest:dry-run` (`--cycles`, `--at`, `--fail-day`): ejecuta los
  ciclos completos y **sale con código 1** ante un duplicado, una deriva o un
  hueco. Es el criterio de salida «cuatro ciclos de sincronización de prueba
  terminan sin duplicados ni deriva» ejecutado, no enunciado. Resultado: 4
  ciclos, 28 jobs por ciclo, 28 días en el libro, 0 duplicados y 0 derivas; con
  `--fail-day=2026-09-02`, 4 jobs fallidos, 24 conservados y los registros del
  día intactos.
- **El ensayo falló de verdad en su primera ejecución y encontró un fallo propio**:
  se le pasaba `PILOT_PROJECTS`, que son objetos `Brand` y no slugs. El plan no
  se quejó: interpoló «[object Object]», las dos marcas colapsaron en la misma
  clave y 28 jobs se convirtieron en 14 **sin un solo error**. Dos correcciones:
  `planIngestion` valida proyectos y fuentes con los esquemas aunque el tipo ya
  los declare, y `packages/sync/tsconfig.json` incluye `scripts/**`, que estaba
  fuera del typecheck —el error vivía justo ahí—.
- No se toca ninguna pantalla ni se declara ninguna integración: los lectores
  exponen `describe()` con `realData: false` y el informe del ciclo lo repite.
  Conectar GA4 o Search Console será implementar `DailySourceReader`, sin tocar
  el planificador ni el libro.
- `SyncOrchestrator` se conserva para las fuentes semanales de `P3.3` y la
  publicación firmada, con la nota de por qué queda superado para las diarias.
  No se le añadió la lógica diaria: dos implementaciones de la misma ingesta es
  peor que una superada y declarada.
- Verificaciones: `pnpm typecheck` (9 paquetes), `pnpm test` (**263**, 17
  nuevas), `pnpm build`, `pnpm ingest:dry-run`, `pnpm continuity:check`,
  `pnpm migration:check` y `pnpm reconcile:check` en verde. `pnpm axe` no se
  reejecutó: la sesión no toca ninguna pantalla. `P3` pasa al **19%** (3 de 16).
- Aviso de continuidad: al actualizar `lastValidation` en
  `docs/continuity/PROJECT_STATE.json` se perdieron las claves que sesiones
  anteriores habían dejado más allá de `editorialImport`; el fichero estaba sin
  commitear, así que no había versión anterior en Git a la que volver. Lo que
  figura ahora está reejecutado hoy y queda anotado en el propio bloque.
- Sigue pendiente lo que el desarrollo no puede cerrar: credenciales de Neon,
  GA4, GSC y SEMrush, y la sesión de aceptación de `P2` con el responsable.

## 2026-09-07 · P3.3: cuota, reintento, lock y `SyncRun` observable (D-031)

- Se cierra el tercer criterio de `P3.3` —«cuotas, reintentos, locks, datos
  parciales y observabilidad por `SyncRun`»—, que llevaba desde P0 enunciado en
  el roadmap y sin existir en ninguna parte del código. Como D-030, se puede
  escribir sin credenciales porque son reglas, no fachada: `policy.ts` (cuota,
  clasificación de fallos, backoff y lock con ficha) y `run.ts` (`SyncRun`).
- Las reglas que cambian el comportamiento, no la documentación:
  - La cuota se **reserva antes** de llamar. Contarla después es contar lo ya
    gastado: cuando el contador ve el exceso, la petición ya salió.
  - **Cada reintento se cobra al mismo presupuesto**, o el presupuesto es una
    cifra decorativa que un día de 429 duplica sin que nadie se entere.
  - El fallo se clasifica **por tipo o por código, nunca por el texto**. Lo
    permanente sale a la primera; lo desconocido tiene menos intentos que lo
    transitorio; un día vacío no se reintenta porque es una ausencia, no una
    avería; perder el lock es permanente dentro del ciclo.
  - La espera crece **con dispersión**: sin ella, 28 jobs con el mismo 429
    esperan lo mismo y vuelven a la vez. Hay techo por intento y por job.
  - El lock lleva **ficha creciente** y se comprueba **justo antes de escribir**.
    El TTL caduca el permiso, no el proceso: sin ficha, un ciclo atascado que
    despierta tarde escribe encima del que le sustituyó. Lo que hay que impedir
    es la escritura tardía, no la lectura tardía.
  - Un `SyncRun` con algún día fuera es `partial`, **nunca** `complete`. Sin esa
    regla, un ciclo que escribió 20 de 28 días termina en verde por no haber
    lanzado excepciones y la interfaz presenta una serie con agujeros como si
    estuviera al día. Y `deferred` no es un fallo: agotar la cuota no puede
    parecer una caída del proveedor.
- `QUOTA_BUDGETS` declara el gasto que **V2 se impone**, no el límite del
  proveedor, y lo dice con `verifiedAgainstProvider: false`: misma disciplina
  que `realData` en los lectores.
- El ciclo diario ya las usa. `runIngestionCycle` acepta `policy` opcional y sin
  ella **activa cuota y lock por defecto**: la ausencia de configuración no
  puede significar ausencia de reglas.
- **Las cinco reglas centrales se verificaron por mutación antes de darlas por
  buenas**: reintentar el permanente, quitar la comprobación de ficha antes de
  escribir, declarar completo un run parcial, contar la cuota después de llamar
  y no cobrar los reintentos. Las cinco rompen entre 1 y 3 pruebas; ninguna pasó
  desapercibida. Una suite que no puede fallar no demuestra nada (D-025).
- `pnpm ingest:dry-run` ejecuta ahora los 4 ciclos **con las reglas puestas** —un
  ensayo que verifica un camino distinto del que correrá en producción no
  verifica producción— y añade tres escenarios: lock ocupado (`blocked`, 28
  aplazados, 0 de cuota, libro intacto), cuota recortada a 3 por fuente
  (`partial`, 6 escritos, 22 aplazados, 0 fallos, huecos declarados) y fuente
  intermitente (`complete`, 14 reintentos, 21 peticiones cobradas).
- Efecto colateral corregido en la misma sesión: al activarse los reintentos por
  defecto, dos pruebas de D-030 empezaron a dormir un segundo real cada una.
  Ahora inyectan una espera que no duerme; el backoff se prueba donde le toca.
- Verificaciones: `pnpm typecheck` (9 paquetes), `pnpm test` (**282**, 19
  nuevas), `pnpm build` (9 tareas), `pnpm ingest:dry-run` con y sin
  `--fail-day`, y `pnpm continuity:check` en verde. `pnpm axe` no se reejecuta:
  el cambio vive entero en `@seo/sync` y no toca ninguna pantalla. `P3` pasa al
  **25%** (4 de 16).
- Sigue pendiente lo que el desarrollo no puede cerrar: credenciales de Neon,
  GA4, GSC y SEMrush, y la sesión de aceptación de `P2` con el responsable. Lo
  siguiente que sí admite trabajo previo es la invalidación de caché por
  snapshot de `P3.4`.

## 2026-09-23 · Visor en Vercel con dato real de GA4 y Search Console (D-034, D-035)

- Cambio de prioridad pedido por el usuario: publicar ya el visor en Vercel,
  sin login y con datos reales; el workbench se queda en local.
- Nuevo origen `SEO_DATA_SOURCE=live` en `packages/repository/src/live/`
  (`google.ts`, `brands.ts`, `figures.ts`, `repository.ts`): GA4 Data API y
  Search Console API en directo desde el servidor, sin SDK, con las credenciales
  de V1. Mercados por prefijo de ruta como en V1; non-branded sobre clics con
  consulta visible; retención de 16 meses de GSC declarada; conclusiones,
  acciones, incidencias, oportunidades y GEO vacías a propósito.
- Visor: `PUBLIC_ACCESS` (D-035), textos por origen, «—» donde no hay fuente,
  caché compartida de 6 h que no guarda resultados con fuentes caídas.
  Contratos: modo `live` y `connectedSources` en `aggregatePortfolio`.
- Despliegue: proyecto `seo-dashboard-viewer` (Hobby, `fra1`), 13 variables de
  entorno (secretos de Google como `sensitive`), `.vercelignore`,
  `globalPassThroughEnv` en turbo, `standalone` solo fuera de Vercel, curación
  editorial incluida en el trazado (se perdía en silencio en producción) y crons
  retirados hasta que exista `DATABASE_URL`.
- Verificado con dato real: 28d conjunto 157.272 sesiones orgánicas y 160.489
  clics (corte 2026-09-20); filtros de mercado, 90d y 24m correctos contra la
  API; 9 rutas 200 en producción, región `fra1`, cabecera `noindex`.
- Verificaciones: `pnpm typecheck` (9 paquetes), `pnpm test` (**358**, 6
  nuevas), build de producción local y en Vercel. `pnpm axe` no se reejecuta.
- Pendiente del responsable: autenticación Entra, plan de Vercel y revisar el
  salto de `keyEvents` de Porcelanosa en el año previo a 24m.

## 2026-09-23 · Xtone en el piloto con dato real y oportunidades de GSC (D-036)

- Prioridad del usuario: cargar Xtone «al estilo Noken» con dato real para su
  presentación. Xtone pasa a `pilot: true, wave 0`; el sintético no la simula.
- Estructura del sitio detectada en GSC/GA4: ES en raíz, `/en` para UK y US
  (separados por país), `/fr`, `/de`, `/pt`, `/it`, `/pl`, `/zh`.
- Nuevo en el origen `live`: oportunidades de URL y de consultas non-branded
  contra la curva de CTR del propio sitio, conversiones por landing de GA4,
  exclusión de búsquedas de la embajadora y anotaciones fechadas por marca.
  Contrato: `queryOpportunities` (vacío en el sintético). Ficha de URL con
  diagnóstico derivado de sus cifras en lugar de texto fijo.
- Hallazgo: migración de URLs de Xtone el 2026-07-23; clics semanales de ~5.500
  a ~2.450 y 634 URL antiguas con >80 % de caída. 90d: −24,9 % sesiones,
  −37,1 % clics, cuota non-branded 18,9 %. Mayores oportunidades genéricas:
  calacatta viola, calacatta gold, verde alpi.
- Verificaciones: `pnpm typecheck` (9), `pnpm test` (**363**), producción 200
  en `/projects/xtone` y capítulos, `fra1`.

## 2026-09-23 · Informe ejecutivo de marca para dirección (D-037)

- A partir del informe PDF de Noken de la V1 y de la revisión de `/projects/xtone`
  (8 pestañas, 5 vacías, jerga), el usuario aprobó el rediseño: sin emojis,
  selector de periodo más rico, datos de todos los canales y barras frente a
  periodos anteriores.
- Nuevo contrato `brand-report.ts` (ventanas y presets de calendario, rango
  libre, dos comparaciones siempre) y constructor `live/report.ts` con canales,
  series por tramo, mes a mes, embudo, mercados, oportunidades, páginas que
  convierten, contenidos que suben y bajan, auditoría de migración con HEAD,
  plan editorial frente a Google, lecturas y próximos pasos por reglas, y
  calidad del dato.
- Vista `components/report/` con barras ECharts comparativas, selector,
  modo presentación y estilos de impresión; 4 pestañas.
- Corregido en producción: la cuota de carga de GSC en Porcelanosa (volcado
  búsqueda × página y una consulta por pieza editorial); reintentos ante 429.
- Verificaciones: `pnpm typecheck` (9), `pnpm test` (**372**), build, 375 px sin
  desbordamiento, producción 200 en los 9 periodos y las 4 pestañas.

## 2026-09-23 · Selector de periodo con calendario (D-038)

- Panel con atajos rápidos y de calendario, calendario de dos meses con vista
  previa al pasar el ratón, fechas escribibles, comparación con el periodo
  anterior o uno elegido (misma duración) y año pasado por fecha o por día de la
  semana. Todo en la URL y previsualizado con la misma función que el servidor.
- Probado en el navegador de extremo a extremo (28 días frente a las 4 semanas
  previas a la migración de Xtone) y en 375 px; producción 200 en los nuevos
  atajos y comparaciones. `pnpm test`: **377**.

## 2026-09-23 · Selector de mercado (D-039)

- Panel de mercado con visitas, variación, peso y definición por sección;
  buscador y teclado. Mercados adicionales de V1 en el informe (Porcelanosa 13,
  Noken 5, Xtone 4). Tablas separadas en principales y otros.
- Probado en el navegador (Xtone → Portugal) y en producción. `pnpm test`: **380**.
- Porcelanosa en frío tarda ~25 s por el número de mercados y el tamaño del
  sitio; después sale de la caché.

## 2026-09-23 · UX/UI de Xtone centrada en datos (D-040)

- Prioridad del usuario: claridad para gerencia, minimalismo, tipografía y
  espacio, responsive, sin conclusiones y con búsqueda/paginación de datos.
- Vista propia Xtone con 4 KPIs, gráfico ECharts interactivo y seis pestañas.
  Tabla TanStack v9 reutilizable: búsqueda por keyword/URL, orden, contador,
  10/25/50/100 filas y paginación. Conserva fuentes y avisos de medición.
- Muestras reales de GSC ampliadas a la UI sin peticiones nuevas: 3000
  combinaciones query×URL y hasta 5000 páginas; disponibilidad/cobertura
  explícitas, null sin comparación y measured editorial. Caché `.12`.
- Corregido el calendario móvil: el segundo mes estaba oculto y el botón
  siguiente impedía alcanzar el mes de corte. Filtros compactos y menú tablet.
- Validación: typecheck 9 paquetes, 390 pruebas y build viewer/workbench.
  Navegador: 1440/1024/768/390/375 px, sin overflow global; seis pestañas,
  búsquedas/orden/paginación, 28d, mercado ES y selector de métrica.
  No se reejecutó Axe. Cambios locales, sin despliegue; dev sigue levantado.
- Reanudación: feedback visual de Xtone; después P3.1 y decisiones D-035.


## 2026-09-23 · Diseño de Xtone extendido al producto (D-041)

- Petición: incorporar a todo el proyecto el diseño aprobado de Xtone.
- Informes compartidos para marcas medidas; superficies generales, editorial,
  archivo, datos, detalles y workbench con tipografía sans y datos esenciales.
- Tabla TanStack compartida en @seo/ui: búsqueda, orden, filas/páginas, impresión
  y enlaces directos a registros. Editorial conserva filtros/CSV en URL.
- Filtros móviles plegables, menú tablet, distribución correcta de 3/4 KPIs y
  foco de búsqueda global. Acciones del workbench y datos sin cambios.
- Validado: typecheck 9 paquetes, 393 pruebas, build de ambas apps y QA manual
  responsive/funcional. No se reejecutó Axe ni se enviaron formularios de escritura.
- Solo local. Dev permanece levantado. P3 25%, P2 bloqueada 79%; retomar P3.1.


## 2026-09-24 · Carga por zonas y verificación de dev (D-042)

- Retomada la integración autorizada el 23, interrumpida antes de cerrar QA.
  Dev activo en 3000/3001; workbench responde HTTP 200.
- Skeletons compartidos y carga por ámbito en los informes de marca, selección
  inmediata, estado accesible, mensaje de demora y recuperación ante error.
- Corregidos Resumen desde enlaces V1 y borrador de fechas que una respuesta
  pendiente podía sobrescribir. 33 pruebas nuevas de navegación y pestañas.
- QA real Xtone: carga inicial, filtros individuales y simultáneos, coherencia
  final, edición de fechas conservada, keywords, pestañas y enlaces antiguos.
  Desktop 1440, tablet 768 y móvil 375 sin desbordamiento del documento.
  Tabla keywords conserva su altura exacta durante carga y es inerte.
- Typecheck 9 paquetes, suite actual 426 pruebas (global + viewer tras fixes),
  build de ambas apps. No se reejecutó Axe ni se forzó un fallo de proveedor;
  error/reintento revisados en código y compilación.
- Sin despliegue. Las zonas esperan al informe completo; no se ha dividido la
  lectura del servidor. P3 25%, P2 bloqueada 79%; retomar P3.1.


## 2026-09-24 · Menú con respuesta inmediata (D-043)

- Añadidos spinner en enlace, barra indeterminada superior y aviso accesible
  de destino usando useLinkStatus. Sin dependencias nuevas ni esperas artificiales.
- Menú móvil cierra al navegar, conserva foco accesible y deja el aviso visible.
- QA navegador 1440/375: navegación lenta a Inicio, rutas cacheadas, teclado,
  cierre/foco móvil y cambio a Editorial. Indicadores se retiran al terminar.
- Typecheck 9 paquetes, 90 pruebas viewer, build y continuidad correctos.
  Dev sigue activo; no desplegado. P3 25%, P2 bloqueada 79%.


## 2026-09-24 · shadcn/ui y dashboard-01 en el visor (D-044)

- Rama `feat/shadcn-dashboard`. Tailwind v4 + shadcn en el visor; bloque
  dashboard-01 adaptado: sidebar inset mineral, cabecera con filtros Select,
  tarjetas KPI, evolución con selector de periodo y tablas en tarjetas.
- Tokens shadcn mapeados a `--ds-*` (cobalto primario, sin colores nuevos).
  Retirados los datos y dependencias de demo; ECharts y lucide se mantienen.
- Corregidos durante QA: main duplicado, foco tras navegar en móvil, filtros
  en tres filas en móvil y offsets fijos de la cabecera antigua.
- Typecheck 9 paquetes, 426 pruebas y build del visor. QA 1440/375. Axe y
  tablet pendientes. Sin despliegue ni fusión.
- Ajuste: búsqueda retirada del menú lateral; miga de pan única en la cabecera
  para todas las vistas (5 pruebas nuevas, 95 en el visor). Corregido el ancho
  de `.page` dentro del inset, que en móvil cortaba informes y fichas.
- Ajuste: periodo y mercado de la ficha de marca en la barra superior; tiempo
  real GA4 en lugar del corte, con punto verde claro intermitente. Verificado con
  dato real (XTONE 262, conjunto 660), cambio de periodo con skeletons desde la
  cabecera y panel de mercado en móvil. 432 pruebas (6 nuevas de tiempo real),
  typecheck y build de viewer + workbench.
- Ajuste: selectores de la barra sin borde y contenido alineado con los iconos
  de la barra (`--app-gutter`); medido en XTONE a 1440 (288/1408 px) y 375 px.
- Ajuste: logotipo oficial de XTONE como título de su ficha (36 px de alto).
- Ajuste: logo XTONE a 24 px, sin botón de modo presentación y submenú fijo al
  hacer scroll (57 px en escritorio, 105 px en móvil, sin overflow).
- Ajuste: retirada la frase de corte bajo el título de la ficha de marca.
- Ajuste: margen superior e inferior de la cabecera de marca unificados (42/42 px
  en escritorio, 26/24 px en móvil).
- D-045: Visitas SEO con clics de Google en pequeño en la misma tarjeta,
  conversiones al final y Modo IA en la barra inferior (sin dato separado en
  Search Console, verificado por API). 438 pruebas.
- Ajuste: tarjeta Usuarios SEO (XTONE 90 días: 26.391, −10 % vs. periodo).
- Ajuste: anillo marca/sin marca en Clics sin marca y conversiones en la barra.
- Ajuste: tarjeta gráfica de Clics sin marca y limpieza de Visitas/Usuarios SEO.
- Ajuste: tarjeta Keywords (XTONE 90 días: 25.883, +80,5 %; top 3 1.806, 4–20
  9.528, >20 14.549; Francia 4.882). Paginación de Search Console y reintento
  del tiempo real. 440 pruebas, typecheck y build de ambas apps.
- Ajuste: % de keywords sin marca (XTONE 96,9 %) y barra con tooltips.
- D-046: tarjeta Visitas desde IA (XTONE 90 días: 369, −31 %; ChatGPT 346) con
  fila Modo IA sin dato, y logo de Google en Visitas SEO.
- Ajuste: total de IA como fila de la tabla (369, −31 %).
- Ajuste: fuente de las tarjetas movida a un icono Info junto al título.
- Ajuste: nuevos/recurrentes en Usuarios SEO (XTONE 68 % nuevos, +42,1 pp).
  Verificado en crudo: el % de nuevos salta de ~22 % a 54–73 % desde julio de
  2026, coincidiendo con el cambio de URLs del 23-07; posible efecto de
  medición, pendiente de revisar con el equipo.
- Ajuste: tabla de IA con total arriba y «Ver más», Modo IA en Visitas SEO y
  sin barra en Usuarios SEO.
- Ajuste: anillos de % nuevos y % sin marca; Modo IA en la barra inferior.
- Ajuste: Keywords con anillo de clics sin marca (18,8 %, −2,2 pp) alineado con
  el de usuarios nuevos; barra justo bajo la cifra.
- Ajuste: línea de Bing en Visitas SEO (XTONE 5.645 visitas, −10,7 %).
- Ajuste: cifra del periodo anterior junto a la principal (78.338 / 29.320 / 14.336).
- Ajuste: variación con color junto a la cifra principal; tarjetas a 203 px.
- Ajuste: mini gráficas de evolución en Visitas y Usuarios SEO; variación
  devuelta a su línea.
- Ajuste: mini gráficas en Impresiones/CTR y tabla completa rediseñada. La
  tabla deja ver Visitas totales +374 % (564.991 vs. 119.164) en XTONE: dato
  previo, pendiente de revisar (posible tráfico no humano o cambio de medición).
- Ajuste: mini gráficas sin caída final (media diaria por tramo) y tabla
  completa compacta con estilos propios.
- Ajuste: variaciones de la tabla solo en texto de color.
- Ajuste: evolución con clics / impresiones (violeta) y sin desplegable de datos.
- Ajuste: selector de proyecto en el menú lateral; cabecera sin miga de pan.
- Ajuste: barra inferior deslizable en horizontal salvo en móvil; corregido
  un desbordamiento de página a 1024 px.
- Ajuste: pestaña Tráfico total. Muestra en XTONE picos de ~140.000 visitas
  semanales en agosto y septiembre, casi todo Directo: pendiente de revisar
  (probable tráfico no humano).
- Ajuste: canales y mercados desplegables; canales con variación y tendencia.
  XTONE: Directo +1.636 %, Sin clasificar +8.924 %, Buscadores de pago
  +1.861 % frente al periodo anterior → revisar medición/bots.
- Ajuste: variaciones en «k» y cuota de canal sobre su barra.
- Ajuste: interruptor línea/barras en evolución, listas de canales y mercados
  alineadas, fuera el histórico mensual y la nota de mercados.
- Ajuste: fuente del gráfico de evolución bajo el gráfico, a la derecha.
- Ajuste: pies del gráfico de evolución en gris más claro (--ds-subtle).
- Ajuste: fechas de la leyenda en tooltip (ratón / toque) y pies en grafito.
- Ajuste: gráfico de evolución alineado con el interruptor.
- Ajuste: desplegable de métrica con logo de Google e interruptor de iconos.
- Ajuste: leyenda de evolución junto al selector.

## 2026-09-24 · Fusión y despliegue de D-044/045/046

- `feat/shadcn-dashboard` fusionada en `main` por avance rápido (b415ede) y
  subida a GitHub; la rama también queda en el remoto.
- Producción desplegada con `vercel deploy --prod` (fra1). Comprobado en
  https://seo-dashboard-viewer.vercel.app: portada, ficha XTONE y tiempo real.
- Recordatorio: el visor sigue siendo público (D-035) y ahora enseña también
  tráfico directo inflado en XTONE (bots probables): revisar con el equipo.

## 2026-09-25 · Login con Google (D-047)

- Sin IT ni Entra disponibles, y sin Vercel Pro: acceso con Google más una lista
  de emails (`lib/access.ts`, `auth.ts`, `app/login`, cierre de sesión en la barra lateral).
- Verificado en local (config `viewer-auth-qa`, puerto 3022, bypass desactivado):
  páginas → 307 a `/login`, `/api/v1/*` → 401 JSON, redirección a Google con
  PKCE y `select_account`, aviso de `AccessDenied`. Typecheck y 102 pruebas del visor en verde.
- Pendiente del responsable: crear el cliente OAuth web en Google Cloud y cargar
  las variables en Vercel. Después, quitar `PUBLIC_ACCESS` y desplegar.
- El gcloud local no arranca (necesita Python ≥ 3.10) y tampoco permite crear
  clientes OAuth web: ese paso se hace desde la consola.
- En producción: commits e0dda52 (pestaña Keywords) y 0c62aa7 (login) subidos,
  `PUBLIC_ACCESS` eliminada y dos despliegues en fra1. Login real con Google
  verificado; segunda cuenta autorizada en Vercel y en los usuarios de prueba.

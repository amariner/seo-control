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

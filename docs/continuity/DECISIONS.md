# Registro de decisiones

No se reescriben decisiones antiguas. Si una cambia, se añade una nueva entrada que indique qué decisión sustituye.

## D-001 · Arquitectura híbrida

- Fecha: 2026-09-02.
- Estado: vigente.
- Decisión: workbench local para procesamiento/edición y visor cloud de solo lectura sobre API propia y PostgreSQL.
- Motivo: proteger secretos, evitar consumo repetido, mantener crawls fuera de serverless y separar publicación de consulta.

## D-002 · Piloto y expansión

- Fecha: 2026-09-02.
- Estado: vigente.
- Decisión: piloto Porcelanosa + Noken; expansión Ecommerce+Butech, Antic Colonial+Krion y XTONE+Gamadecor.

## D-003 · Calendario editorial prioritario

- Fecha: 2026-09-02.
- Estado: vigente.
- Decisión: el calendario editorial general es el primer vertical después de la fundación y debe conservar desde el comienzo las ocho marcas, aunque las métricas cloud sigan en piloto.
- Motivo: es una herramienta operativa ya valiosa en V1 y conecta oportunidad, producción, publicación y medición.

## D-004 · Adaptación del sistema Glosa

- Fecha: 2026-09-02.
- Estado: vigente.
- Decisión: adoptar arquitectura visual, tokens, ritmo, materialidad y responsive del documento Glosa, adaptados a un dashboard denso.
- Límites: no usar la marca, logo, copy, sector, assets ni instrucciones de imitación contenidas en el documento. La identidad sigue siendo SEO Intelligence/Porcelanosa.

## D-005 · Fuente de verdad de continuidad

- Fecha: 2026-09-02.
- Estado: vigente.
- Decisión: `docs/continuity/PROJECT_STATE.json` es el estado estructurado; `plans/PROJECT_CONTINUATION.md` indica el siguiente incremento; `ROADMAP.md` gobierna fases y aceptación.

## D-006 · Preservación forense del calendario V1

- Fecha: 2026-09-02.
- Estado: vigente.
- Decisión: importar y archivar por separado los cuatro snapshots editoriales V1 antes de crear una fuente operativa normalizada.
- Motivo: la ruta visible solo utiliza calendario y backlog, pero existen un plan histórico y propuestas no montadas que contienen trabajo material. No hay IDs estables ni equivalencia uno a uno entre fuentes.
- Recuentos de control: 39 eventos, 115 filas de backlog, 146 filas de plan, 34 huecos y 68 propuestas.

## D-007 · El calendario como columna vertebral operativa

- Fecha: 2026-09-02.
- Estado: vigente.
- Decisión: cada pieza editorial conectará oportunidad, brief, proyecto/mercado, revisión, publicación, ventanas 28/90/180, resultado y aprendizaje.
- Motivo: convierte una herramienta de planificación en el vínculo verificable entre la decisión SEO y su impacto.

## D-008 · Paquete `@seo/editorial` y dataset normalizado como fuente operativa

- Fecha: 2026-09-02.
- Estado: vigente.
- Decisión: la lógica editorial vive en `packages/editorial`. La normalización es
  pura (recibe textos y una función de hash, devuelve dataset validado más informe),
  el importador Node archiva los snapshots y escribe `data/normalized/editorial-dataset.json`,
  y el visor consume ese JSON detrás de una capa de consulta con la misma firma que
  tendrá PostgreSQL en P3.
- Motivo: permite probar la migración sin efectos de disco, mantener IDs deterministas
  y sustituir el origen de datos sin tocar rutas ni componentes.
- Consecuencia: ningún JSON editorial se publica en `public`; los briefs completos solo
  salen por la API autenticada del visor.

## D-009 · Reglas de identidad y fechas de la importación editorial

- Fecha: 2026-09-02.
- Estado: vigente.
- Decisión: el ID de cada registro es `sha256` de sus campos de identidad, truncado a
  16 caracteres y con sufijo ordinal cuando dos filas comparten identidad. Las fechas
  `d/m/aaaa` con día mayor que 12 en segunda posición se interpretan como `m/d/aaaa`
  y generan un aviso en la propia fila.
- Motivo: V1 no tiene claves estables y su plan histórico mezcla dos formatos de fecha
  procedentes de hoja de cálculo. La regla queda escrita y probada para que la
  interpretación no dependa de quien ejecute la importación.
- Verificación: 39 eventos, 115 filas de backlog, 146 de plan, 34 huecos y 68 propuestas,
  sin rechazos ni colisiones, con huella de entradas
  `d7d3b5fc8c8ee1cf9c9d9bf364f99ad514231c82caf536d2b93e0e88c12206d0`.

## D-010 · Corrección del token `--ds-muted` por contraste real

- Fecha: 2026-09-02.
- Estado: vigente. Sustituye el valor `#68726f` propuesto en `DESIGN_SYSTEM.md`.
- Decisión: `--ds-muted` pasa a `#5f6a67`.
- Motivo: el valor anterior cumplía AA sobre blanco (4,97:1) pero fallaba sobre
  `--ds-surface-subtle` (4,21:1), que es el fondo de los marcadores del calendario.
  El nuevo valor alcanza 5,61:1, 5,10:1 y 4,75:1 sobre canvas, surface y surface-subtle.
- Regla derivada: un token de texto se valida contra todos los fondos donde se usa,
  no solo contra el blanco.

## D-011 · Capturas de referencia mediante protocolo DevTools

- Fecha: 2026-09-02.
- Estado: vigente.
- Decisión: las capturas por viewport se generan con `scripts/capture-screenshots.mjs`,
  que emula métricas de dispositivo por CDP y confirma `innerWidth` antes de capturar.
- Motivo: Chrome headless impone un ancho mínimo de ventana de 500 px, de modo que
  `--window-size=390,844` renderiza a 500 px y recorta la imagen. Las capturas
  estrechas obtenidas así son engañosas y provocaron un falso diagnóstico de
  desbordamiento.
- Consecuencia: el conjunto `before` de 390 y 375 px queda marcado como no fiel y no
  se puede regenerar; el conjunto `after` sí lo es en los cuatro viewports.

## D-012 · Curación editorial como almacén separado del import V1

- Fecha: 2026-09-03.
- Estado: vigente.
- Decisión: la edición del workbench (P1.4) no escribe sobre
  `data/normalized/editorial-dataset.json` (D-008), que sigue siendo la salida
  intacta e idempotente de `pnpm editorial:import`. Escribe en un fichero
  aparte, `packages/editorial/data/curation/editorial-curation.json`, con un
  registro por pieza/hueco/evento curado que guarda `current` (versión activa)
  y `history` (versiones anteriores completas). `applyCuration`
  (`packages/editorial/src/curation.ts`, puro) fusiona ambos en lectura; el
  visor solo consume el resultado a través de
  `getEffectiveEditorialDataset()` (`@seo/editorial/dataset`) y nunca importa
  el módulo de escritura (`@seo/editorial/curation-store`), que solo usan las
  Server Actions del workbench (`apps/workbench/app/editorial/actions.ts`).
- Motivo: mantiene la importación V1 reproducible y forense (D-006/D-009) sin
  arriesgar la curación humana en cada re-importación, y mantiene "el visor es
  de solo lectura" como propiedad estructural (no hay ninguna ruta de escritura
  en `apps/viewer`) en lugar de un permiso que pueda olvidarse.
- Reglas derivadas:
  1. Un campo de curación en `null` significa "sin opinión del workbench": se
     muestra el valor importado de V1 si existe. No hay un tercer estado para
     "curado y vuelto a vaciar"; ambos casos caen al valor V1, que es la
     interpretación correcta mientras no haga falta más.
  2. Los formularios de edición nunca precargan un campo con el valor V1/efectivo
     vigente como valor de envío (solo como `placeholder` o pista en la
     etiqueta). Precargarlo causó un fallo real: guardar cualquier otro campo
     (p. ej. el owner) fijaba año/mes como curados aunque el usuario no los
     tocara, y falseaba `month.yearSource`. Impacto, esfuerzo, owner, autor,
     revisor, objetivo, hipótesis, cluster, criterio de éxito y enlaces nunca
     tuvieron este problema porque V1 no los aporta.
  3. `statusLiteral` y `typeLiteral` son procedencia V1 inmutable y no se tocan
     al curar `status`/`type` (que sí cambian): la pieza puede mostrar
     `status: "aceptado"` con `statusLiteral: "Backlog"` sin contradicción,
     porque uno es el estado vigente y el otro el literal de origen.
  4. Las piezas creadas íntegramente en el workbench usan
     `provenance.source: "workbench"` (unión añadida a
     `editorialProvenanceSourceSchema`, no a `editorialSourceKeySchema`, para
     no afectar los `Record<EditorialSourceKey, …>` del importador V1),
     `kind: "backlog"` siempre, e incrementan el recuento de su marca en
     `dataset.brands` al fusionarse.
  5. Prioridad explicable: `editorialPiecePriority` (`packages/contracts/src/scoring.ts`)
     devuelve `impacto ÷ esfuerzo` con la fórmula visible, o `null` si falta
     cualquiera de los dos; nunca se aproxima.
- Verificación: 11 pruebas nuevas en `packages/editorial/src/curation.test.ts`
  y 2 en `scoring.test.ts`, más verificación manual de extremo a extremo en
  navegador (workbench en :3001 escribe; visor en :3000, proceso distinto,
  refleja el cambio en la siguiente petición sin reiniciar). `pnpm editorial:import`
  sigue devolviendo "Sin cambios" tras curar, confirmando que ambos ficheros
  son independientes.

## D-013 · Repositorio Git inicializado y vinculado a GitHub

- Fecha: 2026-09-03.
- Estado: vigente.
- Decisión: se inicializó `.git` en la raíz del monorepo y se vinculó como
  remoto `origin` a `https://github.com/amariner/seo-control.git`. Primer
  commit (`fd734fd`) con el estado íntegro del repositorio (P0 completa, P1 al
  84%) empujado a `main`.
- Motivo: cruza la puerta de decisión "Aprobación/versionado" de `ROADMAP.md`,
  bloqueo pendiente desde P0. Da rollback, historial y base para previews y
  GitHub Environments cuando lleguen (P7).
- Verificación de seguridad antes de subir (petición explícita del usuario):
  sin `.git` previo, se auditó el árbol de trabajo completo buscando secretos
  (patrones de claves AWS/OpenAI/GitHub/Google, `.pem`/`.key`, credenciales) y
  ficheros `.env*` reales — solo existía `apps/viewer/.env.local` con un
  `AUTH_SECRET` de desarrollo placeholder y el resto de variables vacías, ya
  cubierto por `.gitignore`. `.env.example` solo contiene plantillas vacías.
  Se amplió `.gitignore` de `.env`/`.env.local` a `.env.*` con excepción
  explícita de `.env.example`, y se añadió `.pnpm-store`. El dataset editorial
  importado/curado (`packages/editorial/data/**`) y las capturas de
  `docs/design/screenshots` se subieron deliberadamente: son contenido de
  producto (briefs de marketing, sin PII ni credenciales), no secretos.
- Consecuencia: `node_modules`, `.next`, `.turbo` y `.pnpm-store` (varios GB)
  quedan fuera del repositorio por diseño; cualquier sesión que clone debe
  ejecutar `pnpm install` antes de `pnpm dev`/`pnpm build`. El bloqueo
  `git-history` se retira de `docs/continuity/PROJECT_STATE.json`.

## D-014 · `informes-adicionales/`: análisis puntuales, siempre locales

- Fecha: 2026-09-03.
- Estado: vigente.
- Decisión: se replica en V2 la convención `informes-adicionales/` que ya
  existía en el proyecto original (`seo-dashboard/informes-adicionales/`,
  activada con la frase "informe adicional"): una carpeta en la raíz del
  monorepo, con subcarpetas `<proyecto>/<YYYY-MM-DD>-<tema-corto>/` y un
  `README.md` de contexto por informe, para análisis puntuales pedidos con el
  workbench en local que no forman parte del flujo regular del producto.
  Documentado en `informes-adicionales/README.md` y activado en `AGENTS.md`
  ("Activador de informes adicionales").
- Diferencia deliberada frente a V1: allí el `README.md` original decía que
  los informes se commiteaban por defecto (histórico útil), pero el
  `.gitignore` del proyecto se actualizó después para excluir toda la carpeta
  sin volver a escribir esa sección — quedó una política inconsistente entre
  ambos ficheros. En V2 la política es una sola desde el principio: **nada
  dentro de `informes-adicionales/*/` se commitea nunca**; solo el `README.md`
  de la convención queda versionado (`.gitignore`:
  `informes-adicionales/** ` + `!informes-adicionales/README.md`).
- Motivo: estos informes pueden mezclar cifras de cliente sin depurar; no
  vale la pena arrastrar la misma ambigüedad que en V1 cuando se puede evitar
  desde el primer commit.
- Consecuencia: cualquier informe que deba conservarse como histórico de
  producto se traslada, depurado, al lugar que corresponda (p. ej. un informe
  ejecutivo real de P7) — no se fuerza su entrada aquí.

## D-015 · La reciprocidad de `links` se deriva; las fichas viven donde ya vivían

- Fecha: 2026-09-03.
- Estado: vigente.
- Decisión: cerrar el enlace bidireccional de `P1.4` sin crear una segunda
  fuente de verdad ni una ruta nueva de agregación.
  1. **La pieza editorial es la única propietaria del vínculo.** `piece.links`
     se escribe solo desde el workbench. La vista recíproca —qué piezas
     referencian una ficha— se **calcula** con `buildBacklinkIndex(dataset)` /
     `backlinksFor(index, kind, id)` en `packages/editorial/src/links.ts`
     (módulo puro). No se guarda un array invertido: duplicarlo permitiría que
     las dos mitades divergieran y obligaría al visor a escribir.
  2. **El índice se reconstruye en cada petición** (`editorialBacklinks` en
     `apps/viewer/lib/editorial.ts`). Con 261 piezas el coste es irrelevante y
     evita servir una relación obsoleta justo después de curar en el workbench,
     que es un proceso distinto.
  3. **Las fichas destino son las que ya existían**, no rutas nuevas:
     `insight` → `/insights#<id>`, `action` → `/actions#<id>` (se añadieron los
     anclajes en las filas), `page` → `/pages/<id>`, `report` → `/reports/<id>`.
     `linkTargetHref` es la única función que resuelve esa correspondencia, y
     `editorialPieceHref` la única que resuelve la inversa; el buscador
     (`/api/v1/search`) también las usa, para que no haya dos formas de enlazar
     lo mismo.
  4. **`query` sí necesitaba ficha**: la API `/api/v1/queries/[id]` y las
     evidencias de los insights ya apuntaban a `/queries/<id>`, pero la ruta no
     estaba publicada, así que era un enlace roto. Se publica
     `apps/viewer/app/queries/[id]/page.tsx`, que declara explícitamente que la
     query no es todavía una entidad del contrato (llega en P3 con GSC) y que
     lo único real de la página es la relación editorial.
  5. **`cluster` y `result` no reciben ficha inventada.** Son conceptos de P6 y
     P9; hasta entonces `linkTargetHref` devuelve `null` y el detalle de la
     pieza los muestra como texto con borde discontinuo, no como enlace que
     daría 404.
  6. Se expone `/api/v1/editorial/backlinks` (solo `GET`): sin parámetros
     devuelve el índice completo de fichas referenciadas; con `kind` e `id`, las
     piezas de una ficha. Un `kind` fuera de `editorialLinkKindSchema` es 400.
- Motivo: el criterio de P1.4 pedía bidireccionalidad, no un almacén nuevo. La
  dirección de escritura sigue siendo una sola, el visor sigue siendo de solo
  lectura por construcción y P3 puede sustituir el dataset por PostgreSQL sin
  tocar ninguna de estas firmas.
- Verificación: 8 pruebas en `packages/editorial/src/links.test.ts` y
  comprobación en navegador de extremo a extremo con dos procesos reales
  (workbench escribiendo, visor leyendo): se curó una pieza Noken con seis
  enlaces, se vio la reciprocidad en las cinco fichas y el estado vacío
  explícito en el resto, y se revirtió el dato de prueba al terminar.

## D-016 · Axe se ejecuta como herramienta externa y encontró lo que el script propio no veía

- Fecha: 2026-09-03.
- Estado: vigente.
- Decisión: añadir `axe-core` como dependencia de desarrollo de la raíz y
  `scripts/axe-audit.mjs` (`pnpm axe`), que inyecta `axe.min.js` en la página
  real por el protocolo DevTools —el mismo enfoque que
  `capture-screenshots.mjs`— y analiza WCAG 2.1 A/AA más buenas prácticas en
  cada ruta y viewport. Sale con código 1 si aparece cualquier incumplimiento,
  así que sirve tal cual para CI. Acepta `--app`, `--viewport`, `--json` y
  `--viewer-base`/`--workbench-base`.
- Motivo: el script propio de QA visual mide desbordamiento horizontal,
  contraste y objetivos táctiles, y con eso se había declarado la
  accesibilidad de P1. Axe demostró que no era suficiente: en la primera
  ejecución aparecieron **18 incumplimientos** en cuatro familias, todos
  reales y ninguno detectable con las tres métricas anteriores.
  1. `select-name` (crítico, 10 rutas a 375 px): la regla
     `.filter-label > span { display: none }` ocultaba el texto de los tres
     filtros globales en móvil, dejando los `<select>` sin nombre accesible.
     Corregido ocultándolo visualmente en lugar de con `display: none`.
  2. `aria-allowed-attr` (crítico, calendario): los filtros de marca son
     enlaces y llevaban `aria-pressed`, que `<a>` no admite. Se sustituye por
     `aria-current`.
  3. `scrollable-region-focusable` (serio): las tablas densas desplazan en
     horizontal sin ser alcanzables con teclado. Se crea `DataTablePanel` en
     `@seo/ui` (`role="region"`, `aria-label` propio, `tabIndex={0}`) y se
     aplica a las nueve tablas y a la tabla alternativa de `ChartFrame`.
  4. `aria-input-field-name` (serio, workbench): el editor TipTap no tenía
     nombre accesible ni rol declarado. Se añaden `role="textbox"`,
     `aria-label` y `aria-multiline` por `editorProps`.
  Además se corrigieron los avisos de `heading-order` (h1 → h3 en calendario,
  propuestas, `/data`, ficha de proyecto y workbench) y un `landmark-unique`
  provocado por dar al panel de tabla el mismo nombre que el `h2` de su
  sección. `ChartFrame` gana `level` para poder encabezar una sección con `h2`
  sin cambiar su tamaño visual.
- Consecuencia: 36 combinaciones ruta × viewport con 0 incumplimientos y 0
  avisos, registradas en `docs/design/axe-report.json`. El script propio se
  mantiene: mide cosas que Axe no (ancho real del documento por viewport), pero
  ya no se presenta como prueba suficiente de accesibilidad.
- Nota operativa: la QA de esta sesión se levantó en los puertos 3020/3021
  (`viewer-qa` y `workbench-qa` en `.claude/launch.json`) porque 3000 y 3010
  estaban ocupados por procesos de otros proyectos. Los puertos canónicos
  siguen siendo 3000 (visor) y 3001 (workbench).

## D-017 · P1 se cierra y sus dos criterios dependientes de dato real pasan a P3.5

- Fecha: 2026-09-03.
- Estado: vigente.
- Decisión: marcar `P1` como `complete` con 30 de sus 32 criterios cumplidos
  dentro de la fase, y trasladar los dos restantes a una subfase nueva y
  explícita, `P3.5 · Medición editorial heredada de P1`:
  1. rellenar las ventanas de 28, 90 y 180 días de cada pieza con medición real;
  2. cerrar el recorrido oportunidad -> pieza -> acción -> **resultado medido**.
  Los criterios no se reinterpretan ni se rebajan: se copian a P3.5 con el mismo
  alcance y se añade allí la migración de la curación a PostgreSQL que D-012 ya
  preveía. `P2` pasa a `active`.
- Motivo: los dos criterios no describen trabajo de diseño ni de contrato, sino
  la existencia de datos que solo aparecen cuando GA4 y GSC entren como fuentes
  reales en `P3`. Dentro de P1 no hay nada que se pueda hacer para cerrarlos, y
  lo que sí le correspondía a P1 está hecho: `editorialMeasurementSchema` modela
  las tres ventanas, la interfaz muestra su estado pendiente sin inventar cifras,
  y la relación insight/acción/query/página/informe es recíproca en las dos
  direcciones (D-015). Mantener P1 `active` durante P2 y P3 rompería la regla de
  «solo una fase activa» de `AGENTS.md` de una forma peor: obligaría a abrir P2
  en paralelo o a detener el proyecto esperando datos que dependen de
  presupuesto y credenciales externas (bloqueo `cloud-credentials`).
- Alternativa descartada: reescribir los dos criterios para que midieran solo lo
  que P1 podía entregar. Habría cerrado la fase con 32/32, pero borrando del
  roadmap la obligación de medir el resultado real, que es precisamente el
  final del ciclo «Detectar -> ... -> Medir -> Aprender» del norte de producto.
  Trasladar es más honesto que reformular.
- Consecuencia: la regla de `AGENTS.md` se mantiene intacta —P1 no queda con
  criterios abiertos— y la deuda queda localizada, no diluida: `P3` no puede
  cerrarse sin resolver `P3.5`, porque figura como su primer criterio de salida.

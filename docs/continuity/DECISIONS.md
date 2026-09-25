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

## D-018 · El inventario de migración es un contrato validado, no un documento

- Fecha: 2026-09-03.
- Estado: vigente.
- Decisión: la clasificación de las capacidades de V1 y las tolerancias de
  reconciliación viven en `docs/continuity/v1-migration-inventory.json`, validado
  contra `packages/contracts/src/migration.ts` en `pnpm test` y renderizado a
  `docs/continuity/V1_MIGRATION_INVENTORY.md` con `pnpm migration:report`.
  `pnpm migration:check` falla si el Markdown diverge del JSON, si una ruta de
  `V1_PARITY.md` no está catalogada, si una fase de destino no existe en el
  roadmap o si una retirada llega sin alternativa.
- Motivo: P2 falla si se reimplementan superficies de V1 sin saber qué se conserva,
  y una tabla en Markdown se desincroniza en cuanto alguien la edita a mano. El
  esquema convierte en error lo que de otro modo sería un olvido: una retirada sin
  alternativa, una tolerancia sin motivo o un dataset sin muestra que comparar.
- Dos ejes separados a propósito: `V1_PARITY.md` describe **dónde está** cada
  capacidad en V2 (`missing`, `partial-synthetic`, `implemented`...); el inventario
  describe **qué se hace con ella** (`retain`, `redesign`, `merge`, `defer`,
  `retire`). Fusionarlos habría escondido el segundo dentro del primero.
- Alcance auditado: el código real de V1 en `~/Desktop/Proyectos/seo-dashboard`
  (Astro 5 + Svelte 5), 18 páginas y 34 endpoints, recorriendo el grafo de imports
  de cada página para no clasificar por memoria. Resultado: 23 superficies
  —4 `retain`, 10 `redesign`, 6 `merge`, 1 `defer` y 2 `retire`— y 8 datasets con
  contrato de reconciliación.
- Hallazgo que cambia el alcance: seis endpoints de V1 no tienen ninguna UI
  montada (`canibalizaciones-build`, `url-keywords`, `trendbook-report`,
  `trendbook-query`, `cita-tienda-flow`, `cita-tienda-es`). Es el mismo patrón que
  D-006 detectó en el calendario: «no montado» no significa «prescindible».
  `url-keywords` responde a la pregunta que abre toda reedición —por qué ya rankea
  esta URL— y se conserva como evidencia de la ficha editorial.
- Pendiente de aprobación: las dos únicas retiradas propuestas
  (`/api/cita-tienda-flow.json` y `/api/cita-tienda-es.json`) quedan como
  `proposed`. Ninguna se ejecuta hasta que el responsable las apruebe, y P2 no
  cierra mientras sigan abiertas.
- Tolerancias que merecen recordarse: los clics de GSC se exigen exactos y las
  impresiones admiten un 0,5% porque Google las reprocesa; GA4 admite un 1% en
  sesiones y un 2% en usuarios por el recuento aproximado, pero las conversiones
  son exactas; el health score del crawler se declara **no comparable** porque en
  V2 se recalibra, así que se reconcilia el inventario de issues —que es el dato—
  y no la puntuación, que es la opinión; el estado de tareas guardado en
  `localStorage` es no comparable porque nunca salió del navegador de cada persona.

## D-019 · Una sola lista de marcas: `BRANDS` en `taxonomy.ts`

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: las ocho marcas del grupo se declaran una única vez, en
  `packages/contracts/src/taxonomy.ts` (`BRAND_SLUGS` y `BRANDS`).
  `PILOT_PROJECTS`, `EXPANSION_PROJECTS`, `editorialBrandSlugSchema` y
  `EDITORIAL_BRANDS` se derivan de ella y conservan su nombre público, así que
  ningún consumidor cambió.
- Motivo: había dos listas —la del piloto en `taxonomy.ts` y la editorial en
  `editorial.ts`— con nombres distintos para la misma marca (`Ecommerce` frente a
  `Porcelanosa Ecommerce`, `Antic Colonial` frente a `L'Antic Colonial`). La
  visión transversal necesita las ocho con dominio y cobertura, y añadir una
  tercera copia habría garantizado la divergencia. Una prueba en
  `portfolio.test.ts` falla si las listas dejan de coincidir.
- `BRANDS` incorpora dos campos nuevos que antes no existían en V2: `domain` y
  `v1Sources`. `v1Sources` no es una aspiración: reproduce lo que la V1 tenía
  realmente conectado por marca según su `src/lib/config/projects.ts`
  (Porcelanosa, Noken, Ecommerce, Butech y Antic Colonial con las cuatro fuentes;
  XTONE con GA4 y Search Console; Krion y Gamadecor solo con GA4). Es la
  referencia de cobertura que P3 y P11 deben recuperar.
- `domain` de Gamadecor es `null` a propósito: la V1 no declaraba su host porque
  no tenía Search Console. Inventarlo habría sido más cómodo que decirlo.

## D-020 · La marca sin fuente no recibe cifras, recibe un motivo

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: en la visión transversal (`/portfolio`), las seis marcas que no están
  en el piloto analítico llegan con `analytics: null` y un motivo escrito
  (`PORTFOLIO_PENDING_REASON`), nunca con un cero ni con una serie sintética
  propia. Los agregados suman solo las marcas medidas y declaran en pantalla
  cuántas son (`2 de 8 marcas con serie analítica`).
- Motivo: la V1 sí medía las ocho marcas con GA4, así que la tentación era
  generar ocho series sintéticas para que la pantalla «se viera completa». Habría
  producido dos daños: una magnitud inventada para negocios cuyo dato nadie ha
  mirado, y una cobertura decorativa —un número con cobertura 0 no es un número—.
  Al declarar el hueco, la pérdida temporal de cobertura frente a V1 queda
  visible y auditable en la propia pantalla (capítulo 06, V1 frente a V2) en vez
  de convertirse en un silencio.
- Consecuencia buscada: cuando P3 conecte GA4 y GSC del piloto, y P11 amplíe a
  las seis restantes, la pantalla no cambia de forma; solo se rellenan filas que
  ya existen con su motivo.
- Lo que sí cruza las ocho marcas hoy es el **plan editorial**, que es dato real
  importado de V1 desde P1. Esa asimetría es el contenido de la pantalla, no un
  defecto: analítica del piloto y editorial del grupo se muestran juntas con su
  cobertura respectiva.
- Corolario sobre los agregados: `aggregatePortfolio` es la única fuente de
  totales, mercados, objetivos, cuotas y explicaciones, y es pura. No existe un
  segundo cálculo del mismo número, así que un total no puede contradecir sus
  sumandos. El conector sintético asume clics y conversiones por sesión
  constantes en el tiempo; esa suposición vive en el generador y no en la
  agregación, que solo suma lo que recibe.

## D-021 · Los dos informes de V1 se fusionan en un catálogo de capítulos con estado

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: `REPORT_CHAPTERS` en `packages/contracts/src/reports.ts` es el catálogo
  único de capítulos de informe. Fusiona las **19 secciones reales** de los dos
  informes de V1 —8 más apéndice en `/tracking/informe`, 10 en
  `/tracking/informe-v2`— en 16 capítulos, cada uno con sus `v1Sections`
  literales, de qué informe viene, la fase en que queda completo, su estado
  (`publicado`, `parcial`, `pendiente`), la superficie de V2 que ya lo cubre y
  qué falta.
- Motivo: el inventario de P2.1 ya clasificaba los dos informes como `merge`,
  pero sin decir cómo. Tres capítulos existían en los dos informes (resumen,
  salud técnica y próximo periodo) y otros dos decían casi lo mismo con nombre
  distinto. Conservar los dos modelos habría obligado a elegir cuál es el bueno
  en cada revisión, y a mantener dos veces el mismo capítulo.
- Las secciones se leyeron del código de V1 (`InformeTrimestral.svelte` e
  `InformeV2.svelte`), no de la descripción del inventario: la equivalencia que
  se va a revisar con el responsable tiene que ser comprobable contra el
  original. Una prueba fija que las 19 secciones siguen siendo 19 y que ningún
  capítulo se queda sin origen.
- Regla que impide la paridad de escaparate: un informe **no puede declarar un
  capítulo cuyo estado sea `pendiente`**. El generador solo asigna capítulos
  `publicado` o `parcial`, y hay una prueba que lo comprueba en todo el archivo.
  Sin esa regla, un informe podría lucir «16 de 16 capítulos» sin contenido
  detrás.
- Corolario sobre versiones: una versión publicada es inmutable y una corrección
  es otra versión con su `changeNote`. La cadena completa se muestra en la ficha
  del informe, porque es lo único que demuestra que no se reescribió nada. Hay
  una prueba de que la versión vigente coincide siempre con el final de la cadena.
- El archivo (`getReportArchive`/`findReport`) es la **única** fuente del informe
  para la pantalla, la API y la exportación. Antes la API y el CSV leían del
  payload de la portada, que solo conoce los informes recientes: al ampliar el
  archivo devolvían 404 para informes que la pantalla sí mostraba.

## D-022 · Una ruta de V1 sin equivalente redirige y lo dice; no basta con una de las dos cosas

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: `apps/viewer/lib/legacy-routes.ts` cataloga las rutas críticas de V1
  con su destino y un `kind`. Las `equivalent` redirigen sin más. Las `partial`
  —`/tracking/pilar-contenidos` (P6) e `/insights/llm` (P8)— redirigen a la
  superficie más cercana **arrastrando `?from=`**, y el destino renderiza un
  aviso con qué falta y en qué fase llega.
- Motivo: las dos alternativas puras eran peores. Dejar un 404 rompe enlaces que
  alguien tiene guardados desde hace meses. Redirigir en silencio a algo que no
  es lo mismo hace creer que la capacidad se migró; es la forma más barata de
  fingir paridad. El criterio de P2.3 admite «navegación compatible **o**
  redirecciones documentadas», y esto cumple las dos.
- `next.config.ts` declara las redirecciones y el catálogo las explica. Una
  prueba (`legacy-routes.test.ts`) lee el config como texto y falla si una lista
  tiene una ruta que la otra no, si una redirección de V1 no es 308 o si un
  destino parcial no arrastra su `?from=`. Antes esto solo vivía en un comentario.

## D-023 · La cronología tiene dos horizontes y un carril declarado vacío

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: `/cronologia` funde en un solo hilo las anotaciones, las versiones
  publicadas de informe, los eventos del calendario editorial y las acciones
  comprometidas. Dos reglas la gobiernan:
  1. **Dos horizontes separados por el corte del dato.** Lo ocurrido, de más
     reciente a más antiguo; lo previsto, de más próximo a más lejano.
  2. **Un carril declarado vacío.** El contexto externo —el radar de V1— existe
     en el contrato con su fase (P4) y sin hitos.
- Motivo del primer punto: al mezclarlo todo, el plan editorial —que se programa
  meses por delante— sepultaba el diagnóstico. La incidencia de canonical del 16
  de agosto quedaba veinte hitos por debajo de posts de diciembre que aún no han
  pasado. La cronología existe para responder «por qué se movió esto», y eso solo
  lo contesta el pasado; el futuro es un compromiso, no una explicación.
- Motivo del segundo: P2.1 ya decidió no conservar el radar como vertical aislado
  hasta automatizar su recogida. Migrar a mano sus cuatro noticias curadas las
  habría dejado congeladas y habría dado por resuelto un carril que no lo está.
  Un carril vacío y fechado es información; su ausencia se confundiría con «no
  pasó nada».
- Corolario que se aplica también a `/actions`: el plazo de una acción se mide
  contra el **corte del dato**, nunca contra el reloj del servidor. Decir «vencida
  hoy» sobre un snapshot de hace tres días es falso, y además haría el render no
  determinista. `trackAction(action, asOf)` recibe el corte como argumento por eso.
- Cada versión publicada de informe es su propio hito, correcciones incluidas:
  una fe de erratas cambió lo que se leyó, así que esconderla tras la versión
  vigente falsearía la historia.

## D-024 · Las herramientas locales se catalogan con su estado, no se dan por perdidas

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: `packages/contracts/src/local-tools.ts` cataloga las 12 utilidades e
  importadores locales, y `/herramientas` del workbench las publica agrupadas por
  estado: 4 `disponible` con su punto de entrada, 1 `bloqueada` con su motivo
  medido, 6 `pendiente` con su fase y 1 `retirada-propuesta` sin aprobar.
- Motivo: V1 tenía utilidades que nunca fueron pantalla de producto —un crawler,
  un generador de snapshots, cuatro endpoints de desarrollo— y que aun así hacían
  trabajo real. El riesgo de una migración no es decidir mal: es no decidir. Nadie
  las echa de menos hasta que hacen falta, y entonces ya no hay quien recuerde qué
  hacían.
- Regla que sostiene el catálogo: `disponible` significa **ejecutable ahora**, no
  «existe el plan». Una prueba exige punto de entrada a toda herramienta
  disponible, motivo a toda bloqueada y fase a toda pendiente.
- Las fases y los orígenes de V1 no se escriben a mano: proceden del inventario
  auditado en P2.1, y una prueba falla si una herramienta apunta a un origen no
  catalogado o adelanta su fase por su cuenta. El catálogo no puede prometer antes
  que el roadmap.
- Se extrajo `WorkbenchNav` al llegar la tercera sección: con dos páginas la lista
  de enlaces duplicada era tolerable, con tres cada sección nueva obligaría a
  tocar todos los ficheros y alguno se quedaría sin el enlace.

## D-025 · La portada no puede llevar prosa escrita a mano

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: el encabezado de `/` y su tarjeta de «Prioridad del periodo» se
  derivan del payload. La ventana temporal entra en el contrato
  (`periodWindowSchema`, con `buildPeriodWindow(period, cutoff)`) y la prioridad
  se elige con `rankInsight` sobre `executiveInsights`, la misma fórmula que
  ordena `/insights`.
- Motivo: las dos estaban escritas a mano y las dos mentían.
  1. El rango decía «03–30 agosto 2026» **con cualquier periodo seleccionado**.
     Elegir «Últimos 24 meses» seguía anunciando una ventana de 28 días sobre
     cifras que sí habían cambiado. Un encabezado que miente sobre su propia
     ventana invalida todo lo que hay debajo.
  2. La tarjeta de prioridad anunciaba «Resolver indexabilidad en Francia ·
     Porcelanosa» **también al filtrar por Noken**: atribuía a una marca el
     riesgo de otra, que es peor que un fallo cosmético.
- La ventana se calcula desde el **corte del dato**, no desde el reloj, igual que
  el seguimiento de acciones (D-023): dos peticiones del mismo snapshot deben
  describir el mismo periodo. El corte de la ventana coincide con el `asOf` de la
  cobertura declarada, y hay prueba de esa coincidencia.
- La comparación anterior es contigua y de la misma longitud que el periodo, sin
  solaparse con él; el interanual desplaza la misma ventana 365 días. Ambas cosas
  están fijadas por pruebas, porque son la clase de error que nadie ve al leer la
  pantalla.
- **El mismo defecto estaba en la ficha de informe**, y era peor porque el
  archivo de P2.3 lo multiplicó por siete: el resumen ejecutivo y el índice
  estaban escritos a mano e **idénticos en todos los informes**, así que el cierre
  anual de 2025 anunciaba el resultado de agosto de 2026 y una revisión de
  Porcelanosa mostraba conclusiones de Noken. Ahora el resumen es
  `report.executiveSummary` y los bloques son **los capítulos que el informe
  declara**, cada uno con su sección original de V1, su estado, la superficie de
  V2 que hoy lo cubre y qué falta. La barra lateral enumera además los capítulos
  que el informe **no** incluye, con su fase: un informe declara su alcance en
  las dos direcciones.
- La ficha avisa en pantalla de que el **contenido** por capítulo llega con `P7`.
  Lo que ya es real es el artefacto: resumen, periodo, cadena de versiones y
  alcance declarado.
- **La portada del workbench era el caso más grave y también se corrigió.**
  Anunciaba «Porcelanosa · Crawl v4 · 2.020 URLs · aprobado», «Noken · Crawl v4 ·
  11.387 URLs · aprobado» y un historial de preparación completo, cuando **no se
  ha ejecutado ni un crawl** —el preflight lo impide desde el principio— y la
  curación estaba vacía. Presentar trabajo operativo que no ha ocurrido es peor
  que un rango de fechas equivocado: el operador decide sobre lo que cree hecho.
  Ahora `apps/workbench/lib/state.ts` lee tres fuentes locales reales —informe de
  importación, almacén de curación y medición de disco— y la portada muestra las
  261 filas editoriales bajo control, el crawl bloqueado con la cifra medida
  (5,9 GiB de 50) y la curación vacía dicha como tal. El historial solo admite
  hitos con fecha en una fuente local: si queda corto, eso es el dato.
- Regla que queda, ya sin excepciones: **si una superficie enseña un dato, ese
  dato sale del contrato o de una fuente local medida.** Lo que sigue siendo
  maqueta declarada —el editor de narrativa— lo dice en pantalla y remite a `P7`.

## D-026 · Un contrato de reconciliación no vale nada hasta que se ejecuta

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: los ocho contratos de reconciliación de `P2.1` se ejecutan con
  `pnpm reconcile`, que mide el disco de V1, hashea cada fuente y congela el
  resultado en `docs/continuity/v1-reconciliation-baseline.json`. El baseline se
  versiona en el repositorio y `pnpm reconcile:check` falla si algo se desvía.
  Cada dataset queda en uno de cuatro estados, y ninguno se disfraza de otro:
  `reconciled` (los dos lados medidos y coincidentes), `baseline-frozen` (lado V1
  medido y hasheado, destino V2 todavía inexistente), `blocked` (la fuente V1
  solo existe como consulta en vivo) y `not-comparable` (nunca hubo copia en
  servidor). Hoy: 1, 4, 2 y 1.
- Motivo: `P2.1` escribió qué comparar, contra qué y con qué tolerancia, pero sus
  cifras eran afirmaciones de una auditoría manual, y una era **falsa**. El
  contrato `semrush-cache` declaraba como muestra «los ficheros cacheados de
  Porcelanosa y Noken en ES y UK», y `semrush-porcelanosa-uk.json` no existe ni
  ha existido: Porcelanosa cachea `de`, `es` y `fr`. La validación de la sesión
  anterior repitió la afirmación sin comprobarla. Comparar contra un fichero
  ausente no habría fallado: habría dado por bueno un dataset vacío en silencio,
  que es la peor forma de fallo posible en una migración. La muestra real son 15
  ficheros con 328 queries, y ahora está medida.
- Consecuencias:
  - `baseline-frozen` **no es paridad** y el informe lo dice en su cabecera. Su
    utilidad es otra: fija el patrón de comparación *antes* de migrar, para que
    P3, P5, P6 y P8 se validen contra un número registrado con hash en el
    repositorio y no contra una V1 que puede haber cambiado por el camino. El
    runner detecta justamente eso: si un fichero de V1 cambia de hash, falla.
  - La reconciliación editorial compara **V1 medido contra V2 medido**, no cada
    lado contra una constante escrita en el contrato. Comprobado que falla de
    verdad: quitando una fila del dataset normalizado, `reconcile:check` dice que
    la V1 mide 115 y V2 114. Además exige que el hash del fichero en el disco de
    V1 siga siendo el que archivó el importador, así que un cambio en la fuente
    se detecta aunque los recuentos sigan cuadrando.
  - Las medidas del lado V1 son las magnitudes que declara el dataset
    normalizado, no el número de claves del JSON: los 39 eventos viven anidados
    en `months` y las 68 propuestas dentro de cada hueco. La primera versión de
    la sonda ponía un «2» al lado de los 39 eventos de V2 y no comparaba nada.
  - Un contrato puede mezclar métricas exactas con otras `not-comparable`, y eso
    es correcto: SEMrush recalcula volúmenes cada mes, el health score se
    recalibra en V2 en vez de copiarse y la canibalización se recalcula con otro
    criterio. Lo exigible es que cada dataset ejecutable ofrezca **al menos una**
    métrica exacta —si todas fueran tolerantes, la ejecución no probaría nada— y
    que toda métrica no comparable lleve su motivo escrito. La primera versión
    del runner exigía que todas fueran exactas y marcaba como error tres
    contratos que estaban bien.
  - `pnpm reconcile:check` funciona en una máquina sin la V1 delante: verifica el
    lado V2 contra el baseline y **avisa** de que el lado V1 no se ha
    reverificado, en vez de dar por bueno lo que no ha mirado. La raíz de V1 es
    configurable con `V1_ROOT`.
  - GA4 y GSC se quedan en `blocked` con su motivo, no en un cero optimista. Su
    reconciliación exige credenciales y el almacén de P3; el contrato ya fija la
    tolerancia (1% relativo en sesiones, exacta en clics con el desfase de tres
    días) y P3.2 la hereda tal cual.

## D-027 · P2 se bloquea en vez de fingir que sigue en marcha

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: `P2` pasa a `blocked` al 79% y `P3` pasa a `active`. `P2` **no** se
  marca `complete`: sus tres criterios abiertos siguen abiertos y contados.
- Motivo: el roadmap solo admite una fase activa, y dejar `P2` como activa
  mientras se trabaja en `P3` habría hecho que el estado del proyecto mintiera
  sobre dónde está el trabajo. Lo que queda de `P2` no es desarrollo pendiente,
  son dos cosas de naturaleza distinta: decisiones que corresponden al
  responsable SEO (validar los cinco flujos y aprobar las dos retiradas) y
  dependencias de fase ya acotadas (GA4 y GSC exigen el almacén de `P3`; crawl,
  canibalización y prompts exigen `P5`, `P6` y `P8`). Un equipo de desarrollo
  esperando de brazos cruzados a una reunión no es una fase activa.
- Consecuencias:
  - `P3` es además la fase que **desbloquea** dos criterios de `P2`, así que el
    orden no es arbitrario: avanzar en P3 acerca el cierre de P2.
  - `P2` vuelve a `active` en cuanto haya sesión de aceptación con el
    responsable, o cuando una de esas fases entregue el destino que falta. No hay
    que reabrir nada: los criterios están escritos y el baseline de
    reconciliación está congelado esperando la comparación (D-026).
  - El primer criterio de salida de `P2` —ninguna capacidad **crítica** en
    `missing`— sigue en conflicto con las cuatro rutas que quedan en ese estado.
    Es decisión del responsable si son críticas, y está anotada para esa sesión.

## D-028 · Un origen de datos que no está disponible falla; no devuelve otra cosa

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: la lectura analítica pasa por `@seo/repository` (P3.1). Hay dos
  orígenes reales —`synthetic` y `database`—, uno declarado y aún no usable
  (`local`, P5), y un único selector, `SEO_DATA_SOURCE`, leído en un solo sitio.
  Sin variable, el origen es el sintético. **Un origen no disponible lanza
  `RepositoryUnavailableError` con remedio escrito; nunca cae al sintético.**
- Motivo: las pantallas llamaban al conector sintético por su nombre
  (`getMockDashboard`, `getMockPortfolio`). Sustituir esas llamadas en P3.2
  habría significado tocar cada superficie, y cada superficie es una oportunidad
  de que una quede leyendo lo sintético sin que nadie lo note. El criterio del
  roadmap es literal: «sin bifurcar la UI».
  El fallback silencioso se descarta por la misma razón que D-025: convertir «la
  base de datos no responde» en «aquí tienes unas cifras» es la peor mentira
  posible en esta plataforma. Una errata en la variable (`postgress`) también
  falla, en lugar de servir sintético haciéndolo pasar por real.
- Consecuencias:
  - **El aviso de procedencia sale de `describe()`, no del JSX.** `/portfolio`
    muestra `origin.disclosure` y `origin.label`; el día que el origen sea real,
    el aviso desaparece sin tocar la pantalla. Es D-025 aplicado a la propia
    fuente de datos.
  - La actividad editorial entra al adapter como **contexto**, no se lee dentro:
    es dato real de las ocho marcas con un calendario propio, y meterla en el
    adapter ataría el calendario editorial —que ya funciona— a la llegada de P3.
  - `getPortfolio` y `getDashboard` son asíncronos: un repositorio con base de
    datos lo es, y hacerlo ahora evita una migración de firmas en P3.2.
  - El origen `database` existe vacío a propósito. Un adapter con una sola
    implementación no demuestra nada; la costura solo está probada cuando hay dos
    orígenes y el selector funciona. 15 pruebas lo cubren.

## D-029 · El catálogo de métricas es portante, no documentación

- Fecha: 2026-09-04.
- Estado: vigente.
- Decisión: `packages/contracts/src/catalog.ts` declara las seis métricas, las
  siete fuentes, la zona horaria (`Europe/Madrid`) y la moneda (`EUR`), y
  `aggregateMetric` es **la única función que agrega métricas** en el monorepo.
  Cada métrica declara su regla: `sum`, `weighted-average` con la métrica que la
  pondera, o `latest`.
- Motivo: estos hechos ya existían, pero dispersos y escritos a mano en cada
  superficie. `portfolio.ts` decidía por su cuenta que la visibilidad se pondera
  por sesiones; el desfase de tres días de Search Console solo aparecía en una
  nota de la interfaz. Esa dispersión es exactamente lo que rompe una migración:
  cuando P3.2 escriba el SQL tiene que agregar **igual** que agrega hoy el
  sintético, o los números cambiarán al conectar el dato real y nadie sabrá si
  la causa es la fuente o el código.
- Consecuencias:
  - Sumar porcentajes queda prohibido por contrato: el esquema rechaza una media
    ponderada sin peso y una suma con peso, y una prueba impide declarar
    `sum` en cualquier métrica en `percent` o `score`. Ponderar un porcentaje por
    otro porcentaje también se rechaza.
  - `aggregateMetric` devuelve `null` sin filas o sin peso, no cero: un cero es
    una afirmación sobre el negocio y la ausencia de datos no lo es.
  - Las etiquetas, unidades y direcciones de los totales de `/portfolio` salen
    del catálogo. Una prueba comprueba que coinciden, así que no se puede volver
    a escribir un literal.
  - El estado de conexión de las fuentes en la tabla de migración de `/portfolio`
    también se deriva del catálogo: cuando P3.2 marque GA4 y GSC como conectadas,
    la tabla lo reflejará sola.
  - `cutoffLagDays` e `isPeriodSufficient` hacen utilizable lo declarado: el
    corte de un conjunto de métricas es el desfase de su fuente más lenta (GSC
    manda sobre GA4), y la visibilidad no es interpretable a 28 días porque su
    ventana mínima son 90.

## D-030 · La unidad de ingesta es el día, no la ventana

- Fecha: 2026-09-07.
- Estado: vigente.
- Decisión: la ingesta diaria de P3.2 se reparte en un job por
  `proyecto x fuente x día`, con clave de idempotencia `proyecto:fuente:día`, y
  cada día guarda la huella de sus filas en un libro
  (`packages/sync/src/{plan,ledger,ingest}.ts`). El desfase de cada fuente y su
  cadencia salen de `SOURCE_CATALOG` (D-029), no de constantes en el
  orquestador. `pnpm ingest:dry-run` ejecuta cuatro ciclos completos y sale con
  código 1 si aparece un duplicado, una deriva o un hueco.
- Motivo: `SyncOrchestrator` (P0) trataba la ventana de reprocesado como una
  sola unidad de trabajo y su clave era `proyecto:fuente:corte`. Consecuencia
  concreta: los mismos siete días ingeridos hoy y mañana producen dos claves
  distintas, así que nada impedía que convivieran dos versiones del mismo día.
  El criterio del roadmap pide idempotencia y reprocesado de siete días; con la
  ventana como unidad, la idempotencia solo protegía de repetir el ciclo el
  mismo día. Además, esperar a tener credenciales para escribir esto habría
  significado estrenar las reglas de deduplicación contra dato real, que es el
  peor momento para descubrir que dedupican mal.
- Consecuencias:
  - Reingerir un día con el mismo contenido es `unchanged` y no toca el
    registro; con contenido distinto es `revised`, con huella anterior y
    contador de revisiones. Un número no puede moverse en silencio.
  - El libro solo se escribe en el éxito, así que un fallo conserva el último
    snapshot válido por construcción, y `snapshotStaleness` publica su
    antigüedad. Distingue dos averías: `behindDays` (el dato se quedó atrás) y
    `missingDays` (falta un día **dentro** de la ventana). Sin la segunda, un
    fallo a mitad de ventana se leería «al día» y el día ausente parecería una
    caída de tráfico a cero.
  - Un job que falla no aborta el ciclo: los demás días y las demás marcas
    entran igual. Una fuente planificada **sin lector** sí es error de
    configuración, porque saltársela dejaría un hueco indistinguible de una
    caída.
  - Corrección de semántica heredada: la ventana anterior producía ocho días
    (`cutoff - 7 .. cutoff`) para un criterio que pide siete, y aplicaba `D-3` a
    todas las fuentes. Ahora son siete contando el corte y el desfase es el de
    la fuente: GA4 `D-1`, GSC `D-3`, SEMrush y CrUX `D-7`.
  - `SyncOrchestrator` no se elimina ni se le añade la lógica diaria: sigue
    siendo el camino de las fuentes semanales de P3.3 y de la publicación
    firmada. Lo que queda prohibido es tener dos implementaciones de la ingesta
    diaria.
  - El planificador **valida** proyectos y fuentes con los esquemas aunque el
    tipo ya los declare. No es defensa teórica: el primer ensayo pasó
    `PILOT_PROJECTS` —objetos `Brand`, no slugs— y el plan no falló: interpoló
    «[object Object]», las dos marcas colapsaron en una clave y 28 jobs se
    convirtieron en 14 sin un solo error. `packages/sync/tsconfig.json` incluye
    ahora `scripts/**` para que el typecheck cubra lo que el ensayo ejecuta.
  - Los lectores declaran su procedencia (`realData`). Mientras sean sintéticos,
    el informe del ciclo lo dice; el ensayo no puede presentarse como evidencia
    de integración con GA4 o Search Console.

## D-031 · La cuota se reserva antes de llamar y un run a medias nunca es completo

- Fecha: 2026-09-07.
- Estado: vigente.
- Decisión: las reglas de ejecución de la sincronización —presupuesto de cuota,
  política de reintentos, lock con ficha creciente y estado observable del
  `SyncRun`— viven en `packages/sync/src/policy.ts` y `packages/sync/src/run.ts`,
  son provider-agnósticas y el ciclo diario de D-030 ya las aplica. `pnpm
  ingest:dry-run` ejecuta, además de los cuatro ciclos, tres escenarios que solo
  estas reglas producen: lock ocupado, presupuesto agotado y fuente
  intermitente.
- Motivo: el roadmap enunciaba «cuotas, reintentos, locks, datos parciales y
  observabilidad por `SyncRun`» desde P0 y la tabla `sync_runs` existe desde
  entonces, pero la regla no existía en ninguna parte. Escribirla ahora responde
  al mismo criterio que D-030: una política de reintentos estrenada contra el
  proveedor real es una política sin probar gastando cuota real, y la primera
  señal de que reintenta lo que no debe llega en forma de factura o de bloqueo.
- Consecuencias:
  - **La cuota se reserva antes de la llamada, no se cuenta después.** Contarla
    después es contar lo ya gastado: cuando el contador detecta el exceso, la
    petición ya salió. Un job sin reserva se **aplaza**; no se llama a la fuente.
  - **Cada reintento se cobra al mismo presupuesto.** Si no, el presupuesto es
    decorativo: un día con muchos 429 duplica el gasto real sin que nadie lo vea.
  - **El fallo se clasifica por tipo o por código, nunca por el texto.** Un
    permanente (credenciales revocadas, propiedad inexistente, permiso denegado)
    no se reintenta: no tiene ninguna probabilidad de éxito, quema cuota y
    retrasa a los jobs que sí podrían entrar. Un `unknown` se reintenta menos
    veces que un transitorio declarado, porque no sabemos si esperar sirve. Un
    día vacío tampoco se reintenta: es una ausencia declarada (D-030), no una
    avería. Perder el arrendamiento del lock es permanente dentro del ciclo.
  - **La espera crece y se dispersa.** Sin dispersión, veintiocho jobs que
    reciben el mismo 429 esperan lo mismo y vuelven a la vez, que es cómo un
    límite momentáneo se convierte en un ciclo rebotando. Si la fuente indica
    cuánto esperar, su cifra manda cuando es mayor. Hay techo por intento y
    techo de espera acumulada por job: un día malo no puede comerse el ciclo.
  - **El lock lleva ficha creciente (`fencingToken`).** El TTL caduca el
    permiso, no el proceso: un ciclo atascado sigue vivo, cree que manda y
    escribiría encima del que le sustituyó. La ficha se comprueba **justo antes
    de escribir**, no al empezar el job, porque lo que hay que impedir es la
    escritura tardía, no la lectura tardía. Un arrendamiento caducado tampoco
    puede liberar el lock de su relevo.
  - **Un `SyncRun` no puede declararse completo si algún día quedó fuera.** Sin
    esta regla, un ciclo que escribió 20 de 28 días termina en `complete` por no
    haber lanzado ninguna excepción, y la interfaz presenta una serie con
    agujeros como si estuviera al día. `pending` se calcula contra lo
    planificado, no contra lo registrado.
  - **`deferred` no es un tipo de fallo.** Un fallo es una avería: la fuente se
    consultó y no dio el dato. Un aplazamiento es trabajo pendiente: no había
    cuota o el lock estaba ocupado, y la fuente ni se consultó. Contarlos juntos
    haría que agotar la cuota pareciera una caída del proveedor. Los estados son
    `complete`, `partial`, `failed` y `blocked`, y los tres últimos lo dicen en
    su `disclosure`.
  - **Los presupuestos declarados no son los límites del proveedor.** Son el
    gasto que V2 se autoriza, deliberadamente conservador, y llevan
    `verifiedAgainstProvider: false` mientras nadie los haya comparado con el
    contrato real: misma disciplina que `realData` en los lectores (D-030). Se
    revisan al llegar las credenciales.
  - El ciclo sin política explícita **no queda sin reglas**: activa cuota y lock
    en memoria por defecto. Desactivarlos exige pedirlo (`quota: null`).

## D-032 · Marca y sitio son cosas distintas; la web es la unidad importada

- Fecha: 2026-09-21.
- Estado: vigente.
- Decisión: `packages/contracts/src/sites.ts` es la lista canónica de las webs
  del grupo, importada de `src/lib/config/projects.ts` de V1. Cada sitio cuelga
  de una marca de `taxonomy.ts` y lleva sus propios mercados, `brandTerms` y
  `suggestedExclusions`. `BRANDS` sigue siendo la lista canónica de ocho marcas
  y no se toca. La entrada queda archivada en
  `packages/contracts/data/archive/v1/projects.json`, la regenera `pnpm
  projects:import` y `sites.test.ts` compara la traducción contra ese archivo
  campo a campo.
- Motivo: V1 llamaba «proyecto» a lo que era una web, y al colapsar sus diez
  claves en las ocho marcas de V2 se perdieron dos cosas sin dejar rastro.
  `product-finder` desapareció entera pese a tener
  `GA4_PROPERTY_ID_PRODUCT_FINDER_ES` y `GSC_SITE_URL_PRODUCT_FINDER` en el
  `.env` de V1; y los 61 mercados por proyecto se quedaron en una lista global
  de cinco, de modo que los 18 de Porcelanosa, los 13 de Krion, los 10 de Noken
  y los 7 de Gamadecor pasaron a ser «Tier 1 · Todos». El comentario de
  `taxonomy.ts` afirmaba reproducir lo que V1 tenía conectado: era cierto de las
  fuentes —verificadas una a una y correctas— y falso de los proyectos y los
  mercados.
- Consecuencias:
  - **Una marca puede tener varios sitios.** Porcelanosa tiene el suyo y
    `product-finder`, que no es una marca sino un buscador suyo servido desde
    dos hosts. Meterlo como novena marca habría roto el dataset editorial, que
    cubre ocho y no tiene calendario para él.
  - **`conjunto` no se importa.** Era la vista agregada de V1, no una web, y en
    V2 ya la sirve `/portfolio`.
  - **El código de mercado no es la ruta.** Noken sirve Reino Unido bajo
    `/en_gb/` y los mercados en raíz llevan prefijo vacío; `marketPath()` es lo
    único que resuelve eso. La base de SEMrush tampoco es el código: Krion `zh`
    consulta `cn`.
  - **La paridad se comprueba contra el archivo, no contra V1 en disco.** La
    migración va a dejar de garantizar que V1 exista; sin snapshot archivado,
    la comprobación se evapora justo cuando más falta hace.
  - **`/projects` lista las ocho webs, no solo el piloto.** La columna vertebral
    de la pantalla son los sitios importados y la analítica es lo que se añade
    encima cuando existe, no al revés: un sitio sin serie no es un hueco que
    esconder hasta P3, es una web que el grupo tiene y que V1 medía. La ficha
    dice con cuántas fuentes se medía y cuántos de sus mercados son navegables
    hoy. La selección vive en `apps/viewer/lib/sites.ts` con pruebas, no en la
    plantilla.
  - **El selector de mercado sigue mostrando los cinco de Tier 1.** Los otros 53
    mercados están importados y visibles en la ficha de cada web, pero todavía
    no son filtrables: `marketCodeSchema` sigue siendo de cinco. La ficha marca
    cuáles lo son en vez de enseñarlos todos como equivalentes.
  - **`product-finder` no aparece en la interfaz.** Sigue en el modelo, marcado
    como sitio no principal, porque es un hallazgo verificado de la migración;
    pero no es la web de una marca y sus hosts están sin confirmar, así que
    listarlo como proyecto medible sería afirmar más de lo que se sabe.
- Pendiente: los dos hosts de `product-finder` salen de un comentario del código
  de V1, no de su configuración, y hay que confirmarlos antes de pedirles datos.
  V1 declaraba `product-finder` y `antic-colonial` con las cuatro fuentes por
  caída al monolito `hasData`, mientras sus propios resúmenes decían menos
  («GA4 conectado» y «Search Console y GA4»); el snapshot recoge lo que el
  código resolvía, que es lo que V1 ejecutaba, pero la discrepancia es de V1 y
  la hereda P3 al enchufar las fuentes reales.

## D-033 · Las ocho marcas se pueden seleccionar; solo dos tienen serie

- Fecha: 2026-09-21.
- Estado: vigente.
- Decisión: `projectSlugSchema` pasa de `["porcelanosa", "noken"]` a las ocho
  marcas de `BRAND_SLUGS`, y el selector de proyecto las ofrece todas en dos
  grupos. Ser seleccionable no implica tener analítica: `isPilotProject()` es la
  pregunta que separa lo que se mide de lo que solo se describe, y una marca sin
  piloto recibe un payload sin analítica —colecciones vacías y fuentes en
  `no_configurado`— que la pantalla `UnmeasuredBrand` explica.
- Motivo: el piloto analítico estaba escrito en el contrato, no en los datos. Las
  seis marcas restantes no eran elegibles en ninguna pantalla aunque V1 las
  midiera y el calendario editorial las cubra con dato real desde P1. Importar
  sus webs en D-032 las hizo visibles en `/projects` pero seguían sin poder
  seleccionarse, que es justo lo que se pedía.
- Consecuencias:
  - **Una marca sin piloto no escala la serie del piloto.** El reparto era
    `project === "porcelanosa" ? 0.64 : 0.36`: con solo dos marcas elegibles
    funcionaba, pero al abrir la selección ese `else` le habría dado a Krion el
    36% de la serie de Noken. Habría sido un número plausible, con su delta y su
    tendencia, indistinguible de uno medido. Es el fallo que más caro sale de
    detectar tarde, porque no se parece a un fallo.
  - **Vacío no es cero.** Un cero es una medición que dio cero. Las fuentes de
    una marca sin conectar salen en `no_configurado` con cobertura 0 y una nota
    que nombra su ola, que es el estado que el contrato ya tenía previsto.
  - **La pantalla de una marca sin serie no es la portada con huecos.** Enseña
    lo que sí se sabe: los mercados y las fuentes que V1 medía (D-032) y el
    enlace a su actividad editorial, que es dato real. Un 404 tampoco servía:
    la marca existe, solo que aún no se mide.
  - **`marketCodeSchema` no se toca.** Sigue cubriendo los cinco de Tier 1. Abrir
    marcas y abrir mercados son dos cambios distintos y mezclarlos habría hecho
    indistinguible un fallo de uno del otro.
- Pendiente: los 53 mercados importados fuera de Tier 1 siguen sin ser
  filtrables. Es el siguiente paso natural y toca el selector de mercado, los
  filtros de portfolio y el conector sintético.

## D-034 · Origen `live`: GA4 y Search Console leídos en directo, como puente hasta el almacén

- Fecha: 2026-09-23.
- Estado: vigente, **provisional** hasta que P3.1/P3.2 entreguen el almacén.
- Decisión: `@seo/repository` gana un cuarto origen, `SEO_DATA_SOURCE=live`
  (`packages/repository/src/live/`), que lee GA4 Data API y Search Console API
  desde el servidor con las **mismas credenciales de la V1** (cuenta de servicio
  GA4 y cliente OAuth con refresh token de solo lectura para GSC), sin SDK de
  Google. Compone los mismos payloads de contrato que el sintético, así que las
  pantallas no se bifurcan (D-028). El usuario pidió desplegar ya con dato real
  y el almacén depende de Neon, que no existe todavía.
- Qué es real y qué no:
  - **Real**: sesiones orgánicas (`sessionMedium = organic`), macroconversiones
    (`keyEvents` orgánicos), clics orgánicos, cuota non-branded, series diarias
    con interanual alineado por fecha y reparto por mercado Tier 1.
  - **Vacío a propósito**: conclusiones, acciones, incidencias, oportunidades,
    informes de la portada y GEO. Eran texto sintético de validación; mezclarlo
    con cifras reales haría pasar una narrativa inventada por lectura del dato.
  - **Sin fuente**: visibilidad (SEMrush), salud técnica (crawl) y, por tanto,
    score compuesto. La interfaz pinta «—», no 0 %.
- Reglas que conserva de la V1 para que las cifras cuadren con las conocidas:
  - El mercado es el **prefijo de ruta**, no el país del usuario. El mercado
    raíz (Porcelanosa ES) se define excluyendo **todos** los prefijos que la V1
    declaraba, incluidos los no navegables en V2 (Italia, México…); si no,
    «España» absorbería quince mercados. El prefijo cierra en `/`, `?`, `#` o
    fin: `/usados` no es `/us`.
  - Non-branded excluye marca propia y paraguas (Noken: `noken|нокен|porcelanosa`).
- Reglas nuevas:
  - Cuota non-branded = no marca ÷ (marca + no marca). GSC anonimiza ~50 % de
    los clics; dividir por el total infravaloraría la cuota. La cobertura
    declara qué fracción estaba clasificada.
  - GSC conserva 16 meses (486 días). El periodo actual se **recorta** al suelo
    y la cobertura dice «N de M días»; una comparación incompleta se **anula**
    (`null`): comparar 28 días reales contra 9 conservados fabricaría una caída.
    En la práctica solo 28d y 90d tienen interanual de GSC.
  - Corte = hoy en Europe/Madrid − 3 días, el desfase de GSC.
  - Una fuente caída no tumba la otra: sale en `error`/`parcial` con el mensaje.
  - Caché: en memoria por instancia y `unstable_cache` de Next 6 h con el corte
    en la clave (`apps/viewer/lib/live-cache.ts`). **Un resultado con alguna
    fuente caída no se cachea**: un fallo de token de cinco minutos no puede
    dejar la tarjeta en «error» seis horas.
  - `aggregatePortfolio` acepta `connectedSources`: sin SEMrush no emite el KPI
    de visibilidad, y un objetivo que suma cero es `null` («sin objetivo»), no
    «Objetivo 0».
- Lo que NO cambia: `realData: false` sigue en los lectores de ingesta de
  `@seo/sync`; el catálogo de fuentes sigue describiendo el almacén (P3). Este
  origen no cierra ningún criterio de P3.2: no hay snapshot propio, ni 24 meses
  reconciliados, ni reconciliación ≤ 1 %.
- Observado al conectar: los `keyEvents` orgánicos de Porcelanosa en el año
  previo a la ventana de 24 meses suman ~1,9 M frente a ~32 k en la ventana. Es
  dato real y apunta a un cambio de configuración de eventos clave en la
  propiedad; hay que confirmarlo antes de leer esa comparativa.

## D-035 · Visor desplegado en Vercel con acceso público temporal

- Fecha: 2026-09-23.
- Estado: vigente, **temporal** hasta registrar la aplicación en Microsoft Entra.
- Decisión: solo el visor se publica (proyecto Vercel `seo-dashboard-viewer`,
  raíz `apps/viewer`, funciones en `fra1`); el workbench sigue siendo local. Por
  petición explícita del usuario, `PUBLIC_ACCESS=true` desactiva el login: el
  proxy deja pasar todo y `authorized` devuelve `true`. Quitar la variable
  devuelve el login obligatorio sin tocar código.
- Salvaguardas que se mantienen: `X-Robots-Tag: noindex, nofollow, noarchive`,
  cabeceras de seguridad, visor de solo lectura, secretos solo en variables de
  entorno de Vercel (los de Google como `sensitive`) y nunca en el navegador.
- Consecuencias de despliegue:
  - `output: "standalone"` solo fuera de Vercel: el adaptador de Vercel falla si
    se cambia la salida (`next-server.js.nft.json` ausente).
  - La curación editorial se lee de disco en tiempo de ejecución y el trazado no
    la veía: en producción el visor la habría perdido **sin error**. Ahora se
    declara en `outputFileTracingIncludes` y `readCurationStore` prueba rutas
    desde el directorio de trabajo.
  - `turbo.json` declara `globalPassThroughEnv`: Turborepo filtra las variables
    no declaradas durante el build.
  - `.vercelignore` impide que `vercel deploy` suba `.env*`, `node_modules`,
    `.turbo`, `informes-adicionales` y datos locales: la CLI sube el árbol local,
    no el de git.
  - Crons retirados de `apps/viewer/vercel.json`: sin `DATABASE_URL` las rutas
    programadas responden 503. Vuelven con el almacén.
  - La cuenta de Vercel es **Hobby**, que Vercel reserva a uso no comercial.
    Para uso corporativo hace falta un plan Pro (decisión del responsable).

## D-036 · Xtone entra en el piloto con dato real, y el origen `live` aporta oportunidades

- Fecha: 2026-09-23.
- Estado: vigente.
- Decisión: por prioridad del usuario (presentación de Xtone), `xtone` pasa a
  `pilot: true, wave: 0` y se lee en directo como Porcelanosa y Noken. El piloto
  es ahora **Porcelanosa, Noken y Xtone**; la expansión queda en cinco marcas.
- Mercados de Xtone (estructura detectada en GSC/GA4 el 2026-09-23, la V1 solo
  declaraba España): ES en la raíz por exclusión de `en|fr|de|pt|it|pl|zh`;
  FR `/fr`, DE `/de`; **UK y US comparten `/en` y se separan por país del
  usuario** (`country` en GA4, ISO-3 en GSC). Es la única excepción a
  «mercado = ruta» y la cobertura lo declara («por ruta y país»).
- Marca de Xtone: `x[ -]?s?tone|porcelanosa` (xtone, x tone, x-tone, xstone,
  x stone). Las búsquedas de la embajadora (`tamara|falcó`, ~55 k impresiones al
  trimestre) cuentan en la cuota non-branded pero **no se listan como
  oportunidad**: buscan a la persona, no la superficie.
- El conector sintético **no simula Xtone**: en modo sintético sale sin cifras,
  igual que una marca sin piloto. Sin esa guarda caía en el `else` del reparto y
  recibía el 36 % de la serie de Noken (el fallo de D-033).
- Oportunidades reales en el origen `live` (`packages/repository/src/live/opportunities.ts`):
  URLs y, nuevo en el contrato, `queryOpportunities` (consultas non-branded),
  medidas contra la **curva de CTR del propio sitio** por tramo de posición, con
  respaldo conservador donde no hay volumen. Potencial = impresiones × CTR del
  top 3 − clics. Conversiones por URL desde GA4 `landingPage`, normalizando la
  ruta (GSC y GA4 difieren en la barra final). El sintético deja la lista vacía.
- Anotaciones fechadas por marca: hechos observados en los datos, con
  procedencia. Primera: **migración de URLs de Xtone el 2026-07-23**.
- `aggregatePortfolio`: las fuentes conectadas del origen solo se atribuyen a
  las marcas que ese origen mide.
- Hallazgos de Xtone al conectar (90 días a 2026-09-20, dato real):
  sesiones orgánicas 58.567 (−24,9 % vs. periodo anterior, −9,1 % interanual),
  clics 42.759 (−37,1 %), cuota non-branded 18,9 %. Clics semanales de ~5.500
  en primavera a ~2.450 a mediados de agosto; 634 URL antiguas pierden >80 % de
  sus clics (~9.200 clics). Los key events suben (843 vs. 261) y son casi todos
  `generate_lead`: hay que confirmar si cambió su configuración antes de leerlo
  como mejora.

## D-037 · La ficha de una marca medida es un informe ejecutivo para dirección

- Fecha: 2026-09-23.
- Estado: vigente.
- Decisión: con un origen de dato real (`live`), `/projects/[slug]` de una marca
  del piloto deja de ser la ficha de capítulos de validación de P1 y pasa a ser
  un **informe ejecutivo** (`packages/repository/src/live/report.ts`, contrato
  `packages/contracts/src/brand-report.ts`, vista
  `apps/viewer/components/report/`). El sintético no implementa
  `brandReport` y conserva la ficha antigua.
- Estructura (de más a menos ejecutivo): veredicto con motivo → 7 indicadores en
  lenguaje llano (visitas totales, desde buscadores, conversiones desde
  buscadores, búsquedas sin marca; clics, apariciones y % que nos elige) con
  periodo anterior **y** año pasado → barras comparativas por tramo → mes a mes
  frente al año anterior → **todos los canales**, no solo el orgánico → embudo
  → migración (si la marca tiene una anotada) → dónde ganar → mercados → plan
  editorial frente a Google → próximos pasos y calidad del dato. Cuatro
  pestañas en lugar de ocho: las que no tenían dato (Negocio, Técnica, GEO,
  Cronología) se retiran hasta que lo tengan.
- Selector propio: 7d, 28d, 90d, 6m, 12m, mes pasado, trimestre pasado, año en
  curso, año pasado y rango libre, más mercado; todo en la URL. Las dos
  comparaciones se calculan siempre. Grano del gráfico: día ≤ 31 días, semana
  ≤ 190, mes después (tres barras por tramo dejan de leerse antes).
- Reglas de redacción: sin emojis, cifras en formato español con separador de
  miles también en cuatro cifras, una idea por frase. Las lecturas y los
  próximos pasos salen de reglas fijas y se rotulan «automática · pendiente de
  revisión» (D-025). La variación solo se atribuye a una migración si cae
  dentro del periodo o de su anterior.
- Coherencia: dentro del informe «visitas desde buscadores» es el canal
  `Organic Search` de GA4, el mismo que suma el reparto por canales.
- **Excepción acotada a «el crawl solo en el workbench»**: la auditoría de la
  migración comprueba con HEAD, sin seguir enlaces ni descargar cuerpos, las 25
  URLs antiguas que más clics pierden. No es un crawl; si hiciera falta más, va
  al workbench.
- Rendimiento y cuota: la migración y el cruce editorial no dependen del
  periodo y se memorizan aparte; el cruce editorial se limita a las piezas desde
  el mes pasado (máx. 20) y busca todas las palabras en cualquier orden, con o
  sin tilde y sin plural ni género; las búsquedas de las páginas que convierten
  se piden página a página. Todo porque el volcado búsqueda × página agotaba la
  **cuota de carga** de Search Console en Porcelanosa. Los bloques secundarios
  fallan en vacío sin tumbar los indicadores, y las llamadas a Google reintentan
  dos veces ante 429/5xx. `BRAND_REPORT_VERSION` entra en las claves de caché.
- Hallazgos de Xtone visibles en el informe (90 días a 2026-09-20): tráfico
  directo de 24.505 a 412.814 visitas y «sin clasificar» de 578 a 51.364
  (anomalía de medición declarada); 24 de las 25 URLs antiguas que más pierden
  redirigen con 301 en un salto y la mediana de recuperación es ~62 %: la
  redirección existe, falta que las nuevas URLs hereden el posicionamiento;
  `/pt` responde 404 sin redirección.

## D-038 · Selector de periodo con calendario y comparación personalizable

- Fecha: 2026-09-23.
- Estado: vigente.
- Decisión: el informe ejecutivo (D-037) tiene un selector como el de Analytics
  (`apps/viewer/components/report/range-picker.tsx`): atajos rápidos (7, 14, 28,
  30 y 90 días; 6 y 12 meses) y de calendario (semana pasada lunes–domingo, este
  mes, mes pasado, este trimestre, trimestre pasado, este año, año pasado),
  rango libre en un calendario de dos meses o escribiendo fechas, y dos opciones
  de comparación: **periodo anterior o periodo elegido**, y **año pasado por
  fecha o por día de la semana** (364 días, para no comparar un lunes con un
  sábado).
- La comparación elegida dura siempre lo mismo que el periodo: se elige el
  inicio y el fin se deduce. Comparar 90 días con 30 produciría variaciones sin
  sentido que se leerían como comparables. Si la comparación acabaría después
  del corte o empieza antes de `REPORT_MIN_DATE` (2023-01-01), vuelve al periodo
  anterior en lugar de romper el enlace.
- La vista previa del panel usa `resolveReportWindow`, la misma función que el
  servidor, y `reportWindowParams` escribe la URL; una prueba comprueba que ida
  y vuelta reproducen la misma ventana. Los días sin dato de Search Console se
  marcan en el calendario.
- Los textos del informe nombran la comparación activa («frente a la comparación
  elegida», «año pasado (mismo día de la semana)») y la serie interanual se
  alinea por posición, válida para ambos modos. URL: `range`, `from`, `to`,
  `cmp=custom`, `cfrom`, `yoy=semana`.

## D-039 · Selector de mercado con cifras y mercados más allá de Tier 1

- Fecha: 2026-09-23.
- Estado: vigente.
- Decisión: el mercado del informe ejecutivo se elige en un panel
  (`apps/viewer/components/report/market-picker.tsx`) que enseña por mercado las
  visitas desde buscadores del periodo, su variación frente a la comparación
  activa, su peso relativo y **qué sección de la web lo define**. Buscador a
  partir de 8 mercados; teclado con flechas, Intro y Esc.
- El informe ofrece, además de los cinco Tier 1, los mercados que la V1 medía
  por sección (`extraMarkets` en `live/brands.ts`): Porcelanosa 13, Noken 5,
  Xtone 4 (PT, IT, PL, ZH). Código = prefijo en mayúsculas. Solo el informe los
  usa: portada y portfolio siguen en `marketCodeSchema`, que no se amplía.
- Para no agotar la cuota de Search Console, los mercados adicionales solo piden
  clics del periodo actual; la variación del panel sale de GA4, que sí se pide
  con las tres ventanas para todos.
- Un mercado que la marca no tiene no filtra en silencio: el informe vuelve a
  «todos» y lo declara en `market`.
- Con un mercado elegido, la fila «Todos los mercados» no muestra cifra: los
  indicadores del informe ya están filtrados y no son el total de la web.
- Hallazgo al conectar: en Xtone los mercados secundarios caen más que los
  principales tras la migración (Portugal −65 %, Italia −68 %, Polonia −67 % en
  90 días frente al periodo anterior).

## D-040 · Xtone presenta datos esenciales y exploración, sin conclusiones

- Fecha: 2026-09-23. Estado: vigente. Prioridad explícita del usuario.
- Alcance: `/projects/xtone` en local. Vista específica en `xtone-report.tsx`;
  otras marcas conservan D-037. El rediseño aún no está desplegado.
- Jerarquía: cuatro KPIs SEO, evolución principal con selector visitas/clics,
  canales y mercados resumidos. Keywords, páginas, mercados, migración y
  editorial en pestañas. Se retiran veredicto, lecturas automáticas, acciones
  y recomendaciones; avisos de calidad se conservan como hechos de medición.
- Tipografía sans en el H1 de esta vista, espacios amplios, cifras tabulares,
  tokens minerales/cobalto compartidos. Tabla horizontal dentro de su región;
  el documento no desborda. Menú colapsado también en tablet.
- TanStack Table v9 y ECharts ya instalados, sin nuevas dependencias. Búsqueda
  normalizada, orden por valores crudos, null al final, 10/25/50/100 filas y
  paginación. Reinicio de estado al cambiar periodo, comparación o mercado.
- Exploración sobre las muestras GSC ya leídas: hasta 3000 combinaciones
  keyword×URL sin marca y 5000 URLs. El contrato publica disponibilidad,
  número de filas, límite y posible truncamiento. Nunca equivale a todas las
  keywords del sitio. Comparación de URL exacta; falta de URL previa es null.
- Editorial distingue lectura sin coincidencias (0) y lectura no realizada
  (measured=false, «—»). Migración declara sus fechas fijas y alcance global;
  mercados declara la comparación global aunque se seleccione uno arriba.
- Versionado de caché del informe `.12`. Ningún criterio P3 se cierra con esta
  mejora de interfaz. P3 sigue 25%; P2 sigue bloqueada 79%.


## D-041 · Extender el diseño aprobado de Xtone a todo el producto

- Fecha: 2026-09-23. Estado: vigente. Petición explícita tras aprobar D-040.
- Sustituye el alcance exclusivo de D-040: una vista de marca compartida y el
  mismo lenguaje visual en viewer y workbench. H1 sans en todas las pantallas,
  UI de 14 px, espacios amplios y comparaciones/fuentes conservadas.
- Resúmenes centrados en datos, sin conclusiones automáticas. Los contenidos
  archivados se consultan bajo demanda; no se borran informes ni curación.
- TanStack Table pasa a `@seo/ui/data-table`, con búsqueda, orden, filas y páginas.
  Los enlaces a acciones/hitos abren automáticamente la página de su registro.
  Paginación editorial en URL mantiene los contratos de filtros y CSV.
- Se conservan ECharts, tokens compartidos, visor de solo lectura y Server
  Actions del workbench. La plantilla de informe deja de incluir resultados
  ficticios o un estado de guardado que todavía no existe.
- Marcas sin integración muestran cobertura pendiente, no métricas inventadas.
  Ningún dato ni fuente se modifica; no hay nuevas llamadas a proveedores.
- Entrega local, sin despliegue. P3 continúa al 25%; P2 bloqueada al 79%.


## D-042 · Estados de carga por zonas en informes de marca

- Fecha: 2026-09-24. Estado: vigente. Integración autorizada el 23 y verificada
  tras reanudar dev el 24. Alcance local, sin despliegue.
- La vista compartida de Porcelanosa, Noken y Xtone confirma inmediatamente
  mercado y periodo con selección optimista y un estado accesible. Oculta las
  cifras anteriores de las zonas afectadas hasta recibir el nuevo informe.
- Skeletons compartidos en `@seo/ui/skeleton`: métricas, gráfico, tabla y filas.
  Conservan el espacio de cada bloque. Espera de 160 ms para evitar destellos
  en respuestas rápidas; a los 6 s se avisa de la demora. Movimiento reducido
  respetado y controles de los datos antiguos inertes durante la carga.
- El cambio de mercado conserva visible la comparativa global de mercados;
  el histórico mensual depende del mercado y la migración usa siempre su
  ventana propia. Cambiar el periodo sí enmascara la comparativa de mercados.
- Los filtros rápidos se componen sobre la última URL solicitada. El borrador
  abierto del calendario no se sobrescribe cuando llega otra respuesta.
  La resolución de pestañas comparte compatibilidad con `chapter` de V1.
- `loading.tsx` cubre la entrada al proyecto; `error.tsx` permite reintentar
  con `retry()` de Next 16.3.4. El informe parcial ofrece `router.refresh()`;
  los resultados con fuentes caídas ya se excluyen de la caché del servidor.
- La impresión usa solo los datos y etiquetas del informe aplicado; su botón
  y el modo presentación se deshabilitan mientras se actualiza.
- Se conserva la lectura de un `BrandReport` completo en el servidor: las
  zonas dejan de cargar al recibir el informe, no mediante streaming
  independiente de fuentes. Sin dependencias nuevas ni cambios de proveedores.
- P3 permanece activa al 25%; P2 bloqueada al 79%.


## D-043 · Feedback inmediato en el menú principal

- Fecha: 2026-09-24. Estado: vigente. Petición explícita del usuario.
- `AppShell` presenta actividad en el enlace elegido, barra superior
  indeterminada y aviso accesible «Abriendo [sección]…» mientras navega.
- Se usa `useLinkStatus` nativo de Next en los nueve enlaces del menú. Next
  controla finalización y sustitución del destino; no hay porcentajes ni
  demoras artificiales. Se conserva el prefetch y la semántica de Link.
- En móvil el menú se cierra al navegar y devuelve el foco a su botón. El
  aviso permanece fuera del panel cerrado y no intercepta interacciones.
- Los indicadores no mueven el contenido, respetan movimiento reducido y
  se excluyen de impresión. El estado aplicado continúa marcado hasta llegar
  al destino. Las respuestas rápidas no mantienen el indicador artificialmente.
- Alcance: menú principal del visor. Complementa los skeletons de informes
  D-042 sin modificar sus filtros. Sin nuevas dependencias ni despliegue.


## D-044 · shadcn/ui y layout dashboard-01 en el visor

- Fecha: 2026-09-24. Estado: vigente en la rama `feat/shadcn-dashboard`,
  pendiente de revisión y fusión. Petición explícita del usuario.
- El visor incorpora Tailwind v4 (`@tailwindcss/postcss`) y shadcn/ui
  (`components.json`, estilo new-york, `components/ui/*`). El workbench no cambia.
- Los tokens de shadcn no añaden colores: `--primary` es el cobalto
  `--ds-accent`, `--sidebar` el papel mineral `--ds-surface`, `--border`
  `--ds-line`, radios `--ds-radius-*`, tipografía `--ds-font-sans`. Estados
  positivos/aviso/peligro como utilidades `positive`, `warning`, `danger`.
- Orden de capas: preflight y `@seo/ui/tokens.css` en `base`, `globals.css` en
  `components`, utilidades encima. Las vistas no migradas recuperan márgenes y
  viñetas del navegador fuera de elementos shadcn (`data-slot`).
- Shell común: `SidebarProvider` + `AppSidebar` (variante inset, grupos
  Rendimiento/Decisiones, búsqueda cruzada y Datos) + `SiteHeader` con filtros
  globales en `Select`. `SidebarInset` es `div` porque cada vista tiene su `main`.
  La altura real de la cabecera se publica en `--app-header-offset`.
- Portada: tarjetas KPI que conservan cobertura, periodo anterior, interanual y
  objetivo; tarjeta de evolución con selector de periodo ligado al parámetro
  `period`; mercados, proyectos, acciones, asistentes y fuentes en tarjetas.
- ECharts sigue siendo la librería de gráficos (D-041); no se instala recharts.
  Se descartan del bloque la tabla con drag-and-drop, sus datos de ejemplo,
  vaul, sonner y los iconos Tabler (se mantiene lucide).
- Ajuste del 2026-09-24 (petición del usuario): la búsqueda sale del menú
  lateral y queda solo en la cabecera. La cabecera muestra la única miga de pan
  del visor (`lib/navigation.ts#buildBreadcrumb`: «Proyectos / XTONE»,
  «Editorial / Backlog y plan», «Informes / título»); las vistas ya no pintan la
  suya. Las fichas de detalle pasan su título con `crumb`. `.page` ocupa el
  100 % del inset para que su margen automático no la encoja al contenido.
- Ajuste del 2026-09-24 (petición del usuario): en la ficha de una marca con
  informe, periodo y mercado pasan a la barra superior (`AppShell.headerControls`,
  variante `header` de RangePicker/MarketPicker). `ReportNavigationProvider`
  envuelve ahora el shell para que cabecera e informe compartan la carga por
  zonas de D-042; en modo presentación los controles vuelven al informe. El
  corte se mantiene visible bajo el título («Datos cerrados hasta…»).
- El «Corte» de la cabecera se sustituye por usuarios activos en tiempo real:
  `GET /api/v1/realtime?project=` → `readRealtime` (GA4 Realtime, `activeUsers`
  de 30 min, caché de servidor de 30 s, sondeo cada 60 s con la pestaña
  visible). Es tráfico total de la propiedad, no orgánico ni por mercado, y así
  se etiqueta. Solo con `SEO_DATA_SOURCE=live`; sin él, punto gris y «Tiempo
  real no disponible», nunca una cifra sintética. En el conjunto suma el piloto.
- Nuevo token `--ds-live` (#3ddc84) solo para el punto intermitente
  (`animate-live-blink`), que respeta movimiento reducido.
- Ajuste del 2026-09-24 (petición del usuario): los selectores de periodo y
  mercado de la barra son botones sin borde (fondo mineral al pasar el ratón,
  anillo de foco). Margen lateral común `--app-gutter` (16 px, 24 px desde
  1024 px): la barra y el `main#contenido` de cada vista lo comparten y el
  contenido ocupa todo el ancho del inset, alineado con el icono del menú y el
  de búsqueda. Se retira el ancho máximo centrado; las vistas de lectura
  (`.page-reading`) conservan su medida alineada a la izquierda.
- Ajuste del 2026-09-24: la ficha de XTONE usa el logotipo oficial facilitado
  por el usuario (`apps/viewer/public/brands/xtone.svg`, viewBox recortado al
  contenido, sin otros cambios) como contenido del `h1`, con `alt` «XTONE».
  `BRAND_LOGOS` en `brand-report.tsx` admite el resto de marcas cuando lleguen.
- Ajuste del 2026-09-24: logotipo de marca a 20–24 px de alto; se retira el
  botón «Modo presentación» (la salida sigue disponible para enlaces antiguos
  con `?modo=presentacion`); el submenú del informe (`.brand-tabs`) queda fijo
  bajo la barra superior usando `--app-header-offset`.
- Ajuste del 2026-09-24: se retira «Datos cerrados hasta…» bajo el título del
  informe; el rango de la barra superior termina en el corte. El panel del
  calendario sigue sin permitir días posteriores al corte.
- Ajuste del 2026-09-24: aire simétrico en la cabecera del informe de marca
  (`--brand-gap`: 42/32/24 px) encima del logo y antes del submenú; el aviso de
  actualización de D-042 se superpone a ese hueco sin reservar altura propia.


## D-045 · Visitas SEO y clics de Google en una sola tarjeta

- Fecha: 2026-09-24. Estado: en prueba en `feat/shadcn-dashboard`. Petición del usuario.
- La ficha de marca muestra tres tarjetas: Visitas SEO (cifra principal, GA4)
  con «Desde Google · N clics» de Search Console en pequeño dentro de la misma
  tarjeta, Clics sin marca y Conversiones SEO al final. Sin notas aclaratorias.
- La barra inferior (impresiones, CTR) añade «Impresiones en Modo IA». Search
  Console no separa el Modo IA de la búsqueda web (comprobado por API el
  2026-09-24: `searchAppearance` solo devuelve vídeo, resultado traducido y
  fragmento de producto), así que se muestra «—» sin estimar.
- El informe incorpora `searchReconciliation` (sesiones orgánicas por buscador
  y clics de Google Imágenes). Hoy no se pinta; queda para explicar la
  diferencia si el usuario lo pide. Primera versión con tarjeta ampliada y notas
  descartada por el usuario.
- Ajuste del 2026-09-24: nueva tarjeta **Usuarios SEO** tras Visitas SEO
  (KPI `search_users`: `totalUsers` del canal Organic Search en GA4, mismo
  mercado y comparaciones; se lee en la consulta de canales, sin llamadas
  extra). Orden: Visitas SEO, Usuarios SEO, Clics sin marca, Conversiones SEO.
- Ajuste del 2026-09-24: tarjetas Visitas SEO · Usuarios SEO · Clics sin marca
  (al final, con anillo SVG marca / sin marca). Conversiones SEO pasa al final de
  la barra inferior (Impresiones · CTR · Modo IA · Conversiones), con textos de
  apoyo abreviados («vs. anterior», detalle en `title`) para caber en una línea.
- Ajuste del 2026-09-24: Clics sin marca pasa a ser solo gráfico (anillo con
  el porcentaje en el centro, leyenda marca / sin marca y variación en puntos
  porcentuales). Visitas SEO y Usuarios SEO sin «Qué mide»; la línea de Search
  Console dice «Google» y pierde la divisoria.
- Ajuste del 2026-09-24: la tarjeta de Clics sin marca se sustituye por
  **Keywords**: búsquedas de Google con impresiones en el periodo (Search
  Console, mismo mercado), variación frente al periodo anterior y barra apilada
  por posición media (≤3, 4–20, >20) con recuentos y porcentajes. Se pagina la
  API (`startRow`, 25.000 filas por página) hasta 100.000 filas por periodo;
  XTONE superaba las 25.000 y sin paginar el total y la variación salían
  recortados. Clics sin marca sigue en la tabla completa. Nuevo token
  `--ds-accent-mid` (#8ea0ff, ya en `SERIES_PALETTE`).
- El contador de tiempo real reintenta a los 10 s si una lectura falla.
- Ajuste del 2026-09-24: Keywords muestra bajo la cifra el % de keywords sin
  marca (recuento de consultas que no casan con `brandRegex`; no es la cuota de
  clics de «Clics sin marca»). La barra pierde la leyenda: cada tramo es
  enfocable y enseña su cifra en un tooltip (ratón o teclado).


## D-046 · Visitas desde IA en la ficha de marca

- Fecha: 2026-09-24. Estado: en prueba en `feat/shadcn-dashboard`. Petición del usuario.
- Cuarta tarjeta «Visitas desde IA»: sesiones GA4 cuyo `sessionSource` es un
  asistente (ChatGPT, Gemini, Perplexity, Copilot, Claude, DeepSeek, otros), de
  cualquier canal —GA4 clasifica parte de ChatGPT como Referral o Email— y en el
  mismo mercado. Total, variación y tabla por asistente (máx. 5).
- La fila «Modo IA» de Google sale de la barra inferior y pasa a esta tabla con
  «—» y «sin desglose»: Search Console no lo separa (ver D-045).
- Visitas SEO muestra el logotipo oficial «G» de Google en la línea de clics.
- Ajuste del 2026-09-24: la tarjeta de IA pierde la cifra grande y la variación; el total pasa a una fila «Total» de la tabla, antes de Modo IA.
- Ajuste del 2026-09-24: las tarjetas pierden la línea de fuente bajo el título; un icono Info junto al título (`InfoHint`, tooltip con ratón, teclado o toque) muestra fuente y definición. Se oculta al imprimir.
- Ajuste del 2026-09-24: Usuarios SEO muestra «N % nuevos» con su variación
  en puntos y una barra nuevos / recurrentes (tooltip por tramo). `userMix` sale
  de `newUsers` en la consulta de canales (sin llamadas extra); recurrentes =
  total − nuevos. `RankBar` se generaliza para ambas barras.
- Ajuste del 2026-09-24: Modo IA pasa de la tabla de IA al final de Visitas
  SEO («G Modo IA — sin desglose»). Usuarios SEO pierde la barra y conserva
  «N % nuevos». La tabla de IA empieza por el Total, muestra los tres primeros
  asistentes y despliega el resto con «Ver más (n)» (`ExpandableTable`); las
  cuatro tarjetas quedan a la misma altura (224 px a 1440).
- Ajuste del 2026-09-24: Modo IA vuelve a la barra inferior, tras Impresiones.
  Usuarios SEO (% nuevos) y Keywords (% sin marca) muestran un anillo pequeño
  (`MiniRing`) junto al porcentaje. Tarjetas alineadas a 217 px (1440).
- Ajuste del 2026-09-24: el anillo de Keywords muestra la cuota de **clics**
  sin marca (18,8 % en XTONE), no la de búsquedas distintas (96,9 %): 790
  búsquedas de marca concentran 17.228 de los 21.223 clics con búsqueda
  visible. Orden de la tarjeta: número, barra de posiciones, variación, anillo.
  Los anillos de Usuarios y Keywords se anclan al pie de la tarjeta y llevan
  variación en pp, así quedan a la misma altura.
- Ajuste del 2026-09-24: Visitas SEO añade bajo Google una línea de Bing con
  su logotipo (Simple Icons 12, CC0, trazado de bing.com, #258FFA; descargado
  con permiso del usuario). Son visitas GA4 desde Bing —no hay clics de Bing
  Webmaster conectados— con variación frente al periodo anterior; la lectura de
  buscadores de origen pasa a periodos con nombre.
- Ajuste del 2026-09-24: Visitas SEO, Usuarios SEO y Keywords muestran junto a la cifra principal la del periodo anterior, en pequeño con su etiqueta (`PreviousFigure`).
- Ajuste del 2026-09-24: junto a la cifra principal va solo la variación frente al periodo anterior, con su color (`FigureDelta`, nombre accesible y title «vs. periodo anterior»); se retira la cifra anterior y la línea «vs. periodo anterior» de debajo. Se mantiene «vs. año pasado».
- Ajuste del 2026-09-24: se descarta la variación junto a la cifra (vuelve a
  «−25,2 % vs. periodo anterior» debajo). En su lugar, mini gráfica sin ejes
  (`Sparkline`, 72×26) de la evolución del periodo junto a Visitas SEO
  (`searchSeries`) y Usuarios SEO (nuevo `usersSeries`: suma de usuarios
  diarios por tramo, válida para la forma, no como usuarios únicos; sale de la
  consulta diaria existente con `totalUsers`). Keywords no la lleva: no hay
  serie diaria de keywords sin una consulta búsqueda × día muy pesada.
- Ajuste del 2026-09-24: la barra inferior añade mini gráficas a Impresiones y
  CTR (nueva `impressionsSeries`; CTR por tramo = clics / impresiones) y pierde
  el texto «vs. anterior» (queda en `title` y para lectores). La tabla «Ver
  cifras y comparaciones completas» se rehace (`AllMetricsTable`): grupos
  Buscadores · Analytics y Google · Search Console, icono Info por indicador en
  lugar de columna de fuente, tendencia, actual, anterior, variación, año
  pasado e interanual (píldoras de color; en porcentajes, puntos). Añade
  Visitas desde IA y Keywords posicionadas.
- Ajuste del 2026-09-24: las mini gráficas usan la media diaria de cada tramo;
  el último tramo semanal está incompleto (90 días = 12 semanas + 6 días) y su
  suma caía en picado. La tabla completa deja de heredar `report-data-table`
  (cabeceras fijas que se superponían, mínimo de 145 px por columna) y pasa a
  estilos propios compactos: 13 px, 7×12 px de relleno, columnas numéricas al
  ancho de su contenido y sin desplazamiento vertical interno.
- Ajuste del 2026-09-24: las variaciones de la tabla completa pasan a texto de color sin fondo.
- Ajuste del 2026-09-24: «Evolución del tráfico» muestra solo Search Console,
  con pestañas Clics en Google (cobalto) e Impresiones (violeta; nuevos tokens
  `--ds-violet`/`--ds-violet-soft` y `CHART_COLORS.violet*`, reservados a esa
  serie). Se retira el desplegable «Ver datos del gráfico»; la tabla se
  mantiene solo para lectores de pantalla como alternativa accesible.
- Ajuste del 2026-09-24: «Proyectos» del menú lateral pasa a ser un selector
  (`ProjectSelector`, menú desplegable de shadcn): muestra la marca abierta
  (p. ej. «XTONE») como elemento activo y lista Todos los proyectos, las de
  serie analítica y las demás. Se retira la miga de pan de la cabecera: la
  ubicación se lee en el menú. `buildBreadcrumb` y la prop `crumb` quedan sin
  uso en pantalla (se conservan con sus pruebas por si vuelve).
- Ajuste del 2026-09-24: la barra inferior es un carril horizontal deslizable
  (una línea, `scroll-snap`, región enfocable con nombre) desde 761 px; en
  móvil sigue apilada. `position: relative` en el carril: sin él, los textos
  solo para lectores (posición absoluta) escapaban del recorte y ensanchaban la
  página 198 px a 1024.
- Ajuste del 2026-09-24: tercera pestaña «Tráfico total» en Evolución del
  tráfico (GA4, todos los canales, mismo mercado; nueva `webSeries` con tres
  consultas diarias en el mismo lote). Serie en tinta, comparaciones en grafito.
- Ajuste del 2026-09-24: Canales de tráfico y Mercados principales muestran 5
  filas y despliegan el resto con «Ver más (n)» (`ExpandableList`); Mercados
  incluye ya los no Tier 1 tras los Tier 1. Canales añade variación frente al
  periodo anterior y mini gráfica por canal (`channels[].trend`, media diaria
  por tramo, una consulta GA4 fecha × canal). Se retira la tabla «Ver los N
  canales y comparativas» (`Channels`), sustituida por la lista.
- Ajuste del 2026-09-24: variaciones desde 1.000 % abreviadas en miles («+1,6k %», `signedPercent`, en todo el informe). En Canales, la cuota sale de su columna y va a la derecha del nombre, sobre la barra y alineada con su final (220 px).
- Ajuste del 2026-09-24: Evolución del tráfico añade un interruptor Línea /
  Barras sobre el mismo periodo seleccionado (barras agrupadas actual, anterior
  y año anterior). Se retira el desplegable «Histórico mensual · últimos 12
  meses cerrados» de la portada del informe. Canales y Mercados comparten
  cabecera de columnas y altura de fila; se quita la nota bajo Mercados.
- Ajuste del 2026-09-24: la fuente y la granularidad del gráfico de evolución («Google Search Console · Totales por semana») pasan bajo el gráfico, a la derecha, en lugar de la frase «Comparación por tramos equivalentes…», que se retira.
- Ajuste del 2026-09-24: nuevo token `--ds-subtle` (#6e7875, 4,56:1 sobre blanco, el gris más claro que cumple AA) para los pies del gráfico de evolución: anotaciones, fuente y granularidad, en peso normal. El grafito (#7c8683, 3,75:1) se descartó por no cumplir AA en 12 px.
- Ajuste del 2026-09-24: pies del gráfico de evolución en grafito (#7c8683, 3,75:1: por debajo de AA en 12 px, decisión explícita del usuario). Las fechas de cada serie de la leyenda pasan a tooltip: al pasar el ratón en escritorio y al tocar en pantallas táctiles (hover: none), donde el toque muestra las fechas en lugar de ocultar la serie; el nombre accesible del botón incluye las fechas.
- Ajuste del 2026-09-24: el área del gráfico de evolución llega al borde derecho del interruptor Línea/Barras (margen derecho 0; primera y última etiqueta del eje alineadas hacia dentro; margen de categoría solo en barras).
- Ajuste del 2026-09-24: la métrica del gráfico de evolución pasa a un desplegable (Select de shadcn) con logo de Google en Clics e Impresiones e icono neutro en Tráfico total (dato de GA4). El interruptor Línea/Barras queda solo con iconos, con nombre accesible y title.
- Ajuste del 2026-09-24: la leyenda del gráfico de evolución pasa a la barra de herramientas, a la derecha del selector de métrica y antes del interruptor; en móvil va en su propia fila, en horizontal.

## D-047 · Acceso al visor con Google mientras Entra ID no esté disponible

- Fecha: 2026-09-25.
- Estado: vigente. Sustituirá a D-035 cuando se retire `PUBLIC_ACCESS` en Vercel.
- Contexto: no hay interlocución con IT ni acceso a Microsoft Entra, así que la
  app no se puede registrar allí. El responsable sí gestiona Google Cloud, y no
  quiere pasar Vercel a Pro (Vercel Authentication solo admite miembros del
  equipo y Password Protection es de pago).
- Decisión: login con Google (Auth.js, OIDC) y una lista de emails permitidos,
  `ALLOWED_GOOGLE_EMAILS`, que mantiene el responsable en Vercel. Solo entra un
  email **verificado** por Google y presente en la lista; una lista vacía no
  deja entrar a nadie. Acceso inicial: solo `marinerandreu@gmail.com`.
- Entra ID sigue en el código y se activa solo si existe
  `AUTH_MICROSOFT_ENTRA_ID_ID`. El login muestra únicamente los proveedores
  configurados.
- `AUTH_GOOGLE_*` es un cliente OAuth web propio y **no** reutiliza
  `GOOGLE_CLIENT_*`, que son las credenciales de solo lectura de GSC (D-034).
- Sin sesión, las rutas `/api/*` responden 401 en JSON y las páginas redirigen
  al login, que conserva solo la ruta del `callbackUrl`. `/api/auth` queda fuera
  del proxy. Se mantiene la sesión JWT de 8 h con cookie `__Secure-`.
- Riesgo aceptado: Hobby es de uso no comercial según las condiciones de Vercel.
  El plan B es Azure UE (salida `standalone`).
- Despliegue (2026-09-25): D-035 queda **sustituida**. `PUBLIC_ACCESS` eliminada
  en Vercel; proyecto GCP `seo-intelligence-viewer` con la app en modo Prueba
  (usuarios externos). Acceso con dos cierres: la lista de Vercel y los usuarios
  de prueba de Google. Hoy hay dos cuentas autorizadas.

## D-048 · Bloqueo de buscadores, bots e IA en el visor

- Fecha: 2026-09-25.
- Estado: vigente.
- Contexto: el visor es privado (D-047), pero la pantalla de login, las
  redirecciones y `robots.txt` (que antes redirigía al login) eran superficie
  rastreable, y solo había `X-Robots-Tag: noindex` y meta robots.
- Decisión, en capas:
  1. `app/robots.ts`: `Disallow: /` general y por nombre para cada agente de IA
     (`AI_AGENTS` en `lib/crawlers.ts`). Queda fuera del proxy para que se lea.
  2. `proxy.ts`: cualquier user-agent de buscador, rastreador SEO, agente de IA,
     previsualizador, navegador sin interfaz o librería HTTP (o sin user-agent)
     recibe 403 `no-store` en todas las rutas, login incluido. Solo se eximen
     `/robots.txt` y `/api/v1/service/*`, que tiene su propio token.
  3. Cabeceras: `X-Robots-Tag` ampliada (`nosnippet`, `noimageindex`, `noai`,
     `noimageai`…) y `TDM-Reservation: 1` (reserva de minería de textos y datos,
     art. 4 de la Directiva UE 2019/790). Meta robots equivalente en el layout.
  4. Workbench: `robots.txt` y las mismas cabeceras, aunque sea solo local.
- Límite asumido: el user-agent se falsifica; esto frena a los bots declarados,
  no a un scraper hostil. Lo que protege los datos sigue siendo la sesión. La capa
  de red es el Firewall de Vercel, gratuito en Hobby: Bot Protection en Challenge
  (reto JS a lo que no se comporta como navegador) y AI Bots en Deny, publicados
  el 2026-09-25 con `vercel firewall`.

## D-049 · La ficha de marca como patrón visual de todo el visor

- Fecha: 2026-09-25.
- Estado: vigente.
- Contexto: el responsable considera la ficha de marca (`/projects/xtone`) la
  pantalla más clara del visor en diseño y estructura. Las demás mezclaban
  tarjetas shadcn con insignias, cabeceras con eyebrow cobalto en mayúsculas y
  rellenos sólidos en los filtros.
- Decisión: extender su lenguaje al resto mediante clases globales, sin tocar la
  ficha: cabecera «Título │ ámbito», KPI en columnas con filetes y sin marco
  (`.ds-metric-strip` y `MetricCard` en `@seo/ui`), secciones sin tarjeta con
  h2 de 22 px, listas con filetes, pestañas subrayadas sin iconos y selección
  suave en cobalto. Detalle en `docs/design/DESIGN_SYSTEM.md`.
- Portada: `SectionCards` desaparece y usa `MetricStrip`, así que los KPI de
  Inicio, Conjunto y las fichas de detalle comparten componente. «Fuentes y
  calidad» pasa de tarjetas a lista con filetes, y en móvil se reordena con
  etiquetas en lugar de ocultar columnas.
- La cobertura de cada KPI sigue visible, pero como pie discreto, en ámbar solo
  si es parcial.
- Auditoría: `axe-audit.mjs` y `capture-screenshots.mjs` se presentan con un
  user-agent de Chrome normal, porque el proxy (D-048) responde 403 a
  «HeadlessChrome».


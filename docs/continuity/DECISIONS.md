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

# Checkpoint operativo — SEO Dashboard V2

Última actualización: 3 de septiembre de 2026.

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
- `P2` **activa al 0%**: paridad crítica con V1. Primera tarea pendiente: `P2.1`.
- El piloto de datos sigue siendo Porcelanosa + Noken; el calendario editorial ya
  cubre las ocho marcas, y ahora se puede curar de extremo a extremo desde el workbench.
- Bloqueo: aproximadamente 6,2 GiB libres (última medición 2026-09-02); no ejecutar
  crawls hasta alcanzar 50 GiB.

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
   `InsightStack` en la portada, `ChartFrame` en portada y ficha de proyecto
   (con la tabla accesible junto al gráfico), `DecisionThread` como índice del
   informe y `DataTablePanel` en las nueve tablas densas.
9. **Accesibilidad con Axe (D-016).** `pnpm axe` ejecuta `axe-core` sobre las dos
   apps a 1440 y 375 px. Estado actual: 36 combinaciones, 0 incumplimientos y 0
   avisos. No vuelvas a declarar accesibilidad solo con el script propio.
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

## Siguiente incremento exacto

`P2.1 · Inventario y contratos de migración`. No empieces por escribir pantallas:
P2 falla si se reimplementan superficies de V1 sin saber qué se conserva.

1. **Catalogar V1 superficie por superficie**: ruta, fuentes que consume,
   transformaciones que aplica, filtros, exportaciones y dependencias.
   `docs/continuity/V1_PARITY.md` ya tiene el inventario de las ~15 superficies
   con su estado V2; el trabajo es completar fuentes, transformaciones y
   dependencias, que hoy están descritas en prosa y no en columnas.
2. **Clasificar cada capacidad** como `retain`, `redesign`, `merge`, `defer` o
   `retire`, con motivo. Los estados de paridad ya existentes (`missing`,
   `foundation`, `partial-synthetic`, `implemented`, `verified`, `redirected`,
   `retired-approved`) describen *dónde está* V2; esta clasificación describe
   *qué se va a hacer*. Son ejes distintos y conviene no fusionarlos.
3. **Definir reconciliación y tolerancia por dataset migrado**: qué muestra se
   compara, contra qué, con qué margen aceptable y qué se hace cuando no cuadra.
   Sin esto, `P2.4` no tiene criterio de aceptación.
4. Ninguna retirada de capacidad V1 se da por buena sin registrarla con motivo y
   alternativa (regla de `ROADMAP.md`).

Deuda menor conocida, ninguna bloqueante (decide si entra en P2 o más tarde):

- `/queries/[id]` no tiene serie propia: la query no es una entidad del contrato
  hasta `P3`. La ficha lo declara explícitamente.
- `cluster` y `result` no tienen ficha destino (`linkTargetHref` devuelve `null`).
  Llegan con `P6` y `P9`; cuando existan, basta añadir el caso.

## Verificaciones que deben seguir pasando

```bash
pnpm continuity:check
pnpm typecheck        # 8 paquetes
pnpm test             # 85 pruebas
pnpm build            # viewer + workbench
pnpm editorial:import # debe decir "Sin cambios" si no tocaste los snapshots V1
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

Después se arranca `P2.1` según «Siguiente incremento exacto».

Para levantar la QA visual y de accesibilidad hacen falta los dos servidores:
`pnpm dev:viewer` (3000) y `pnpm dev:workbench` (3001). Si esos puertos están
ocupados, `.claude/launch.json` incluye `viewer-qa` (3020) y `workbench-qa`
(3021), y tanto `pnpm axe` como `pnpm screenshots` aceptan la base por bandera.

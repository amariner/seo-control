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
- `P1` **activa al 84%**: `P1.1`, `P1.2` y `P1.3` completadas; `P1.4` casi completa
  (falta solo el enlace recíproco de `links`); `P1.5` en curso (faltan tres
  primitivas de `@seo/ui` y las pruebas de permisos/Axe).
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
7. **Rutas del visor**: `/editorial/calendario`, `/editorial/backlog` y
   `/editorial/propuestas`, más redirección 308 desde `/conjunto/plan-editorial`.
8. **APIs**: `/api/v1/editorial/{calendar,pieces,pieces/[id],slots,import-report}` y
   `/api/v1/editorial/export/{plan-editorial-conjunto.csv,plan-editorial-propuestas.csv}`.
9. **Capturas**: `pnpm screenshots --out docs/design/screenshots/after` con el servidor
   en marcha. Nunca uses `--window-size` por debajo de 500 px con Chrome headless.

## Siguiente incremento exacto

Terminar `P1.4` y `P1.5` en este orden:

1. Enlace recíproco de `links`: hoy se edita y se ve desde la pieza (visor y
   workbench); falta que la ficha de un insight/query/página/informe muestre qué
   piezas editoriales lo referencian. Requiere decidir dónde viven esas fichas (aún
   son en su mayoría datos sintéticos de `packages/contracts/src/mock.ts`) antes de
   construir la vista recíproca.
2. Añadir a `@seo/ui` las primitivas que faltan: `DecisionThread`, `InsightStack` y
   `ChartFrame` con valor actual, periodo anterior, interanual, objetivo, cobertura y
   alternativa tabular accesible. No son necesarias para que la curación del workbench
   funcione (ya funciona con los primitivos existentes); son para el sistema de
   decisiones de P4 y para enriquecer el propio detalle editorial más adelante.
3. Cubrir con pruebas los permisos: hoy el visor no puede escribir porque no importa
   ningún módulo de escritura (propiedad estructural, verificada manualmente esta
   sesión), pero no hay un test automatizado que lo aserte ni que pruebe el token de
   servicio. Añadir una prueba en `apps/viewer` que falle si alguna ruta bajo
   `app/editorial` o `app/api/v1/editorial` exporta algo distinto de `GET`.
4. Ejecutar Axe como herramienta externa sobre las nueve rutas del visor, el
   workbench y la nueva sección `/editorial` (el script propio ya cubre desbordamiento
   horizontal, contraste y objetivos táctiles, pero no sustituye a Axe).

Con eso, P1 debería quedar en condiciones de marcarse `complete` (revisar los
criterios de salida en `ROADMAP.md` antes de darlo por hecho).

## Verificaciones que deben seguir pasando

```bash
pnpm continuity:check
pnpm typecheck        # 8 paquetes
pnpm test             # 60 pruebas
pnpm build             # viewer + workbench
pnpm editorial:import # debe decir "Sin cambios" si no tocaste los snapshots V1
```

Accesibilidad medida en las nueve rutas del visor y en el workbench a 375 px (última
vez completa el 2026-09-02): cero fallos de contraste AA, cero textos por debajo de
12 px, cero objetivos por debajo de 24 px y cero desbordamiento horizontal. La nueva
sección `/editorial` del workbench se comprobó sin desbordamiento a 375 px, pero no
ha pasado el barrido completo de contraste/foco ni Axe.

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
  envío del formulario: causó el fallo real de esta sesión (año/mes se fijaban como
  curados en cualquier guardado). Usa `placeholder` o una pista en la etiqueta.

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

Después se trabaja la primera tarea pendiente de `P1.4`/`P1.5` de la lista de arriba.

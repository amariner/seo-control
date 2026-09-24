# SEO Dashboard V2

Plataforma híbrida para seguimiento SEO del grupo Porcelanosa. Esta primera entrega implementa el vertical del piloto **Porcelanosa + Noken** con datos sintéticos trazables y contratos preparados para sustituirlos por sincronizaciones reales.

## Aplicaciones

- `apps/viewer`: visor web corporativo, de solo lectura, con portfolio, capítulos de proyecto, insights, informes, acciones y estado de datos.
- `apps/workbench`: entorno local para crawls, importaciones, preparación editorial, revisión y publicación.
- `packages/contracts`: contratos Zod, taxonomías, cálculos, contrato editorial y dataset sintético del piloto.
- `packages/editorial`: normalización, importación idempotente y consultas del calendario editorial general.
- `packages/db`: esquema Drizzle PostgreSQL para Neon.
- `packages/sync`: orquestación idempotente de sincronizaciones y publicación firmada.
- `packages/ui`: sistema visual y componentes compartidos.

## Arranque local

```bash
pnpm install
cp .env.example apps/viewer/.env.local
pnpm dev
```

El visor se abre en `http://localhost:3000` y el workbench en `http://localhost:3001`. `DEV_AUTH_BYPASS=true` permite validar localmente sin Entra; el código rechaza ese bypass en producción.

## Calendario editorial

El primer vertical funcional cubre las ocho marcas del grupo con los datos reales
migrados del dashboard anterior.

```bash
pnpm editorial:import   # archiva los cuatro snapshots V1 y genera el dataset normalizado
```

La importación es idempotente: sin cambios en los ficheros de origen no reescribe nada.
Recuentos de control verificados: 39 eventos de calendario, 115 filas de backlog,
146 del plan histórico, 34 huecos y 68 propuestas, sin rechazos.

Rutas: `/editorial/calendario` (vista anual, mensual y agenda móvil),
`/editorial/backlog` y `/editorial/propuestas`. La ruta histórica
`/conjunto/plan-editorial` redirige a la canónica. El visor es de solo lectura;
la edición, la selección de propuestas y el vínculo evento-pieza viven en
`/editorial` del workbench (crear/editar pieza, programar, asignar owner/autor/
revisor y versionar cada cambio).

## Visión transversal del grupo

`/portfolio` es la lectura agregada de las ocho marcas, sustituta de `/conjunto`
de V1 (que redirige a ella con 308 conservando la query string). Combina dos
fuentes con cobertura deliberadamente distinta y lo declara en pantalla:

- **Analítica**: conector sintético del piloto (Porcelanosa + Noken) hasta que P3
  conecte GA4 y Search Console. Las otras seis marcas **no reciben cifras**: se
  muestran con el motivo escrito y la fase en que llegan. Cada agregado dice
  cuántas marcas lo sostienen.
- **Plan editorial**: dato real importado de V1, con las ocho marcas desde P1.

El estado de filtros (`brands`, `market`, `period`, `compare`) vive entero en la
query string y cada control es un enlace, así que la vista es compartible y
funciona sin JavaScript. `/api/v1/portfolio` acepta el mismo estado, de modo que
un enlace de pantalla y su payload describen el mismo corte.

## Principios de datos

- El navegador nunca llama directamente a GA4, GSC, SEMrush o proveedores GEO: consulta una API propia autenticada y optimizada.
- Las respuestas crudas se transforman en memoria y no se persisten.
- Las escrituras requieren identidad de servicio.
- Los crawls permanecen locales; solo se publica un paquete curado, versionado, limitado y firmado.
- Si falla una fuente se conserva el último snapshot válido y se muestra su antigüedad.

## Informes adicionales

Con el workbench en local, pedir un "informe adicional" (análisis puntual, csv
ad-hoc, cruce de datos) genera contenido en `informes-adicionales/`, que
**nunca se commitea**: ver [`informes-adicionales/README.md`](informes-adicionales/README.md)
para la convención completa.

## Calidad

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm migration:check                                   # inventario de migración V1 sincronizado y completo
pnpm reconcile:check                                   # muestras V1 medidas y sin desviaciones
pnpm ingest:dry-run                                    # 4 ciclos de ingesta sin duplicados, deriva ni huecos
pnpm screenshots --out docs/design/screenshots/after   # requiere el visor en marcha
```

`pnpm ingest:dry-run` ejecuta el plan de ingesta diaria `proyecto x fuente x día`
sobre lectores **declaradamente sintéticos** y sale con código 1 si aparece un
duplicado, una deriva o un hueco en la ventana de reprocesado. Acepta
`--cycles`, `--at=<ISO>` y `--fail-day=<YYYY-MM-DD>`, que degrada un día para
comprobar que su último snapshot válido sobrevive. Ninguna cifra que produzca es
dato real: GA4 y Search Console se conectan en P3.2 (D-030).

Las capturas por viewport se generan con el protocolo DevTools. Chrome headless fuerza
un ancho mínimo de ventana de 500 px, así que `--window-size` no sirve para 390 o 375 px:
usa siempre `pnpm screenshots`. Ver `docs/design/screenshots/README.md`.

Consulta [docs/implementation.md](./docs/implementation.md) para el mapa de arquitectura, el estado de cada integración y los pasos de despliegue.

## Continuar el desarrollo en otro chat

```bash
pnpm status
pnpm continuity:check
pnpm migration:check
pnpm reconcile:check
```

La fuente de verdad es `docs/continuity/PROJECT_STATE.json`; el punto exacto de
reanudación está en `plans/PROJECT_CONTINUATION.md` y las fases/criterios de salida en
`ROADMAP.md`. La matriz `docs/continuity/V1_PARITY.md` evita retirar capacidades del
dashboard original antes de demostrar su equivalencia, y
`docs/continuity/V1_MIGRATION_INVENTORY.md` —render de
`v1-migration-inventory.json`, regenerable con `pnpm migration:report`— dice qué se
hace con cada una de ellas y con qué tolerancia se acepta cada dataset migrado.

`docs/continuity/V1_RECONCILIATION.md` es la **ejecución** de esos acuerdos:
`pnpm reconcile` mide el disco de V1, hashea cada fuente y congela el resultado en
`v1-reconciliation-baseline.json`, de modo que `pnpm reconcile:check` detecta tanto
que la migración pierda filas como que la propia V1 cambie bajo los pies. Un dataset
con `baseline-frozen` **no es paridad alcanzada**: es la muestra medida antes de
migrarla, para que P3, P5, P6 y P8 comparen contra un número con hash en el
repositorio. La raíz de V1 se configura con `V1_ROOT` y el check funciona sin ella,
avisando de que no la ha reverificado.

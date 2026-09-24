# Reconciliación de muestras V1 -> V2

<!-- Generado por scripts/reconcile.mjs. No editar a mano: `pnpm reconcile:check` falla si divergen. -->

Última ejecución: 2026-09-04. Origen V1: `Desktop/Proyectos/seo-dashboard`.

Este documento es la ejecución de los contratos de reconciliación que P2.1 escribió
(`docs/continuity/v1-migration-inventory.json`). Cierra el primer criterio de `P2.4`
para todo lo que se puede medir hoy y deja explícito, dataset a dataset, lo que no.

Un `baseline congelado` **no es paridad**: es la muestra V1 medida y hasheada *antes* de
migrarla, para que P3, P5, P6 y P8 se validen contra un número registrado en el
repositorio en vez de contra una V1 que puede haber cambiado entre tanto.

## Resumen

| Estado | Datasets |
| --- | --- |
| **reconciliado** · los dos lados medidos y coincidentes | 1 |
| **baseline congelado** · lado V1 medido con hash; destino V2 pendiente | 4 |
| **bloqueado** · no hay artefacto que medir | 2 |
| **no comparable** · la fuente nunca salió del navegador | 1 |

Total: 8 datasets. El baseline vive en `docs/continuity/v1-reconciliation-baseline.json`.

## Cuatro snapshots editoriales V1

- **Contrato**: `editorial-snapshots` · fase destino `P1` · estado declarado en el inventario `reconciled`
- **Resultado**: **reconciliado** · los dos lados medidos y coincidentes
- **Ficheros V1 medidos**: 4

| Fichero | sha256 | Bytes |
| --- | --- | --- |
| `src/data/plan-editorial/calendario-2026.json` | `7255c673bdaee766…` | 6959 |
| `src/data/plan-editorial/conjunto-backlog.json` | `4b1edd3c9cf06163…` | 351895 |
| `src/data/plan-editorial/conjunto.json` | `673b29e593ff6f6a…` | 364534 |
| `src/data/plan-editorial/conjunto-propuestas.json` | `3c627a31d5c979b6…` | 37859 |

### Medidas del lado V1

| Medida | Valor |
| --- | --- |
| `calendarEvents` | 39 |
| `themeBlocks` | 6 |
| `backlog` | 115 |
| `plan` | 146 |
| `slots` | 34 |
| `proposals` | 68 |

### Medidas del lado V2

Fuente: `packages/editorial/data/normalized/editorial-dataset.json`.

| Medida | Valor |
| --- | --- |
| `calendarEvents` | 39 |
| `themeBlocks` | 6 |
| `backlog` | 115 |
| `plan` | 146 |
| `slots` | 34 |
| `proposals` | 68 |

Los cuatro ficheros de V1 coinciden en hash con los que archivó el importador, así que
la equivalencia no depende solo de que los recuentos cuadren.

## Series diarias de GA4 por proyecto y mercado

- **Contrato**: `ga4-daily` · fase destino `P3` · estado declarado en el inventario `pending`
- **Resultado**: **bloqueado** · no hay artefacto que medir
- **Por qué**: La fuente V1 es una consulta en vivo a la GA4 Data API, no un fichero. No hay nada que congelar hasta que P3 tenga credenciales y almacén propio; entonces la comparación es día a día con tolerancia relativa del 1%.

### Medidas del lado V1

_Sin medir en esta ejecución._

## Series diarias de Search Console por query y página

- **Contrato**: `gsc-daily` · fase destino `P3` · estado declarado en el inventario `pending`
- **Resultado**: **bloqueado** · no hay artefacto que medir
- **Por qué**: La fuente V1 es una consulta en vivo a la Search Console API. Igual que GA4: la reconciliación exacta de clics solo puede ejecutarse cuando P3 conecte la fuente y guarde la misma ventana con el mismo desfase de tres días.

### Medidas del lado V1

_Sin medir en esta ejecución._

## Caché de posiciones y volúmenes de SEMrush

- **Contrato**: `semrush-cache` · fase destino `P3` · estado declarado en el inventario `pending`
- **Resultado**: **baseline congelado** · lado V1 medido con hash; destino V2 pendiente
- **Ficheros V1 medidos**: 15

| Fichero | sha256 | Bytes |
| --- | --- | --- |
| `src/data/tracking-pilar/semrush-butech-en.json` | `b37317f1c67682dc…` | 841 |
| `src/data/tracking-pilar/semrush-butech-es.json` | `35b70c9667f07401…` | 11257 |
| `src/data/tracking-pilar/semrush-ecommerce-es.json` | `73c3cb8b41e73265…` | 396 |
| `src/data/tracking-pilar/semrush-ecommerce-fr.json` | `effefd3d9e583929…` | 1044 |
| `src/data/tracking-pilar/semrush-ecommerce-uk.json` | `f42476d5356baa9c…` | 5207 |
| `src/data/tracking-pilar/semrush-ecommerce-us.json` | `eb19759f02939a81…` | 1000 |
| `src/data/tracking-pilar/semrush-noken-de.json` | `339323765ea79b6e…` | 710 |
| `src/data/tracking-pilar/semrush-noken-es.json` | `14a70cfa54f6883c…` | 14267 |
| `src/data/tracking-pilar/semrush-noken-fr.json` | `de256521c527f993…` | 1471 |
| `src/data/tracking-pilar/semrush-noken-ru.json` | `bff0007787c61a0a…` | 1802 |
| `src/data/tracking-pilar/semrush-noken-uk.json` | `eaa4f22f2a7e962d…` | 1181 |
| `src/data/tracking-pilar/semrush-noken-us.json` | `8ae06f5826984e78…` | 992 |
| `src/data/tracking-pilar/semrush-porcelanosa-de.json` | `2cc9a4bd4353bae1…` | 262 |
| `src/data/tracking-pilar/semrush-porcelanosa-es.json` | `dacbc07d2d3fbcfa…` | 7623 |
| `src/data/tracking-pilar/semrush-porcelanosa-fr.json` | `cb2fc9bd3146aabc…` | 3932 |

### Medidas del lado V1

| Medida | Valor |
| --- | --- |
| `butech-en` | 5 |
| `butech-es` | 74 |
| `ecommerce-es` | 2 |
| `ecommerce-fr` | 6 |
| `ecommerce-uk` | 33 |
| `ecommerce-us` | 6 |
| `noken-de` | 4 |
| `noken-es` | 92 |
| `noken-fr` | 9 |
| `noken-ru` | 10 |
| `noken-uk` | 7 |
| `noken-us` | 6 |
| `porcelanosa-de` | 1 |
| `porcelanosa-es` | 48 |
| `porcelanosa-fr` | 25 |
| **total** | **328** |

_Sin lado V2 todavía: el destino de este dataset llega en `P3`._

## Snapshots históricos de crawl y sus issues

- **Contrato**: `crawl-snapshots` · fase destino `P5` · estado declarado en el inventario `pending`
- **Resultado**: **baseline congelado** · lado V1 medido con hash; destino V2 pendiente
- **Ficheros V1 medidos**: 6

| Fichero | sha256 | Bytes |
| --- | --- | --- |
| `src/data/audits/antic-colonial/history/2026-08-06_6ac4d506/summary.json` | `1a288ac593a38b09…` | 2396 |
| `src/data/audits/butech/history/2026-06-04_2e037c08/summary.json` | `3904f95533930afe…` | 2516 |
| `src/data/audits/ecommerce/history/2026-05-08_f615952e/summary.json` | `103eb4f95081bb36…` | 2210 |
| `src/data/audits/krion/history/2026-08-07_4d07e7fd/summary.json` | `ff7d58b69fdb1b9e…` | 3563 |
| `src/data/audits/noken/history/2026-05-14_32c63899/summary.json` | `35ddd80f74f5b84a…` | 3209 |
| `src/data/audits/noken/history/2026-05-14_e4143782/summary.json` | `e3835c4b3672cd0d…` | 2886 |

### Medidas del lado V1

| Medida | Valor |
| --- | --- |
| `antic-colonial/2026-08-06_6ac4d506` | 2395 |
| `butech/2026-06-04_2e037c08` | 2258 |
| `ecommerce/2026-05-08_f615952e` | 7055 |
| `krion/2026-08-07_4d07e7fd` | 4424 |
| `noken/2026-05-14_32c63899` | 916 |
| `noken/2026-05-14_e4143782` | 10471 |

_Sin lado V2 todavía: el destino de este dataset llega en `P5`._

## Snapshot de canibalización del conjunto

- **Contrato**: `canibalizaciones-snapshot` · fase destino `P6` · estado declarado en el inventario `pending`
- **Resultado**: **baseline congelado** · lado V1 medido con hash; destino V2 pendiente
- **Ficheros V1 medidos**: 2

| Fichero | sha256 | Bytes |
| --- | --- | --- |
| `src/data/canibalizaciones/conjunto.json` | `d780710f44b57ea6…` | 5455481 |
| `src/data/canibalizaciones/sites-overview.json` | `d522cd2c629d4dbb…` | 174544 |

### Medidas del lado V1

| Medida | Valor |
| --- | --- |
| `sitios` | 7 |
| `mercados` | 7 |
| `paresCanibalizacion` | 21 |
| `sites-overview.sitios` | 7 |
| `sites-overview.mercados` | 6 |
| `rango` | ? a ? |

_Sin lado V2 todavía: el destino de este dataset llega en `P6`._

## Inventario de prompts GEO

- **Contrato**: `prompts-geo-inventory` · fase destino `P8` · estado declarado en el inventario `pending`
- **Resultado**: **baseline congelado** · lado V1 medido con hash; destino V2 pendiente
- **Ficheros V1 medidos**: 1

| Fichero | sha256 | Bytes |
| --- | --- | --- |
| `src/data/prompts-geo.json` | `03104fb50d9275b2…` | 14474 |

### Medidas del lado V1

| Medida | Valor |
| --- | --- |
| `us` | 8 |
| `uk` | 6 |
| `fr` | 5 |
| `es` | 5 |
| **total** | **24** |

_Sin lado V2 todavía: el destino de este dataset llega en `P8`._

## Estado de tareas guardado en el navegador

- **Contrato**: `tasks-local-state` · fase destino `P4` · estado declarado en el inventario `not-comparable`
- **Resultado**: **no comparable** · la fuente nunca salió del navegador
- **Por qué**: El estado vivía en el localStorage del navegador de cada persona y no existe copia en servidor. El propio contrato lo declara `not-comparable`: en P4 las tareas se regeneran y se avisa de que el estado marcado en V1 no viaja.

### Medidas del lado V1

_Sin medir en esta ejecución._


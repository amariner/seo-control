# P2.4 · Preparación de la aceptación de paridad

Última actualización: 4 de septiembre de 2026 (preparado en P2.3; la ejecución es `P2.4`).

`P2.4` tiene tres criterios y **ninguno lo puede cerrar el equipo de desarrollo
en solitario**: dos exigen al responsable SEO y el tercero, su decisión. Este
documento es lo que sí corresponde al desarrollo: dejar la sesión preparada para
que no se improvise. No sustituye a la validación, la habilita.

Regla que gobierna la sesión entera:

> **Ninguna cifra analítica de V2 es real todavía.** Hoy se puede aceptar
> equivalencia de superficie, filtros, navegación, trazabilidad y explicabilidad.
> La reconciliación de datos llega con `P3`. Presentar lo sintético como aceptado
> sería exactamente el fallo que prohíbe el invariante de fase.

---

## 1. Procedimiento de reconciliación

Los ocho contratos viven en `docs/continuity/v1-migration-inventory.json` con
muestra, comparación, métricas, tolerancia motivada y salida ante desviación
(P2.1). Lo que faltaba era saber **qué bloquea cada uno**, porque «pendiente» se
estaba leyendo como «esperando credenciales», y eso solo es cierto en dos casos.

| Dataset | Estado | Qué lo bloquea de verdad | Entradas de V1 |
| --- | --- | --- | --- |
| `editorial-snapshots` | **reconciled** | Nada: cerrado en P1.2 sobre el universo completo, no una muestra. | En repositorio, con hash |
| `ga4-daily` | pending | **Credenciales + almacén de `P3`.** No hay forma de adelantarlo. | API, sin fichero |
| `gsc-daily` | pending | **Credenciales + almacén de `P3`.** Igual. | API, sin fichero |
| `semrush-cache` | pending | **La contraparte de V2 no existe:** llega con `P3.3`. Las entradas de V1 sí están en disco. | `src/data/tracking-pilar/semrush-{porcelanosa,noken}-{es,uk}.json` — comprobados presentes |
| `crawl-snapshots` | pending | **La contraparte de V2 no existe:** el importador vive en `P5`. | 26 ficheros en `src/data/audits/` |
| `canibalizaciones-snapshot` | pending | **La contraparte de V2 no existe:** llega con `P6`. | `src/data/canibalizaciones/sites-overview.json` — 7 sitios verificados |
| `prompts-geo-inventory` | pending | **La contraparte de V2 no existe:** llega con `P8`. | `src/data/prompts-geo.json` — 24 prompts (us 8, uk 6, fr 5, es 5) verificados |
| `tasks-local-state` | **not-comparable** | No existe copia: el estado vivía en el `localStorage` de cada navegador. No se reconcilia porque no se puede, y eso está decidido. | Ninguna |

**Consecuencia práctica que cambia la conversación:** de los seis `pending`, solo
dos dependen de credenciales. Los otros cuatro comparan contra ficheros estáticos
que están en el disco y cuyos recuentos ya se han verificado contra lo declarado
en el contrato. Se reconcilian el día que exista el lado de V2, sin pedir nada a
nadie. Eso convierte la reconciliación en una tarea de `P3`, `P5`, `P6` y `P8`, no
en una negociación de accesos.

### Cómo se ejecuta uno

1. Extraer la muestra que fija el contrato, tal cual: la ventana, los proyectos y
   los mercados están escritos, y cambiarlos invalida la comparación.
2. Extraer la misma muestra del lado de V2.
3. Comparar métrica a métrica contra su tolerancia. Las tolerancias tienen motivo
   escrito; si una molesta, se discute el motivo, no el número.
4. Si una métrica se sale, aplicar la salida declarada en `onMismatch`. No se
   ajusta la tolerancia para que pase: eso es falsificar la aceptación.
5. Registrar el resultado en el contrato (`status`) y regenerar el informe con
   `pnpm migration:report`.

Recordatorios de tolerancia que ya se decidieron y no conviene reabrir sin motivo:
los clics de GSC se exigen exactos y las impresiones admiten un 0,5% porque Google
las reprocesa; GA4 admite un 1% en sesiones y un 2% en usuarios por su recuento
aproximado, pero las conversiones son exactas; el CTR no se reconcilia por separado
porque es derivado; el *health score* del crawler se declara **no comparable**
porque V2 lo recalibra, así que se compara el inventario de issues —el dato— y no
la puntuación —la opinión—.

---

## 2. Guion de validación por flujo

El criterio dice «validar los flujos con el responsable, **no solo pantalla por
pantalla**». Un repaso de pantallas siempre sale bien: cada una se ve correcta por
separado. Lo que hay que probar es si el ciclo completo se sostiene sin perder
contexto.

Cada paso trae la pregunta que el responsable debe poder contestar **desde la
pantalla, en menos de un minuto**. Si necesita que alguien se lo explique, el paso
no está cumplido, aunque la pantalla exista.

### Flujo A · Detectar → explicar → decidir

| Paso | Ruta | Pregunta que debe poder contestar |
| --- | --- | --- |
| A1 | `/` | ¿Qué ha cambiado este periodo y cuánto importa? |
| A2 | `/portfolio` | ¿Qué marcas sostienen ese número y cuáles no están medidas? ¿Por qué no? |
| A3 | `/portfolio` (carril mercados) | ¿Dónde está la mayor caída y con cuántas marcas se sostiene? |
| A4 | `/insights` | ¿Qué evidencia sostiene la conclusión y cuál es su confianza y su causa? |
| A5 | `/actions` | ¿Quién asume la acción, para cuándo y con qué criterio de éxito? |
| A6 | `/cronologia` | ¿Qué pasó alrededor de esa fecha que pueda explicarlo? |

Punto de fallo a vigilar en A2: si el responsable interpreta las seis marcas sin
serie como «cero» en vez de «no medida», la declaración de cobertura no está
funcionando, por correcta que sea.

### Flujo B · Oportunidad → pieza → publicación

| Paso | Ruta | Pregunta |
| --- | --- | --- |
| B1 | `/editorial/propuestas` | ¿Qué hueco temático hay y qué alternativas se propusieron? |
| B2 | `/editorial/backlog` | ¿Cuál es la prioridad de esta pieza y por qué? (impacto ÷ esfuerzo, visible) |
| B3 | `/editorial` (workbench) | ¿Puedo elegir la propuesta, asignar autor y revisor y programarla? |
| B4 | `/editorial/calendario` | ¿Queda en el mes correcto, con su marca y su bloque temático? |
| B5 | ficha de la pieza | ¿Con qué insight, acción, query, URL o informe está vinculada? |
| B6 | `/insights` o `/actions` | ¿Se ve el vínculo **en la dirección contraria**? |

B6 es el paso que suele fallar en las migraciones y aquí está cubierto (D-015): la
reciprocidad se deriva del mismo array, no de un segundo almacén.

Límite honesto de este flujo: **el resultado medido de la pieza no existe todavía**
(ventanas de 28/90/180 días, `P3.5`). El recorrido llega hasta «publicada», no
hasta «funcionó».

### Flujo C · Informe y archivo

| Paso | Ruta | Pregunta |
| --- | --- | --- |
| C1 | `/reports` | ¿Encuentro el cierre de un mes concreto de hace un año? |
| C2 | `/reports?year=…` | ¿Los filtros me dejan compartir esta vista por enlace? |
| C3 | `/reports/report-2026-06` | ¿Qué se corrigió en la v2 y qué decía la v1? |
| C4 | `/reports#capitulos` | ¿Qué capítulos de mis dos informes de V1 existen ya y cuáles no? |
| C5 | CSV del informe | ¿La exportación dice la versión y su nota de cambio? |

C4 es **la tabla que hay que revisar de verdad**: 16 capítulos fusionados desde las
19 secciones reales de los dos informes de V1, cada uno con estado y fase. Es donde
el responsable puede decir «esto no me sirve sin el capítulo X» antes de que se dé
la paridad por buena.

### Flujo D · Herramientas locales

| Paso | Ruta | Pregunta |
| --- | --- | --- |
| D1 | `/herramientas` (workbench) | ¿Qué puedo ejecutar hoy en este equipo? |
| D2 | `/herramientas` | ¿Por qué no puedo lanzar un crawl y qué hace falta? |
| D3 | `/herramientas` | ¿Se ha perdido alguna utilidad de V1 sin que nadie lo decidiera? |

D3 es el criterio de salida real de este flujo: si el responsable encuentra algo
que usaba y no está en el catálogo, el catálogo está incompleto y `P2` no cierra.

### Flujo E · Rutas antiguas

| Paso | Ruta de V1 | Comportamiento esperado |
| --- | --- | --- |
| E1 | `/conjunto/plan-editorial` | 308 a `/editorial/calendario`, con la query intacta |
| E2 | `/conjunto` | 308 a `/portfolio` |
| E3 | `/tracking/pilar-contenidos` | 308 a `/editorial/backlog` **y aviso** de qué falta y en qué fase |
| E4 | `/insights/llm` | 308 a `/insights` **y aviso** equivalente |

---

## 3. Qué se registra al terminar

1. Resultado por flujo: cumplido, cumplido con reserva (con la reserva escrita) o
   no cumplido.
2. Toda capacidad que el responsable eche en falta y no esté catalogada: entra en
   el inventario con su clasificación, o `P2` no cierra.
3. La decisión sobre las dos retiradas propuestas
   (`/api/cita-tienda-flow.json`, `/api/cita-tienda-es.json`), que sigue abierta.
4. Actualización de `docs/continuity/V1_PARITY.md`, del inventario y de
   `PROJECT_STATE.json` con lo acordado, no con lo esperado.

## 4. Criterios de salida de P2, tal como están escritos

- No existe ninguna capacidad crítica de V1 en estado `unknown` o `missing`.
- Todo elemento retirado tiene decisión aprobada y camino de sustitución.
- Calendario, histórico, informes y herramientas prioritarias tienen equivalencia
  probada.

Estado a fecha de hoy, sin suavizarlo:

- **Primer criterio: no se cumple según su propia letra.** No queda ninguna ruta en
  `unknown`, pero **cuatro siguen en `missing`**: `/tracking/autoridad-tematica`
  (P6), `/tracking/prompts-geo` (P8), `/canales/sem` (P6) y
  `/conjunto/canibalizaciones` (P6). Todas tienen fase de destino declarada y
  motivo, pero el criterio no dice «con fase declarada»: dice que ninguna
  capacidad **crítica** puede estar en `missing`. Así que la pregunta que hay que
  hacer explícitamente al responsable es si esas cuatro son críticas. Si lo son,
  `P2` no puede cerrar y su alcance se amplía; si no lo son, hay que registrarlo
  como decisión con su nombre y su fecha, no darlo por supuesto. El desarrollo no
  puede decidirlo: es una valoración de negocio.
- **Segundo criterio: no se cumple.** Las dos retiradas siguen en `proposed`.
- **Tercer criterio: es lo que valida el guion de la sección 2.** Calendario e
  informes tienen equivalencia probada; el histórico está publicado; de las
  herramientas prioritarias, el crawler está bloqueado por disco y su equivalencia
  se demuestra en `P5`.

Ninguno de los tres se resuelve escribiendo más código, y por eso `P2.3` es el
último incremento que el desarrollo podía cerrar por su cuenta.

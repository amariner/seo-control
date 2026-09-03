# SEO Dashboard V2 — roadmap vivo de desarrollo

Última actualización: 3 de septiembre de 2026.

## Norte de producto

SEO Intelligence debe ser la plataforma que mejor convierta el dato SEO de un
grupo multimarca en decisiones comprensibles, justificadas y medibles. El éxito no
se mide por el número de gráficas, sino por cerrar este ciclo sin perder contexto:

> Detectar -> Explicar -> Priorizar -> Decidir -> Ejecutar -> Medir -> Aprender

Cada conclusión importante debe permitir responder en menos de un minuto:

1. ¿Qué ha cambiado y cuánto importa?
2. ¿Qué evidencia y calidad de datos lo sostienen?
3. ¿Conocemos la causa o solo tenemos una hipótesis?
4. ¿Qué decisión se recomienda, quién la asume y para cuándo?
5. ¿Cómo y cuándo sabremos si funcionó?

El benchmark que fundamenta la estrategia está en
[`docs/research/SECTOR_BENCHMARK.md`](docs/research/SECTOR_BENCHMARK.md).

## Cómo se usa este roadmap

- Solo una fase puede estar activa.
- Las fases se ejecutan en verticales demostrables; una sesión no equivale
  necesariamente a una fase.
- `docs/continuity/PROJECT_STATE.json` indica fase y siguiente acción exacta.
- `plans/PROJECT_CONTINUATION.md` contiene el checkpoint operativo del siguiente chat.
- Los identificadores `P<n>.<n>` son estables. Se marcan al completarse, no al iniciarse.
- No se elimina una capacidad de V1 hasta validar su equivalencia en
  `docs/continuity/V1_PARITY.md`.
- Si aparece una necesidad urgente, se registra y prioriza dentro de la fase activa;
  no se abren fases paralelas salvo corrección crítica de seguridad o pérdida de datos.
- El protocolo completo de apertura y cierre vive en `AGENTS.md`.

Estados válidos: `ready`, `active`, `blocked`, `complete`. Los porcentajes son el
resultado de criterios terminados, nunca una estimación subjetiva.

## Mapa de fases

| Fase | Resultado demostrable | Estado |
| --- | --- | --- |
| P0 | Fundación ejecutable y continuidad entre chats | **complete** |
| P1 | Sistema visual compartido + calendario editorial general | **complete** |
| P2 | Paridad crítica verificada con SEO Dashboard V1 | **active** |
| P3 | Datos reales fiables para Porcelanosa + Noken | planned |
| P4 | Sistema operativo de decisiones y acciones | planned |
| P5 | Inteligencia técnica, monitorización y prevención | planned |
| P6 | Demanda, contenido, competencia y enlazado editorial | planned |
| P7 | Informes ejecutivos, aprobación y exportaciones | planned |
| P8 | GEO/AEO y visibilidad en asistentes | planned |
| P9 | Impacto, forecast y experimentación | planned |
| P10 | Seguridad empresarial, rendimiento y despliegue cloud | planned |
| P11 | Piloto aceptado, expansión y retirada controlada de V1 | planned |
| P12 | Diferenciación sectorial y automatización controlada | planned |

## P0 · Fundación ejecutable y continuidad

Estado: **complete**.

Resultado: monorepo `pnpm`/Turborepo, visor Next.js de solo lectura, workbench local,
contratos Zod, datos sintéticos identificados, DuckDB/Parquet, Drizzle/PostgreSQL,
Auth.js, APIs, sincronización base, exportación y suite inicial de pruebas.

- [x] Aplicaciones viewer y workbench compilables.
- [x] Paquetes `contracts`, `db`, `local-data`, `sync` y `ui`.
- [x] Modelo relacional y migraciones iniciales.
- [x] Seguridad base y separación lectura/escritura.
- [x] Datos sintéticos para validar navegación y contratos.
- [x] Protocolo persistente de estado, checkpoint, decisiones, log y roadmap.

## P1 · Sistema de diseño y calendario editorial general

Estado: **complete** (2026-09-03). P1.1 a P1.5 completadas: 30 de los 32
criterios se cumplen dentro de la fase y los dos restantes —las ventanas de
28/90/180 días y el recorrido completo oportunidad -> resultado— se trasladan a
`P3.5` como dependencia explícita de datos reales, porque no se pueden cerrar sin
ellos (D-017). Lo que P1 sí debía entregar de esos dos criterios está hecho: el
contrato modela las tres ventanas y la interfaz muestra su estado pendiente sin
inventar cifras.

Objetivo: aplicar una identidad visual propia, accesible y consistente mientras se
recupera cuanto antes la herramienta operativa más importante de V1. El calendario
cubre Porcelanosa, Noken, Ecommerce, Butech, Antic Colonial, Krion, XTONE y Gamadecor
desde el primer vertical, aunque el piloto de métricas reales siga limitado a dos.

### P1.1 · Fundaciones visuales compartidas

- [x] Crear tokens, tipografía, espaciado, foco y estilos de impresión en `@seo/ui`.
- [x] Crear tema ECharts compartido y retirar paletas hardcodeadas.
- [x] Separar `Surface`, `DataPanel`, `Overlay` y elevación con significado.
- [x] Capturar el estado previo en 1440, 1024, 390 y 375 px. Los `before` de 390
  y 375 px no son fieles: ver `docs/design/screenshots/README.md`.
- [x] Migrar viewer y workbench sin duplicar variables.

### P1.2 · Contrato editorial y migración V1

- [x] Modelar plan, evento, bloque temático, propuesta, backlog, estado y resultado.
- [x] Añadir proyecto, mercado, idioma, intención, cluster, objetivo, hipótesis,
  impacto, esfuerzo, owner, autor/revisor, dependencias, baseline y KPI de éxito.
- [x] Importar y validar `conjunto.json`, `calendario-2026.json`,
  `conjunto-backlog.json` y `conjunto-propuestas.json` sin pérdida silenciosa:
  39 eventos, 115 filas de backlog, 146 filas de plan, 34 huecos y 68 propuestas.
- [x] Hacer la importación idempotente, versionada y con informe de rechazos.
- [x] Conservar el dato original como procedencia, no como payload público.

### P1.3 · Calendario y agenda

- [x] Publicar ruta canónica `/editorial/calendario`.
- [x] Mantener `/conjunto/plan-editorial` como alias o redirección compatible.
- [x] Vista anual y mensual, filtros persistentes de marca, mercado, idioma, estado,
  tipo y bloques temáticos. La intención llega con la curación: V1 no la trae.
- [x] Detalle lateral con evidencia, brief, dependencias, acción y criterio de éxito.
- [x] Agenda específica en móvil; navegación completa con teclado.
- [x] Estados de carga, vacío, error, parcialidad y último snapshot válido.

### P1.4 · Backlog, propuestas y medición editorial

- [x] Bandejas de backlog y propuestas publicadas en solo lectura con
  procedencia y avisos. Prioridad explicable (`editorialPiecePriority`, impacto
  ÷ esfuerzo) calculada y mostrada en visor y workbench una vez curados.
- [x] Flujo propuesta -> brief -> revisión -> publicación sin mezclar permisos del visor:
  el workbench crea y edita piezas (`/editorial` en `@seo/workbench`), programa,
  mueve de mes, asigna owner/autor/revisor y versiona cada cambio; ninguna
  escritura pasa por el visor.
- [x] Ventanas de 28, 90 y 180 días modeladas en el contrato y visibles como
  pendientes. Rellenarlas con medición real es `P3.5` (D-017): dentro de P1 no
  existe la fuente que las alimenta.
- [x] Enlace bidireccional entre insight, pieza, acción y resultado: `links` se
  edita en el workbench, es navegable desde el detalle de la pieza y cada ficha
  de insight, acción, query, página e informe muestra qué piezas la referencian.
  La reciprocidad se deriva del mismo array (`buildBacklinkIndex`), no se
  duplica (D-015). `cluster` y `result` se muestran sin ficha propia hasta
  P6/P9. Se publica `/queries/[id]`, que antes era un enlace roto.
- [x] El workbench edita y publica; el visor solo consulta. La curación vive en
  `packages/editorial/data/curation/editorial-curation.json` (D-012), separada
  del dataset importado de V1 y fusionada en lectura (`applyCuration`); P3
  sustituye este fichero por PostgreSQL sin cambiar la firma de lectura.

### P1.5 · Shell ejecutivo y QA visual

- [x] Cabecera de 65 px, menú móvil real y filtros sticky.
- [x] `MetricStrip`, `DataPanel`, `StatusBadge`, `EvidenceLink`, tabla densa,
  `DecisionThread`, `InsightStack`, `ChartFrame` y `DataTablePanel` entregados en
  `@seo/ui` y en uso real: `InsightStack` y `ChartFrame` en portada y ficha de
  proyecto, `DecisionThread` como índice del informe, `DataTablePanel` en las
  nueve tablas densas. `ChartFrame` incluye la alternativa tabular accesible
  junto al gráfico, no en otra página.
- [x] No ocultar objetivo, interanual o cobertura en móvil.
- [x] Contraste AA, foco visible, Escape, reduced motion y cero overflow de
  documento, verificados por script propio en las rutas del visor y en el
  workbench. Axe (`axe-core` 4.13.0, `pnpm axe`) ejecutado como herramienta
  externa sobre 36 combinaciones ruta × viewport de las dos apps: 0
  incumplimientos WCAG 2.1 A/AA y 0 avisos de buenas prácticas
  (`docs/design/axe-report.json`). Encontró y se corrigieron cuatro defectos
  reales que el script propio no cubría (D-016).
- [x] Pruebas de contratos, recuentos, alias, fechas, hashes, orden, filtros,
  CSV, curación (versionado, fusión, creación de piezas), reciprocidad de
  enlaces, permisos y ruta compatible (85 en total). Los permisos ya tienen
  cobertura automatizada por las dos partes: `apps/viewer/lib/permissions.test.ts`
  falla si el visor exporta un método de escritura, declara un Server Action o
  importa un módulo de escritura, y comprueba el token de servicio;
  `apps/workbench/lib/permissions.test.ts` fija que la escritura solo pasa por
  `app/editorial/actions.ts`.

#### Criterios de salida P1

- [x] El calendario general de las ocho marcas funciona de extremo a extremo con datos V1.
- [x] La ruta histórica sigue llegando al contenido correcto.
- [x] Cada pieza mantiene procedencia y se cura de extremo a extremo en el
  workbench (P1.4), con el vínculo insight/acción/query/página/informe recíproco
  en las dos direcciones (D-015). Cerrar el recorrido con el **resultado medido**
  es `P3.5` (D-017).
- [x] Viewer y workbench comparten un solo sistema visual y de gráficos.
- [x] El flujo crítico funciona a 1440 x 900, 1024 x 768, 390 x 844 y 375 px.
- [x] Typecheck, unitarias, accesibilidad y build de producción pasan.

Leyenda: `[x]` cumplido y verificado, `[~]` entregado en parte con el resto acotado.

## P2 · Paridad crítica con SEO Dashboard V1

Estado: **active** (0%). Primera tarea pendiente: `P2.1`.

Objetivo: conservar el valor operativo de V1 antes de ampliar el producto. La matriz
detallada y sus evidencias viven en `docs/continuity/V1_PARITY.md`.

### P2.1 · Inventario y contratos de migración

- [ ] Catalogar rutas, fuentes, transformaciones, filtros, exportaciones y dependencias.
- [ ] Clasificar cada capacidad como `retain`, `redesign`, `merge`, `defer` o `retire`.
- [ ] Definir reconciliación y tolerancia para cada dataset migrado.

### P2.2 · Portada y visión transversal

- [ ] Portada agregada Conjunto y selector de las ocho marcas.
- [ ] Comparativa temporal, mercados, objetivos, cobertura y explicaciones ejecutivas.
- [ ] Preservar enlaces profundos y estado compartible de filtros.

### P2.3 · Capacidades operativas V1

- [ ] Informes y archivo histórico.
- [ ] Planes de acción, seguimiento de iniciativas y cronología.
- [ ] Herramientas/importadores locales que sigan aportando valor.
- [ ] Navegación compatible o redirecciones documentadas.

### P2.4 · Aceptación de paridad

- [ ] Reconciliar muestras de V1 y V2 con tolerancia documentada.
- [ ] Validar los flujos con el responsable SEO, no solo pantalla por pantalla.
- [ ] Registrar explícitamente cualquier retirada, motivo y alternativa.

#### Criterios de salida P2

- No existe ninguna capacidad crítica de V1 en estado `unknown` o `missing`.
- Todo elemento retirado tiene decisión aprobada y camino de sustitución.
- Calendario, histórico, informes y herramientas prioritarias tienen equivalencia probada.

## P3 · Plataforma de datos reales del piloto

Objetivo: sustituir progresivamente adaptadores sintéticos por datos propios, estables,
reconciliados y consultables con baja latencia para Porcelanosa + Noken.

### P3.1 · Repositorio cloud y contratos

- [ ] Neon PostgreSQL Frankfurt, migraciones, índices, partición lógica y pooling.
- [ ] Repository adapter común para sintético/local/cloud sin bifurcar la UI.
- [ ] Catálogo de métricas, fuentes, zonas horarias, moneda y periodos.

### P3.2 · GA4 y GSC diarios

- [ ] OAuth/identidades de servicio y secretos fuera del navegador.
- [ ] Jobs `proyecto x fuente`, D-3, reprocesado de siete días e idempotencia.
- [ ] Agregados de 24 meses, segmentación de marca/intención/página y buscador interno.
- [ ] Reconciliación <=1 %, cobertura, corte, lag y último snapshot válido.

### P3.3 · SEMrush, CrUX y PageSpeed

- [ ] Ranking estable, descubrimientos, competidores, SOV y features SERP semanales.
- [ ] CrUX de campo y PageSpeed sobre muestras versionadas de templates.
- [ ] Cuotas, reintentos, locks, datos parciales y observabilidad por `SyncRun`.

### P3.4 · Rendimiento de consulta

- [ ] Agregados/materializaciones para los seis KPIs y vistas más consultadas.
- [ ] Cache privada con invalidación por snapshot.
- [ ] Filtros calientes por debajo de 200 ms en el piloto.

### P3.5 · Medición editorial heredada de P1 (D-017)

Criterios que P1 modeló pero no pudo cerrar por falta de fuente real. No se
reinterpretan: se cumplen aquí con el mismo alcance con que se escribieron.

- [ ] Rellenar las ventanas de 28, 90 y 180 días de cada pieza editorial con
  medición real, conservando cobertura, corte y confianza. El contrato
  (`editorialMeasurementSchema`) y la presentación del pendiente ya existen
  desde P1.2/P1.4; aquí solo entra el dato.
- [ ] Cerrar el recorrido oportunidad -> pieza -> acción -> **resultado medido**
  usando la reciprocidad de `links` entregada en P1.4 (D-015), sin añadir un
  segundo almacén de la relación.
- [ ] Sustituir `packages/editorial/data/curation/editorial-curation.json` por
  PostgreSQL sin cambiar la firma de lectura `getEffectiveEditorialDataset()`
  (previsto desde D-012).

#### Criterios de salida P3

- Los tres criterios de `P3.5` heredados de P1 quedan cerrados con dato real.
- Porcelanosa y Noken muestran 24 meses de datos reales reconciliados.
- Ningún secreto o respuesta cruda llega al cliente o al repositorio público.
- Un fallo conserva el último snapshot válido y hace visible su antigüedad.
- Cuatro ciclos de sincronización de prueba terminan sin duplicados ni deriva.

## P4 · Sistema operativo de decisiones

Objetivo: unificar señal, explicación, prioridad, decisión, ejecución y aprendizaje.

- [ ] Bandeja única de señales, riesgos, oportunidades, insights y anomalías de calidad.
- [ ] Detección con materialidad, volumen y persistencia; excepción crítica explícita.
- [ ] Insight con evidencia, segmento, causa/hipótesis, confianza y justificación.
- [ ] Recomendación con impacto x confianza / esfuerzo, urgencia y dependencias.
- [ ] Acción con responsable, fecha, estado, SLA, criterio de éxito y resultado.
- [ ] Selección humana de máximo cinco conclusiones ejecutivas.
- [ ] Árboles de contribución y explicación del movimiento de cada KPI agregado.
- [ ] Fichas URL, query, contenido e incidencia con relaciones e histórico.
- [ ] Búsqueda cruzada y drill-down que conserva proyecto/mercado/periodo.

#### Criterios de salida P4

- Todo insight publicado es reproducible desde sus evidencias.
- El gerente puede identificar estado, cambio, explicación y próxima acción en un minuto.
- Una acción cerrada conserva baseline, resultado y aprendizaje reutilizable.

## P5 · Inteligencia técnica, monitorización y prevención

Objetivo: priorizar problemas por riesgo y valor, explicar cambios y evitar regresiones.

- [ ] Publicación firmada de crawls locales y reconciliación exacta del paquete aprobado.
- [ ] Indexabilidad, HTTP, redirects, canonical, robots, sitemap y URL Inspection curada.
- [ ] Matriz hreflang, reciprocidad, `x-default`, indexabilidad y cobertura por template.
- [ ] Roturas, profundidad, huérfanas, hubs, PageRank interno y rutas estratégicas.
- [ ] CrUX/PageSpeed, Schema y accesibilidad por template.
- [ ] Historial y diff de HTML crudo/renderizado/texto y elementos SEO críticos.
- [ ] Alertas con persistencia, owner, SLA, anotación de release y causa probable.
- [ ] Quality gates CI/CD en modo aviso; bloqueo solo tras validar falsos positivos.
- [ ] Logs de Googlebot y bots IA cuando se habilite la extensión.

#### Criterios de salida P5

- La prioridad técnica combina severidad, alcance, demanda, template, persistencia y esfuerzo.
- Cada regresión puede relacionarse con un snapshot o release conocido.
- Los crawls de 50.000 URLs solo se habilitan con >=50 GiB libres y preflight aprobado.

## P6 · Demanda, contenido, competencia y operación editorial

Objetivo: decidir qué crear, actualizar, consolidar o retirar y medir su resultado.

- [ ] Segmentos reutilizables por marca, intención, página, mercado, dispositivo y cluster.
- [ ] Curva CTR propia y oportunidad cuantificada por posición/segmento.
- [ ] Inventario sitemap/CMS, pilares, clusters, cobertura, gaps y lifecycle del contenido.
- [ ] Decay, quick wins y canibalización multiseñal explicable.
- [ ] Set de keywords estable y descubrimientos separados.
- [ ] Competidores por proyecto/mercado, SOV, gaps, solapamiento y features SERP.
- [ ] Resultado de cada publicación/actualización a 28, 90 y 180 días en el calendario.
- [ ] Paid Search solo como contexto de sinergia, solapamiento y ahorro potencial.

#### Criterios de salida P6

- Toda recomendación editorial abre su evidencia, propuesta y posición en calendario.
- Toda publicación madura muestra baseline, objetivo, resultado e interpretación.
- Las oportunidades se pueden reproducir aplicando los mismos filtros y versión de datos.

## P7 · Informes ejecutivos y gobierno editorial

Objetivo: crear, revisar, aprobar, publicar y exportar una narrativa inmutable y trazable.

- [ ] Editor Tiptap por bloques: texto, KPI, gráfico, tabla, evidencia, insight, acción y método.
- [ ] Plantillas mensual ejecutiva, trimestral profunda y especial.
- [ ] Índice/decision thread fijo, lectura web y estilos A4 del mismo design system.
- [ ] Azure OpenAI UE propone borradores solo sobre datos depurados.
- [ ] Autor y revisor diferentes; preview privada y GitHub Environment.
- [ ] Versiones inmutables, fe de erratas y promoción del mismo artefacto aprobado.
- [ ] PDF/CSV al vuelo con usuario, fecha, versión y confidencialidad.

#### Criterios de salida P7

- Un cierre mensual completo recorre borrador -> revisión -> aprobación -> publicación.
- Web y PDF contienen las mismas cifras, versión y procedencia.
- La IA nunca publica directamente ni introduce datos sin evidencia.

## P8 · GEO/AEO y visibilidad en asistentes

Objetivo: medir presencia, fuentes y negocio procedente de respuestas generativas sin
mezclar observación con inferencias no verificadas.

- [ ] 30 prompts versionados por proyecto y mercado Tier 1.
- [ ] ChatGPT, Gemini, Copilot y Perplexity; AI Overview como feature de Google.
- [ ] Share de citación, mención/posición, sentimiento básico, competidores y fuentes.
- [ ] Evidencia con fecha, mercado, asistente y versión/modelo cuando exista.
- [ ] Landings, engagement y macro/microconversiones de referrals IA.
- [ ] Cambios de respuesta, hipótesis de causa y conexión con contenido/calendario.

#### Criterios de salida P8

- Cuatro ejecuciones semanales estables permiten comparar sin cambiar el set en silencio.
- Las conclusiones distinguen presencia observada de causalidad o impacto estimado.

## P9 · Impacto, forecast y experimentación

Objetivo: dejar de confundir correlación con resultado y construir aprendizaje acumulativo.

- [ ] Anotaciones de publicación, migración, release, campaña, incidencia y medición.
- [ ] Baseline y before/after con ventanas y estacionalidad explícitas.
- [ ] Controles o series comparables cuando metodológicamente proceda.
- [ ] Forecast conservador con intervalos y supresión por histórico insuficiente.
- [ ] Escenarios base/conservador/ambicioso con supuestos visibles.
- [ ] Registro de hipótesis, experimento, resultado, confianza y aprendizaje.
- [ ] Atribución de contribución, no promesas falsas de causalidad.

#### Criterios de salida P9

- Cada forecast muestra intervalo, supuestos, fecha y error histórico disponible.
- Cada experimento terminado registra si valida, invalida o deja inconclusa la hipótesis.
- La priorización puede aprender de impacto y esfuerzo reales anteriores.

## P10 · Seguridad empresarial, rendimiento y despliegue

Objetivo: operar para cinco usuarios corporativos con acceso mínimo, datos UE y una
experiencia rápida aun con ocho proyectos y 24 meses.

- [ ] Entra ID single-tenant, cuentas asignadas y sesiones de ocho horas.
- [ ] Key Vault UE mediante OIDC, rotación y ausencia de secretos persistentes en CI.
- [ ] Neon y Vercel Frankfurt; decisión contractual documentada o fallback Azure UE.
- [ ] Auditoría de accesos/descargas 90 días en Azure UE.
- [ ] CSP, HSTS, `frame-ancestors`, CSRF, cookies seguras, `noindex` y source maps auditados.
- [ ] R2 UE solo como transporte temporal cifrado y con expiración.
- [ ] LCP <1,5 s, interacción caliente <200 ms y tablas virtualizadas.
- [ ] WCAG 2.2 AA, pruebas E2E de sesión, endpoint, exportación y filtros manipulados.
- [ ] Teams para críticas y digest semanal por email.

#### Criterios de salida P10

- Pruebas de acceso no asignado, sesión expirada y endpoint directo pasan.
- No aparecen PII, secretos ni datos SEO en bundles/source maps públicos.
- Rendimiento y accesibilidad cumplen presupuestos con el volumen objetivo.

## P11 · Piloto, expansión y retirada de V1

Objetivo: obtener aceptación real y ampliar sin degradar contratos o comprensión.

### P11.1 · Piloto Porcelanosa + Noken

- [ ] ES, UK, US, FR y DE; backfill agregado validado de 24 meses.
- [ ] Cuatro publicaciones semanales, cierre mensual e informe trimestral histórico.
- [ ] Validación conjunta de responsable SEO y gerente.

### P11.2 · Expansión por oleadas

- [ ] Ecommerce + Butech.
- [ ] Antic Colonial + Krion.
- [ ] XTONE + Gamadecor.
- [ ] Observabilidad de coste, cuota, latencia y calidad por nueva marca.

### P11.3 · Retirada controlada V1

- [ ] Congelación local de tres meses con inventario y exportación verificable.
- [ ] Confirmación de paridad y ausencia de consumidores ocultos.
- [ ] Revocación de credenciales y archivo definitivo recuperable.

#### Criterios de salida P11

- Datos, conclusiones, jobs, rendimiento, accesibilidad y exportaciones están aceptados.
- Cada oleada pasa la misma reconciliación antes de activar la siguiente.
- V1 solo se retira tras firma de paridad y periodo de convivencia.

## P12 · Diferenciación sectorial y automatización controlada

Objetivo: superar la mera paridad mediante un sistema acumulativo de conocimiento y
acción, sin automatizar decisiones antes de poder auditarlas.

- [ ] Knowledge graph SEO: proyecto, mercado, query, URL, contenido, incidencia,
  evidencia, decisión, acción, release y resultado.
- [ ] Portfolios estratégicos configurables y explorador multidimensional.
- [ ] Árboles de contribución y detección de causa raíz asistida.
- [ ] Aprendizaje cruzado entre marcas con separación clara de contexto.
- [ ] Copiloto ejecutivo que solo responda con permisos, evidencia y enlaces reproducibles.
- [ ] API/MCP de inteligencia con el mismo control de acceso y auditoría que el visor.
- [ ] Generación aprobada de brief/ticket desde una recomendación.
- [ ] Activaciones técnicas reversibles únicamente con preview, aprobación, experimento,
  auditoría y rollback probado.

#### Criterios de salida P12

- La plataforma recomienda usando resultados históricos propios, no solo reglas genéricas.
- Toda acción automática puede explicarse, aprobarse, detenerse y revertirse.
- Las capacidades diferenciales demuestran reducción de tiempo de decisión o mejora
  medible, no solo una demo tecnológica.

## Bloqueos y puertas de decisión

| Puerta | Condición para cruzarla |
| --- | --- |
| Crawls grandes | >=50 GiB libres, preflight y ruta de recuperación validados. |
| Cloud piloto | Presupuesto, contratos de residencia y credenciales aprobados. |
| Datos reales en UI | Reconciliación, cobertura y etiquetado de procedencia aprobados. |
| Narrativa IA | Azure OpenAI UE, datos depurados, revisión humana y auditoría. |
| Bloqueo en CI | Periodo en modo aviso con tasa de falsos positivos aceptable. |
| Automatización web | Preview, aprobación, rollback y atribución experimental funcionando. |
| Retirada V1 | Paridad firmada, convivencia de tres meses y credenciales inventariadas. |
| Aprobación/versionado | ~~Inicializar o vincular Git~~ Cruzada 2026-09-03 (D-013): repositorio en `https://github.com/amariner/seo-control`. Falta CI, previews y GitHub Environments (P7). |

## Métricas de producto

- Tiempo del gerente hasta identificar estado, cambio, explicación y acción: <60 s.
- Porcentaje de insights publicados con evidencia reproducible: 100 %.
- Porcentaje de acciones cerradas con criterio de éxito y medición: 100 %.
- Frescura, cobertura y reconciliación dentro de SLA por fuente/proyecto.
- Uso del calendario: piezas con owner, objetivo y ventana de medición completos.
- Tiempo SEO desde señal hasta decisión y desde publicación hasta aprendizaje.
- Falsos positivos, recomendaciones descartadas y error de forecast visibles.
- Accesibilidad, LCP, interacción y tasa de error como métricas de producto.

## Regla de reanudación

Cuando el usuario diga «vamos a seguir con el desarrollo de este proyecto», se
ejecuta `pnpm status`, se abre el checkpoint y se implementa el primer criterio
incompleto de la fase activa. Al cerrar, se actualizan estado, roadmap, paridad,
decisiones y log para que el siguiente chat reanude exactamente desde ahí.

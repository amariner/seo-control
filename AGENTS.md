# SEO Dashboard V2 — protocolo de desarrollo continuo

Estas reglas se aplican a todo el repositorio. Las instrucciones más cercanas de cada aplicación complementan este archivo, pero no sustituyen el protocolo de continuidad.

## Activador de continuidad

Cuando el usuario diga «vamos a seguir con el desarrollo de este proyecto», «continúa con SEO Dashboard» o una frase equivalente:

1. No vuelvas a diseñar el roadmap desde cero.
2. Lee, en este orden:
   - `docs/continuity/PROJECT_STATE.json` — fuente de verdad del estado.
   - `plans/PROJECT_CONTINUATION.md` — checkpoint operativo.
   - `ROADMAP.md` — secuencia y criterios de salida.
   - `docs/continuity/V1_PARITY.md` — deuda de paridad.
   - `docs/continuity/DECISIONS.md` — decisiones vigentes.
   - `docs/design/DESIGN_SYSTEM.md` — contrato visual.
   - las últimas entradas de `docs/continuity/SESSION_LOG.md`.
3. Ejecuta `pnpm status` y revisa el estado del worktree antes de editar.
4. Continúa la primera tarea incompleta de la fase activa, salvo que el usuario cambie explícitamente la prioridad.
5. Entrega un vertical funcional y verificable; no avances varias fases dejando esqueletos vacíos.

## Activador de informes adicionales

Cuando el usuario diga «informe adicional», «saca un informe», «necesito un informe extra», «saca un csv con…» o equivalente, mientras el workbench está levantado en local:

1. Es trabajo puntual, fuera del flujo regular del producto: no lo mezcles con `packages/editorial/data/`, con las rutas del visor ni con el dataset normalizado.
2. Sigue la convención de `informes-adicionales/README.md`: subcarpeta `<proyecto>/<YYYY-MM-DD>-<tema-corto>/` con un `README.md` propio (fuente, periodo, pregunta de negocio, ficheros) y los outputs junto a él.
3. Indica siempre si el dato usado es real (dataset editorial, APIs locales) o sintético (`SyntheticConnector` mientras P3 no conecte GA4/GSC/SEMrush reales) — nunca lo mezcles sin decirlo.
4. Esta carpeta **nunca se commitea** (`.gitignore` la excluye salvo el README de la convención). No la incluyas en un `git add`/commit aunque el usuario esté en medio de una sesión de subir cambios al repositorio.

## Activador de sincronización del plan editorial (D-067)

- «Trae los cambios de preview», «sincroniza antes de trabajar» o equivalente: ejecuta
  `pnpm editorial:pull` (primero con `-- --dry-run` si hay dudas) y resume qué entró, qué se
  descartó y por qué. Es el paso obligado antes de editar el plan en el workbench.
- «Sincroniza con preview», «sube el plan» o equivalente: revisa el diff de
  `packages/editorial/data/curation/editorial-curation.json` y de la medición
  (`packages/editorial/data/measurement/`, D-079), confirma con el usuario, haz commit
  y `vercel deploy --prod`. «Mide las publicaciones»: `pnpm editorial:measure` o el botón del
  plan del workbench. Al visor solo llegan el dataset y la curación: nunca informes
  adicionales ni datos intermedios.

## Activador de crawls (D-070)

- «Lanza un crawl de <proyecto>»: `pnpm crawl -- --project <slug> [--max N]` (necesita red; hasta
  1.000 URL sin preflight de 50 GiB), en segundo plano; el avance y el resultado URL a URL se ven en
  `/crawls` del workbench, que ya no lanza crawls (D-071). Resume incidencias al terminar.
- «Publica el crawl de <proyecto>»: `pnpm crawl:publish -- --project <slug> [--run <id>]` y, si el
  usuario lo confirma, commit y despliegue. Al visor solo va el resumen acotado, nunca el crawl.

## Activador de informes (D-076)

- «Regenera los informes de <periodo>» / «congela el <trimestre> de <marca>»: botón en `/informes`
  del workbench o `pnpm report:generate -- --project <slug> --period <2026-Q2|2026-08>`. Solo datos
  reales (GA4/GSC con las credenciales de `apps/workbench/.env.local`); si una fuente falla, no se
  congela.
- «Sube los informes» / «sincroniza los informes con preview»: revisa el diff de
  `packages/reports/data/published/` (índice `reports.json` y `snapshots/`), resume qué cambia por
  informe, confirma con el usuario, haz commit y `vercel deploy --prod`. Nunca incluyas
  `informes-adicionales/` ni datos de prueba.
- «Haz el informe adicional <proyecto>/<fecha-tema>»: completa la solicitud creada desde
  `/informes/adicionales` siguiendo el activador de informes adicionales.

## Prioridades permanentes

1. Decisiones trazables para gerente y equipo SEO.
2. Paridad funcional con la V1 sin copiar su deuda técnica.
3. Calendario editorial general y su sistema de decisiones como primer vertical.
4. Aplicación consistente del diseño editorial-mineral derivado de Glosa, conservando la identidad SEO Intelligence/Porcelanosa.
5. Seguridad, residencia UE, accesibilidad, rendimiento y calidad de datos.

## Reglas de fase

- Solo existe una fase activa.
- Una fase pasa a `complete` únicamente cuando cumple todos sus criterios de salida en `ROADMAP.md`.
- Una pantalla con datos ficticios debe indicarlo. Nunca presentes un adaptador sintético como integración real.
- Todo dato o conclusión debe mostrar procedencia, corte, cobertura y confianza cuando corresponda.
- El navegador consulta la API propia; nunca conecta directamente con proveedores SEO.
- El workbench es el único entorno de edición, crawl, IA editorial y publicación.
- El visor permanece de solo lectura.
- El calendario general cubre las ocho marcas aunque el piloto analítico inicial sea Porcelanosa + Noken.
- Conserva compatibilidad o redirección desde rutas V1 críticas, especialmente `/conjunto/plan-editorial`.

## Cierre obligatorio de cada sesión

Antes de finalizar una sesión de desarrollo:

1. Ejecuta las verificaciones proporcionales al cambio; como mínimo `pnpm typecheck` y las pruebas afectadas.
2. Actualiza `docs/continuity/PROJECT_STATE.json` con fase, siguiente acción, validación y bloqueos.
3. Actualiza `plans/PROJECT_CONTINUATION.md` con lo completado y el punto exacto de reanudación.
4. Marca criterios en `ROADMAP.md` y paridad en `docs/continuity/V1_PARITY.md` cuando corresponda.
5. Registra decisiones nuevas en `docs/continuity/DECISIONS.md`.
6. Añade una entrada breve a `docs/continuity/SESSION_LOG.md`.
7. No borres ni reescribas trabajo del usuario o de otra sesión.

El objetivo de estos pasos es que el siguiente chat pueda continuar sin depender del historial conversacional.

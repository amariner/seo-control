# Implementación y ruta a producción

## Vertical funcional actual

La aplicación funciona de extremo a extremo con un repositorio sintético que respeta los mismos contratos que PostgreSQL. Esto permite revisar navegación, densidad de información, lenguaje ejecutivo, filtros y estados de calidad antes de contratar servicios cloud.

La frontera de datos es `DashboardRepository`: las pantallas y rutas no conocen el origen. En fase cloud se activa el adaptador Drizzle/Neon mediante `DATABASE_URL`, sin cambiar la interfaz del producto.

## Despliegue previsto

1. Crear Neon en Frankfurt y aplicar `packages/db`.
2. Crear la aplicación Entra single-tenant, asignar los cinco usuarios y rellenar las variables `AUTH_*`.
3. Guardar secretos de proveedores en Azure Key Vault UE y usar OIDC desde Vercel.
4. Desplegar `apps/viewer` y los jobs fragmentados en Vercel Pro, región Frankfurt.
5. Mantener `apps/workbench` local y publicar paquetes mediante la identidad de servicio.
6. Activar Azure Monitor y conservar accesos/descargas durante 90 días.

## Guardas obligatorias

- `DEV_AUTH_BYPASS` está prohibido en producción.
- Las rutas `/api/v1/*` pasan por sesión, salvo los endpoints de servicio que validan token y firma.
- El paquete local se valida con Zod, allowlists, límite de 500 filas por segmento y rechazo de PII.
- Los informes publicados son inmutables; las correcciones crean nueva versión y errata.
- No se envían secretos, datos SEO o parámetros sensibles al navegador ni a source maps.

## Integraciones pendientes de credenciales

Los conectores reales de GA4, GSC, SEMrush, GEO, CrUX/PageSpeed, R2, Key Vault, Azure OpenAI y Monitor están expresados como puertos en `packages/sync`. La entrega incluye el orquestador, validación, idempotencia, reintentos lógicos y último snapshot válido; activar cada adaptador requiere credenciales y presupuesto de fase 2.

## Qué está operativo

- Portada ejecutiva, capítulos de proyecto, fichas de URL e incidencia, insights, informes, acciones, búsqueda cruzada y API v1.
- Filtros compartibles para proyecto, mercado y periodo.
- ECharts con alternativa tabular accesible.
- Workbench ligado a `127.0.0.1`, preflight real de 50 GiB, crawler limitado y editor Tiptap.
- DuckDB real con exportación Parquet ZSTD comprobada.
- 37 tablas PostgreSQL y migraciones Drizzle reproducibles.
- PDF y CSV personalizados, no cacheables.
- Programación Vercel diaria y semanal en Frankfurt.

## Flujo correcto de consumo

El navegador no se conecta directamente a GA4, GSC, SEMrush ni a los asistentes. Hacerlo expondría secretos, multiplicaría cuotas, aumentaría latencia y devolvería datos sin reconciliar a cada usuario.

Los jobs de servidor normalizan una vez por fuente y proyecto, PostgreSQL conserva agregados y detalle curado, y el visor consulta una API propia autenticada. Así se reduce el procesamiento cotidiano del iMac; los crawls pesados y la preparación editorial permanecen en el workbench.

## Bloqueo detectado en este equipo

El preflight medido durante la implementación encontró **7,3 GiB libres**. El workbench bloquea nuevos crawls hasta alcanzar 50 GiB. No se ha eliminado ni movido ningún archivo para resolverlo.

# Seguridad

## Secretos y acceso

- No se aceptan secretos en el repositorio, bundles del navegador, parámetros de URL o source maps.
- En producción, las credenciales se obtendrán desde Azure Key Vault mediante OIDC.
- `DEV_AUTH_BYPASS` solo funciona cuando `NODE_ENV` no es `production`.
- Entra ID es single-tenant y la allowlist usa Object IDs, no dominios de email.
- La sesión máxima es de ocho horas.
- Las lecturas pasan por `proxy.ts`; cada mutación de servicio valida además su bearer token.

## Publicación

- Máximo 500 filas curadas.
- Checksum SHA-256 obligatorio.
- Firma verificada cuando existe `PUBLISHING_PUBLIC_KEY`.
- Campos con apariencia de PII, secretos o datos crudos se rechazan.
- No existe override desde el visor.

## Antes de producción

Deben completarse pruebas de usuario no asignado, sesión expirada, endpoint directo, filtros manipulados, exportación sin sesión y búsqueda de secretos o datos en bundles públicos.

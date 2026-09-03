# Definición de terminado

Una tarea puede marcarse terminada cuando:

- resuelve un caso de uso real y no solo crea una carpeta o placeholder;
- usa contratos validados y distingue datos sintéticos de reales;
- incluye estados vacío, carga, error, cobertura parcial y último snapshot válido cuando aplican;
- funciona con teclado y mantiene foco visible;
- no produce overflow horizontal a 375/390 px;
- conserva trazabilidad de fuente, fecha, segmento y transformación;
- añade pruebas proporcionales al riesgo;
- no filtra PII, secretos ni datos crudos;
- `pnpm typecheck` y las pruebas afectadas pasan;
- el checkpoint, estado y registro de sesión reflejan el nuevo punto de reanudación.

Una fase puede marcarse terminada únicamente cuando, además, cumple todos los criterios de salida indicados en `ROADMAP.md` y ofrece una URL o flujo demostrable de extremo a extremo.

# Capturas de referencia por viewport

Se conservan dos conjuntos para la QA visual de P1:

- `before/`: estado anterior al sistema de diseño compartido (2 de septiembre de 2026).
- `after/`: estado con tokens de `@seo/ui`, calendario editorial y correcciones de
  accesibilidad. Regenerado el 3 de septiembre de 2026 con las primitivas de P1.5
  (`InsightStack`, `ChartFrame`, `DecisionThread`, `DataTablePanel`) y las rutas
  añadidas en P1.4 (`report-detail`, `page-detail`, `query-detail`, `actions`):
  13 rutas × 4 viewports, sin desbordamiento horizontal en ninguna.

Viewports objetivo: 1440x900, 1024x768, 390x844 y 375x812.

## Cómo se generan

```bash
pnpm dev:viewer          # el servidor debe estar en marcha
pnpm screenshots --out docs/design/screenshots/after
```

El script `scripts/capture-screenshots.mjs` usa el protocolo DevTools y
`Emulation.setDeviceMetricsOverride`, y verifica `innerWidth` antes de capturar.
También informa de cualquier desbordamiento horizontal del documento.

## Limitación conocida del conjunto `before`

Chrome headless impone un ancho mínimo de ventana de **500 px**, así que
`--window-size=390,844` renderiza a 500 px y recorta la imagen. Las capturas
`before` de 390 y 375 px se obtuvieron así antes de detectarlo: muestran texto
cortado que no corresponde al comportamiento real del layout anterior. Los
`before` de 1440 y 1024 px sí son fieles.

Por tanto:

- La comparación antes/después es válida a 1440 y 1024 px.
- A 390 y 375 px solo el conjunto `after` es fiable. El estado anterior ya no se
  puede volver a capturar porque la hoja de estilos fue sustituida.
- Cualquier captura futura debe usar `pnpm screenshots`, nunca `--window-size`
  por debajo de 500 px.

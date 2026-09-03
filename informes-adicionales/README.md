# Informes adicionales

Carpeta para análisis, consultas y exports puntuales que **no forman parte del
flujo regular del producto** (calendario editorial, informes ejecutivos de
P7, dashboards del visor...) pero que el usuario pide como trabajo extra
mientras tiene el workbench levantado en local: cruces puntuales sobre los
datos accesibles desde este proyecto, listados con métricas, auditorías
ad-hoc, comparativas, etc.

Este directorio es la versión V2 de la misma convención que ya existía en el
proyecto original (`seo-dashboard/informes-adicionales/`), adaptada a las ocho
marcas del grupo y con una política de versionado más simple: aquí **nada se
commitea nunca**, ni siquiera como histórico.

## Cuándo guardar aquí

El usuario activa esta carpeta con la frase **"informe adicional"** (o
variantes: "saca un informe", "necesito un informe extra", "saca un csv
con...", "hazme una consulta sobre..."). Cuando aparezca este tipo de
petición, con el workbench corriendo en local:

1. **No dejar el output en la raíz del proyecto** ni mezclado con el código.
   Redirigir cualquier CSV/TXT/HTML/MD generado a la subcarpeta correspondiente.
2. **Crear la subcarpeta dedicada** siguiendo la convención de abajo.
3. **Añadir un `README.md`** dentro explicando qué es, cuándo se generó, con
   qué fuentes y para qué decisión — plantilla más abajo.

## Convención de carpetas

```
informes-adicionales/
└── <proyecto>/                            # porcelanosa, noken, ecommerce, butech,
    │                                       # antic-colonial, krion, xtone, gamadecor,
    │                                       # o "conjunto" si cruza varias marcas
    └── <YYYY-MM-DD>-<tema-corto>/         # fecha de generación + tema en kebab-case
        ├── README.md                     # contexto del informe (obligatorio)
        ├── *.csv / *.txt / *.md / *.html # outputs
        └── (script ad-hoc, si aplica — ver más abajo)
```

- **Proyecto** = slug de marca tal como lo usa `@seo/contracts`
  (`EDITORIAL_BRANDS`), o `conjunto` para análisis que cruzan varias.
- **Fecha** = `YYYY-MM-DD` del momento en que se genera (no del periodo de datos).
- **Tema corto** en kebab-case, descriptivo pero breve (`ctr-branded-vs-generico`,
  `huecos-sin-propuesta-q4`...).
- Si el usuario re-genera el mismo informe en otra fecha, **crea una carpeta
  nueva con la fecha nueva** — no sobrescribir uno anterior.

## Qué debe contener el README de cada informe

Plantilla mínima:

```markdown
# <Título descriptivo>

**Fecha generación**: YYYY-MM-DD
**Proyecto**: porcelanosa (o "conjunto")
**Periodo de datos**: si aplica
**Fuente(s)**: dataset editorial (@seo/editorial), API del workbench, GA4/GSC/SEMrush
  cuando estén conectados (P3), etc. — indica siempre si el dato es real o sintético.
**Cómo se generó**: comando, consulta o petición exacta (para poder reproducirlo)

## Pregunta de negocio
<para qué se pidió el informe, qué decisión se quería tomar>

## Ficheros
- `archivo1.csv` — columnas y qué representan
- `archivo2.md` — descripción
```

## Fuentes de datos disponibles hoy

- **Dataset editorial real**, importado de V1 y curado en el workbench
  (`@seo/editorial`, `packages/editorial/data/`): calendario, backlog, plan
  histórico, propuestas, briefs completos, procedencia.
- **APIs locales del workbench y del visor** (`/api/v1/editorial/*`, etc.).
- **GA4 / GSC / SEMrush / GEO**: hoy sirven datos **sintéticos**
  (`SyntheticConnector`) hasta que P3 conecte credenciales reales. Cualquier
  informe que use estas fuentes debe decir explícitamente si el dato es
  sintético o real — nunca presentar uno como el otro (invariante del proyecto,
  ver `AGENTS.md`).
- Cuando P3 conecte credenciales reales, esas mismas rutas empezarán a servir
  datos reales sin que cambie esta convención.

## Scripts ad-hoc

A diferencia de `/scripts` en la raíz (reservado para herramientas del propio
repo: `project-status.mjs`, `continuity-check.mjs`, `capture-screenshots.mjs`),
un script de un solo uso escrito para generar un informe concreto puede vivir
**dentro de la carpeta de ese informe** (p. ej. `query.mjs` junto al `README.md`
y los outputs), ya que no está pensado para reutilizarse. Si un script resulta
útil de forma recurrente, se promueve a `/scripts` o a un paquete propio.

## Qué NO va aquí

- Datos o salidas del flujo regular del producto (dataset editorial normalizado,
  builds, exportaciones oficiales) → siguen en su sitio habitual
  (`packages/editorial/data/`, `apps/*/app/api/...`).
- Snapshots de crawl del workbench → tienen su propio sitio
  (`packages/local-data`, bloqueados hoy por el preflight de disco).

## Versionado

**Nada dentro de `informes-adicionales/*/` se commitea nunca** (`.gitignore`
excluye toda la carpeta salvo este `README.md`). Es intencionado: estos
informes pueden mezclar cifras de cliente, credenciales de consulta o datos
todavía sin depurar, y viven solo en el equipo local donde se generaron. Si
algún informe necesita compartirse o conservarse como histórico del producto,
se traslada — depurado — al lugar que corresponda (p. ej. un informe ejecutivo
real de P7), no se fuerza su entrada en el repositorio.

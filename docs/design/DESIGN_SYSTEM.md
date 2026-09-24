# SEO Intelligence Design System

## Status and scope

Status: **implemented in P1; data-first refinement approved and extended across viewer and workbench in D-041 (2026-09-23)**.

Reference reviewed: `/Users/es00500546/Desktop/Proyectos/logic2b-note/src/themes/glosa/design.md`.
Its own status is pending review; this V2 contract, not the reference file, governs implementation.

This contract adapts the visual architecture described in the external `Glosa`
reference. That document is design input only. Its brand, logo, copy, product
positioning and instruction to imitate another site are explicitly out of scope.
SEO Intelligence keeps its own identity and uses the reference's useful visual
principles: mineral paper, black ink, one cobalt product accent, restrained depth,
editorial hierarchy and functional data-dense surfaces.

The product's distinctive visual idea is the **decision thread**:

> data -> evidence -> conclusion -> action -> measured result

It must be useful navigation and provenance, never decoration.

## Product principles

1. Executive clarity before analytical density.
2. Evidence and data quality remain visible wherever a conclusion is shown.
3. Cobalt identifies interaction, selection, provenance and the primary series.
4. Green, amber and red are semantic states, never brand decoration.
5. Hierarchy comes from spacing, typography and hairlines before cards or shadows.
6. Viewer, workbench, charts and print consume one shared token source in `@seo/ui`.
7. Essential comparisons are rearranged on small screens, never silently removed.

## Shared tokens

```css
:root {
  --ds-canvas: #ffffff;
  --ds-surface: #f5f4f0;
  --ds-surface-subtle: #eeece7;
  --ds-surface-raised: #ffffff;

  --ds-ink: #101516;
  --ds-text: #46504e;
  --ds-muted: #5f6a67;
  --ds-line: #dcdedb;
  --ds-line-strong: #c7cbc7;

  --ds-accent: #3157ff;
  --ds-accent-hover: #2445dc;
  --ds-accent-soft: #e9edff;

  --ds-positive: #176044;
  --ds-positive-soft: #e7f1ec;
  --ds-warning: #805600;
  --ds-warning-soft: #fff3d8;
  --ds-danger: #8b3030;
  --ds-danger-soft: #fbe9e7;

  --ds-radius-xs: 4px;
  --ds-radius-sm: 5px;
  --ds-radius-md: 10px;
  --ds-radius-lg: 12px;

  --ds-readable: 1088px;
  --ds-data: 1440px;
  --ds-header-height: 65px;

  --ds-space-1: 4px;
  --ds-space-2: 8px;
  --ds-space-3: 12px;
  --ds-space-4: 16px;
  --ds-space-6: 24px;
  --ds-space-8: 32px;
  --ds-space-12: 48px;
  --ds-space-16: 64px;
  --ds-space-24: 96px;

  --ds-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --ds-duration-fast: 180ms;
  --ds-duration-context: 500ms;
  --ds-shadow-overlay: 0 26px 90px rgb(16 21 22 / 16%);
  --ds-shadow-product: 0 12px 36px rgb(16 21 22 / 8%);
}
```

`--ds-muted` is intentionally darker than the reference value so normal text can
meet WCAG AA contrast. The value was verified against every surface token, not
only white: `#5f6a67` reaches 5.61:1 on `--ds-canvas`, 5.10:1 on `--ds-surface`
and 4.75:1 on `--ds-surface-subtle`. The earlier `#68726f` passed on white but
failed at 4.21:1 on `--ds-surface-subtle`, which the calendar chips use.

## Typography

- Titles, product UI, tables and controls: `Inter`, `ui-sans-serif`,
  `system-ui`, sans-serif. Use concise headings and restrained weights.
- The serif token is retained for the corporate mark and compatibility only.
- Do not fetch external webfonts. This protects privacy and first render.
- Use tabular numerals for metrics.
- Minimum metadata size is 12/16; tables and controls use at least 14/21.

| Role         | Size / line height |
| ------------ | ------------------ |
| Display      | 48 / 54            |
| Page H1      | 36 / 44            |
| H2           | 22 / 30            |
| H3           | 18 / 24            |
| Body         | 15 / 24            |
| UI and table | 14 / 21            |
| Metadata     | 12 / 16            |

The serif never appears in filters, badges, operational tables or the workbench.

## Layout

- `data-shell`: up to 1440 px for dashboards, matrices, calendar and workbench.
- `reading-shell`: up to 1088 px for reports, methodology and explanations.
- Twelve-column grid with 16-24 px gaps.
- Editorial headers use 64-96 px vertical space; dense product areas use 32-48 px.
- Alternate white canvas and mineral bands without wrapping every section in a card.
- The six portfolio KPIs remain visible before the first scroll at 1440 x 900.

## Component contract

| Component           | Purpose and visual rule                                                                |
| ------------------- | -------------------------------------------------------------------------------------- |
| `BrandMark`         | Original SEO Intelligence identity; never copies the reference mark.                   |
| `SectionHeader`     | Cobalt marker, index, title and optional method/action column.                         |
| `MetricStrip`       | Six KPIs separated by hairlines, not six floating cards.                               |
| `DecisionThread`    | Sticky vertical provenance/navigation rail; horizontal on mobile.                      |
| `InsightStack`      | Numbered editorial list with evidence, confidence and action.                          |
| `PriorityPanel`     | Ink surface with one cobalt action; semantic red remains available for critical state. |
| `DataPanel`         | White or mineral surface with border and no default shadow.                            |
| `ChartFrame`        | Current value, previous period, YoY, target, coverage and accessible table.            |
| `DataTable`         | Sticky header, optional sticky first column, density control and tabular numerals.     |
| `DataTablePanel`    | Scroll container for a dense table: named region, keyboard reachable.                  |
| `StatusBadge`       | Semantic colour plus text or icon; colour alone never conveys meaning.                 |
| `EvidenceLink`      | Compact provenance link marked in cobalt.                                              |
| `ReportIndex`       | Fixed report navigation connected by the decision thread.                              |
| `EditorialCalendar` | Mineral month grid; cobalt selection; semantic status markers; agenda on mobile.       |
| `WorkbenchPipeline` | One continuous five-stage flow instead of unrelated cards.                             |
| `EditorSurface`     | One of the few elevated surfaces because it is the active artefact.                    |

## Charts

- Current series: cobalt.
- Previous/YoY comparison: graphite, dashed where appropriate.
- Historical band: very light cobalt.
- Positive/warning/danger colours only represent their real semantic meaning.
- ECharts receives a shared theme derived from `@seo/ui`; no page-level hardcoded palettes.
- Every chart has a keyboard-reachable data-table alternative.

## Responsive and accessibility

- Below 1440 px: compact navigation and fewer simultaneous columns.
- 768 px: real accessible menu with a target of at least 40 px; filters move to a
  second row; filters wrap on small phones.
- 640 px: KPIs use two columns; reports and insights use one; tables scroll or expose
  an intentional summary view.
- 390/375 px: the calendar becomes an agenda and the decision thread becomes horizontal.
- Do not hide YoY, targets or material context; stack or disclose them.
- Respect reduced motion and visible focus.
- Validate 1440 x 900, 1024 x 768, 390 x 844 and 375 px with no horizontal document overflow.

## Migration sequence

1. Shared tokens, typography, focus and print foundations.
2. Primitives and the ECharts theme.
3. Shell, mobile navigation, persistent filters and decision thread.
4. Editorial calendar and agenda.
5. Executive portfolio.
6. Projects, insights and reports.
7. Workbench and structured editor.
8. Visual regression, Axe, keyboard, contrast, PDF and performance QA.

## P1 acceptance criteria

- Viewer and workbench import the same tokens from `@seo/ui`.
- No primary brand green remains; status colours retain semantic roles.
- No essential UI text is smaller than 12 px.
- Interactive targets are at least 40 px where space permits.
- Calendar has desktop month and mobile agenda presentations.
- Essential comparisons remain available at every supported viewport.
- The product passes automated accessibility checks and a manual keyboard journey.
  Met on 2026-09-03: `pnpm axe` (axe-core 4.13.0) reports 0 WCAG 2.1 A/AA
  violations and 0 best-practice warnings across 36 route x viewport
  combinations of both apps; see `docs/design/axe-report.json`. The in-house
  script still covers what Axe does not: real document width per viewport,
  contrast, minimum text size and touch targets.
- Reference screenshots exist for all four target viewports before P1 is closed.
  Met on 2026-09-03: 13 routes x 4 viewports in `docs/design/screenshots/after`,
  regenerated after the P1.5 primitives landed.

## Xtone data view · D-040 (2026-09-23)

User-approved direction for `/projects/xtone`: clear, minimal, spacious,
data-focused. This view uses a sans-serif H1, four primary metrics, one main
interactive trend, and dedicated exploration tabs. Automated conclusions and
recommendations are omitted. Provenance and measurement caveats remain.
Existing shared tokens govern colours, focus, surfaces and type families.
Tables support search, numeric sorting and selectable pagination; horizontal
scroll stays inside a labelled keyboard-accessible region. Tested widths:
1440, 1024, 768, 390 and 375 px. This was initially scoped to Xtone; D-041 promotes it to the whole product.

## Shared data-first UI · D-041 (2026-09-23)

- Apply the approved Xtone approach across the viewer and workbench: sans-serif
  headings, short labels, generous spacing and factual summaries.
- `BrandReportView` is shared by every brand with a real analytical report.
  Migration is a conditional tab. Brands without a connection retain an honest
  coverage view with links to their editorial plan.
- Remove generated conclusions from analytical summaries. Archived reports and
  editorial evidence remain available on demand in their dedicated views.
- `@seo/ui/data-table` owns the TanStack table, styling and raw-value sorting.
  Search, 10/25/50/100 rows, pagination, empty states, print and direct record
  anchors work consistently across both apps. No external provider calls occur
  in the client. URL-filtered editorial lists preserve their CSV semantics.
- Match KPI layout to the number of available metrics; do not leave empty slots.
- Mobile editorial filters are disclosed on demand; search stays visible.
  Tablet navigation collapses below 1440 px. Table overflow belongs to its region.
- ECharts remains the visualization library, with the shared mineral/cobalt
  theme and tabular alternatives. No new visualization framework is introduced.


## Report loading · D-042 (2026-09-24)

- Keep report headings and navigation stable while filters load. A shared live
  status identifies the pending selection; skeletons replace affected values.
- Reuse `@seo/ui/skeleton` and the existing tokens. Preserve each zone's height,
  show skeletons after 160 ms, and mention slower updates after 6 seconds.
- Mark pending regions busy, conceal stale data from assistive technology and
  make old controls inert. Animate only without a reduced-motion preference.
- Leave market-independent data visible on market changes. Global markets
  still depend on dates; migration always has its own fixed scope.
- Reflect pending filters immediately and preserve edits in an open calendar.
  Printing uses the last applied report and matching labels.


## Main navigation feedback · D-043 (2026-09-24)

Use native Next Link pending state for the main viewer menu. Replace the link
icon with a spinner without changing its width, show an indeterminate top
line and announce the destination in a fixed, unobtrusive status. Mobile
navigation closes on selection and restores focus to the menu trigger.
Respect reduced motion, preserve prefetch and normal link interactions, and
remove feedback on completion. Never display invented progress percentages.

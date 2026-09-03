import Link from "next/link";
import type { DashboardPayload } from "@seo/contracts";
import { Badge, Card, MetricStrip } from "@seo/ui";
import { ArrowRight, CircleAlert, Flag, Sparkles } from "lucide-react";
import { AppShell } from "./app-shell";
import { TrendChart } from "./trend-chart";

const categoryTone = { resultado: "good", riesgo: "bad", oportunidad: "info", diagnostico: "neutral", calidad: "warn" } as const;
const attentionTone = { estable: "good", observar: "warn", actuar: "bad" } as const;

export function Dashboard({ data }: { data: DashboardPayload }) {
  return (
    <AppShell generatedAt={data.generatedAt}>
      <main className="page" id="contenido">
        <header className="page-heading">
          <div><p className="eyebrow">Visión ejecutiva · Piloto</p><h1>Estado orgánico del grupo</h1><p className="lede">Qué ha cambiado, por qué importa y dónde actuar. Porcelanosa y Noken, con mercados Tier 1 y fuentes conciliadas.</p></div>
          <div className="date-context"><strong>03–30 agosto 2026</strong><br />Periodo anterior + interanual<br />Datos sintéticos de validación</div>
        </header>

        <section aria-labelledby="kpis"><div className="section-heading"><div><p className="eyebrow">01 · Pulso</p><h2 id="kpis">Seis indicadores esenciales</h2></div><Link className="section-link" href="/data">Metodología y cobertura →</Link></div><MetricStrip metrics={data.metrics} /></section>

        <section className="section" aria-labelledby="conclusiones">
          <div className="section-heading"><div><p className="eyebrow">02 · Lectura</p><h2 id="conclusiones">Conclusiones que requieren atención</h2><p>Selección humana sobre candidatos priorizados por impacto, urgencia y confianza.</p></div><Link className="section-link" href="/insights">Ver todas las conclusiones →</Link></div>
          <div className="executive-layout">
            <Card className="insight-list">{data.executiveInsights.map((insight, index) => <article className="insight-row" key={insight.id}><span className="insight-number">{String(index + 1).padStart(2, "0")}</span><div><div className="insight-title"><h3>{insight.title}</h3><Badge tone={categoryTone[insight.category]}>{insight.category}</Badge><Badge tone={insight.confidence === "alta" ? "good" : "warn"}>confianza {insight.confidence}</Badge></div><p>{insight.executiveSummary}</p></div><Link className="insight-link" href={`/insights#${insight.id}`} aria-label={`Abrir ${insight.title}`}><ArrowRight size={17} /></Link></article>)}</Card>
            <Card className="attention-card"><CircleAlert size={20} /><p className="eyebrow" style={{ color: "rgba(255,255,255,.7)", marginTop: 17 }}>Prioridad del periodo</p><h2>Resolver indexabilidad en Francia</h2><p>Riesgo demostrado · Porcelanosa</p><div className="attention-item"><small>Impacto observado</small><strong>83.420 impresiones y 146 colecciones afectadas</strong></div><div className="attention-item"><small>Próxima acción</small><strong>Unificar canonical y sitemap antes del 11 sep.</strong></div><div className="attention-item"><small>Criterio de éxito</small><strong>Menos de 5 URLs afectadas en crawl y muestra GSC</strong></div></Card>
          </div>
        </section>

        <section className="section analytics-grid">
          <Card className="chart-card"><div className="section-heading"><div><p className="eyebrow">Tendencia</p><h3>Sesiones orgánicas diarias</h3></div><div className="chart-legend"><span><i className="legend-dot" />Actual</span><span><i className="legend-dot legend-dot-dash" />Interanual</span></div></div><TrendChart points={data.series.organic_sessions ?? []} annotations={data.annotations} /></Card>
          <Card className="geo-card"><Sparkles size={18} aria-hidden /><p className="eyebrow" style={{ marginTop: 15 }}>GEO · 1.500 ejecuciones</p><h3>Presencia en asistentes</h3><div className="geo-score"><strong>{data.geo.citationShare.toLocaleString("es-ES")}%</strong><span>share de citación<br />+{(data.geo.citationShare - data.geo.previousCitationShare).toFixed(1)} pp</span></div><div className="progress"><span style={{ width: `${data.geo.citationShare}%` }} /></div><div className="mini-stats"><div className="mini-stat"><small>Prompts citados</small><strong>{data.geo.citedPrompts}/{data.geo.totalPrompts}</strong></div><div className="mini-stat"><small>Asistente líder</small><strong>{data.geo.leadingAssistant}</strong></div><div className="mini-stat"><small>Sesiones IA</small><strong>{data.geo.aiSessions.toLocaleString("es-ES")}</strong></div><div className="mini-stat"><small>Conversiones</small><strong>{data.geo.aiConversions}</strong></div></div></Card>
        </section>

        <section className="section" aria-labelledby="proyectos"><div className="section-heading"><div><p className="eyebrow">03 · Foco</p><h2 id="proyectos">Matriz de atención por proyecto</h2><p>No es un ranking de marcas: ordena riesgos y oportunidades accionables.</p></div><Link className="section-link" href="/projects">Abrir proyectos →</Link></div><Card className="matrix"><table className="data-table"><thead><tr><th>Proyecto</th><th>Atención</th><th>Score compuesto</th><th>Cambio</th><th>Riesgo principal</th><th>Oportunidad</th></tr></thead><tbody>{data.projects.map((project) => <tr key={project.slug}><td><Link href={`/projects/${project.slug}`}><span className="cell-primary">{project.name}</span><span className="cell-secondary">{project.domain}</span></Link></td><td><Badge tone={attentionTone[project.attention]}>{project.attention}</Badge></td><td><span className="score">{project.score?.toLocaleString("es-ES") ?? "—"}</span><span className="cell-secondary">40% negocio · 30% vis. · 30% técnica</span></td><td><span className={project.delta >= 0 ? "delta-good" : "delta-bad"}>{project.delta > 0 ? "+" : ""}{project.delta} pts</span></td><td>{project.primaryRisk}</td><td>{project.primaryOpportunity}</td></tr>)}</tbody></table></Card></section>

        <section className="section two-col">
          <div><div className="section-heading"><div><p className="eyebrow">Mercados</p><h2>Cambios materiales</h2></div></div><Card className="matrix"><table className="data-table"><thead><tr><th>Mercado</th><th>Sesiones</th><th>Cambio</th><th>Visibilidad</th></tr></thead><tbody>{data.markets.map((market) => <tr key={market.code}><td><span className="cell-primary">{market.name}</span><span className="cell-secondary">{market.code}</span></td><td>{market.sessions.toLocaleString("es-ES")}</td><td className={market.change >= 0 ? "delta-good" : "delta-bad"}>{market.change > 0 ? "+" : ""}{market.change}%</td><td>{market.visibility}%</td></tr>)}</tbody></table></Card></div>
          <div><div className="section-heading"><div><p className="eyebrow">Ejecución</p><h2>Avance de acciones</h2></div><Link className="section-link" href="/actions">Ver plan →</Link></div><Card className="matrix"><table className="data-table"><thead><tr><th>Acción</th><th>Responsable</th><th>Estado</th></tr></thead><tbody>{data.actions.slice(0, 4).map((action) => <tr key={action.id}><td><span className="cell-primary">{action.title}</span><span className="cell-secondary">{action.project}</span></td><td>{action.owner}</td><td><Badge tone={action.status === "en_curso" ? "info" : "neutral"}>{action.status.replace("_", " ")}</Badge></td></tr>)}</tbody></table></Card></div>
        </section>

        <section className="section"><div className="section-heading"><div><p className="eyebrow">04 · Confianza</p><h2>Estado de las fuentes</h2></div><Link className="section-link" href="/data">Detalle de sincronizaciones →</Link></div><div className="source-grid">{data.sources.map((source) => <Card className="source-card" key={source.source}><div className="source-head"><h3>{source.label}</h3><Badge tone={source.status === "correcto" ? "good" : source.status === "parcial" ? "warn" : "bad"}>{source.status}</Badge></div><p>{source.note}</p><div className="source-meta"><span>{Math.round(source.coverage * 100)}% cobertura</span><span>Corte {source.cutoff ?? "—"}</span></div></Card>)}</div></section>
      </main>
    </AppShell>
  );
}

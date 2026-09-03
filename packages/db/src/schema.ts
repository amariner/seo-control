import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const sourceEnum = pgEnum("data_source", ["ga4", "gsc", "semrush", "geo", "crux", "pagespeed", "crawl"]);
export const syncStatusEnum = pgEnum("sync_status", ["queued", "running", "complete", "partial", "failed"]);
export const insightCategoryEnum = pgEnum("insight_category", ["resultado", "riesgo", "oportunidad", "diagnostico", "calidad"]);
export const insightStatusEnum = pgEnum("insight_status", ["candidato", "aprobado", "archivado"]);
export const confidenceEnum = pgEnum("confidence", ["alta", "media", "baja"]);
export const reportStatusEnum = pgEnum("report_status", ["borrador", "revision", "aprobado", "publicado"]);
export const actionStatusEnum = pgEnum("action_status", ["propuesta", "planificada", "en_curso", "bloqueada", "completada"]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  active: boolean("active").notNull().default(true),
  configuration: jsonb("configuration").notNull().default({}),
  createdAt,
  updatedAt,
});

export const markets = pgTable("markets", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  locale: varchar("locale", { length: 16 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull(),
});

export const projectMarkets = pgTable("project_markets", {
  projectId: uuid("project_id").notNull().references(() => projects.id),
  marketId: uuid("market_id").notNull().references(() => markets.id),
  tier: integer("tier").notNull().default(1),
  active: boolean("active").notNull().default(true),
}, (table) => [primaryKey({ columns: [table.projectId, table.marketId] })]);

export const metricDefinitions = pgTable("metric_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 160 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  aggregation: varchar("aggregation", { length: 32 }).notNull(),
  compatibleAcrossProjects: boolean("compatible_across_projects").notNull().default(false),
  goodDirection: varchar("good_direction", { length: 8 }).notNull(),
  definition: text("definition").notNull(),
});

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  source: sourceEnum("source").notNull(),
  status: syncStatusEnum("status").notNull().default("queued"),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cutoffDate: date("cutoff_date"),
  coverageRatio: numeric("coverage_ratio", { precision: 6, scale: 5 }),
  rowCount: integer("row_count"),
  lastValidRunId: uuid("last_valid_run_id"),
  errors: jsonb("errors").notNull().default([]),
  metadata: jsonb("metadata").notNull().default({}),
}, (table) => [uniqueIndex("sync_runs_idempotency_idx").on(table.idempotencyKey), index("sync_runs_project_source_idx").on(table.projectId, table.source, table.requestedAt)]);

export const dailyGa4Facts = pgTable("daily_ga4_facts", {
  projectId: uuid("project_id").notNull().references(() => projects.id),
  marketId: uuid("market_id").notNull().references(() => markets.id),
  day: date("day").notNull(),
  channel: varchar("channel", { length: 80 }).notNull(),
  device: varchar("device", { length: 32 }).notNull(),
  landingType: varchar("landing_type", { length: 64 }).notNull(),
  sessions: integer("sessions").notNull(),
  users: integer("users").notNull(),
  macroConversions: numeric("macro_conversions", { precision: 14, scale: 3 }).notNull(),
  microConversions: numeric("micro_conversions", { precision: 14, scale: 3 }).notNull(),
  syncRunId: uuid("sync_run_id").notNull().references(() => syncRuns.id),
}, (table) => [primaryKey({ columns: [table.projectId, table.marketId, table.day, table.channel, table.device, table.landingType] }), index("ga4_day_idx").on(table.day)]);

export const dailyGscFacts = pgTable("daily_gsc_facts", {
  projectId: uuid("project_id").notNull().references(() => projects.id),
  marketId: uuid("market_id").notNull().references(() => markets.id),
  day: date("day").notNull(),
  queryHash: varchar("query_hash", { length: 64 }).notNull(),
  pageHash: varchar("page_hash", { length: 64 }).notNull(),
  device: varchar("device", { length: 32 }).notNull(),
  searchType: varchar("search_type", { length: 32 }).notNull(),
  brandSegment: varchar("brand_segment", { length: 32 }).notNull(),
  intent: varchar("intent", { length: 32 }).notNull(),
  clicks: integer("clicks").notNull(),
  impressions: integer("impressions").notNull(),
  ctr: numeric("ctr", { precision: 8, scale: 5 }).notNull(),
  position: numeric("position", { precision: 8, scale: 3 }).notNull(),
  syncRunId: uuid("sync_run_id").notNull().references(() => syncRuns.id),
}, (table) => [primaryKey({ columns: [table.projectId, table.marketId, table.day, table.queryHash, table.pageHash, table.device, table.searchType] }), index("gsc_day_segment_idx").on(table.day, table.brandSegment, table.intent)]);

export const snapshots = pgTable("source_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  marketId: uuid("market_id").references(() => markets.id),
  source: sourceEnum("source").notNull(),
  snapshotDate: date("snapshot_date").notNull(),
  schemaVersion: varchar("schema_version", { length: 16 }).notNull(),
  payload: jsonb("payload").notNull(),
  syncRunId: uuid("sync_run_id").notNull().references(() => syncRuns.id),
  createdAt,
}, (table) => [index("snapshots_lookup_idx").on(table.projectId, table.source, table.snapshotDate)]);

export const pageEntities = pgTable("page_entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  url: text("url").notNull(),
  urlHash: varchar("url_hash", { length: 64 }).notNull(),
  title: text("title"),
  pageType: varchar("page_type", { length: 64 }).notNull(),
  contentStatus: varchar("content_status", { length: 32 }).notNull().default("estable"),
  taxonomy: jsonb("taxonomy").notNull().default({}),
  createdAt,
  updatedAt,
}, (table) => [uniqueIndex("pages_project_hash_idx").on(table.projectId, table.urlHash)]);

export const queryEntities = pgTable("query_entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  query: text("query").notNull(),
  queryHash: varchar("query_hash", { length: 64 }).notNull(),
  brandSegment: varchar("brand_segment", { length: 32 }).notNull(),
  intent: varchar("intent", { length: 32 }).notNull(),
  cluster: varchar("cluster", { length: 160 }),
  createdAt,
  updatedAt,
}, (table) => [uniqueIndex("queries_project_hash_idx").on(table.projectId, table.queryHash)]);

export const contentEntities = pgTable("content_entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  pageId: uuid("page_id").notNull().references(() => pageEntities.id),
  cluster: varchar("cluster", { length: 160 }),
  pillar: boolean("pillar").notNull().default(false),
  status: varchar("status", { length: 32 }).notNull(),
  publishedAt: date("published_at"),
  updatedContentAt: date("updated_content_at"),
  localOverrides: jsonb("local_overrides").notNull().default({}),
  createdAt,
  updatedAt,
});

export const technicalIssues = pgTable("technical_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  snapshotId: uuid("snapshot_id").notNull().references(() => snapshots.id),
  fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
  title: text("title").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  severity: varchar("severity", { length: 16 }).notNull(),
  affectedUrls: integer("affected_urls").notNull(),
  trafficAtRisk: integer("traffic_at_risk").notNull().default(0),
  persistenceRuns: integer("persistence_runs").notNull().default(1),
  effort: varchar("effort", { length: 16 }).notNull(),
  priorityScore: numeric("priority_score", { precision: 8, scale: 2 }).notNull(),
  sample: jsonb("sample").notNull().default([]),
  createdAt,
}, (table) => [index("issues_priority_idx").on(table.projectId, table.priorityScore)]);

export const objectives = pgTable("objectives", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  marketId: uuid("market_id").references(() => markets.id),
  metricDefinitionId: uuid("metric_definition_id").notNull().references(() => metricDefinitions.id),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  targetValue: numeric("target_value", { precision: 18, scale: 4 }).notNull(),
  notes: text("notes"),
  createdAt,
});

export const dataQualityAssessments = pgTable("data_quality_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  source: sourceEnum("source").notNull(),
  assessedOn: date("assessed_on").notNull(),
  coverageRatio: numeric("coverage_ratio", { precision: 6, scale: 5 }).notNull(),
  quality: varchar("quality", { length: 20 }).notNull(),
  details: jsonb("details").notNull(),
});

export const timelineAnnotations = pgTable("timeline_annotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  happenedOn: date("happened_on").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  label: text("label").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt,
});

export const signals = pgTable("signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  fingerprint: varchar("fingerprint", { length: 100 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  materiality: numeric("materiality", { precision: 8, scale: 3 }).notNull(),
  persistenceCount: integer("persistence_count").notNull().default(1),
  critical: boolean("critical").notNull().default(false),
  payload: jsonb("payload").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
}, (table) => [uniqueIndex("signals_fingerprint_idx").on(table.fingerprint)]);

export const insights = pgTable("insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  title: text("title").notNull(),
  executiveSummary: text("executive_summary").notNull(),
  technicalExplanation: text("technical_explanation").notNull(),
  category: insightCategoryEnum("category").notNull(),
  status: insightStatusEnum("status").notNull().default("candidato"),
  impact: integer("impact").notNull(),
  urgency: integer("urgency").notNull(),
  confidence: confidenceEnum("confidence").notNull(),
  confidenceReason: text("confidence_reason").notNull(),
  causeType: varchar("cause_type", { length: 32 }).notNull(),
  cause: text("cause").notNull(),
  recommendation: text("recommendation").notNull(),
  suggestedOwner: varchar("suggested_owner", { length: 160 }).notNull(),
  successCriterion: text("success_criterion").notNull(),
  selectedForExecutive: boolean("selected_for_executive").notNull().default(false),
  approvedBy: varchar("approved_by", { length: 255 }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt,
  updatedAt,
}, (table) => [index("insights_status_idx").on(table.status, table.updatedAt)]);

export const evidence = pgTable("evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  insightId: uuid("insight_id").notNull().references(() => insights.id),
  label: text("label").notNull(),
  value: text("value").notNull(),
  source: sourceEnum("source").notNull(),
  entityType: varchar("entity_type", { length: 32 }),
  entityId: uuid("entity_id"),
  observedOn: date("observed_on").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
});

export const actionSnapshots = pgTable("action_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  insightId: uuid("insight_id").references(() => insights.id),
  title: text("title").notNull(),
  status: actionStatusEnum("status").notNull(),
  owner: varchar("owner", { length: 160 }).notNull(),
  dueDate: date("due_date"),
  priorityScore: numeric("priority_score", { precision: 8, scale: 2 }).notNull(),
  successCriterion: text("success_criterion").notNull(),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reportDocuments = pgTable("report_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  type: varchar("type", { length: 32 }).notNull(),
  title: text("title").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  createdAt,
});

export const reportVersions = pgTable("report_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => reportDocuments.id),
  version: integer("version").notNull(),
  status: reportStatusEnum("status").notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  reviewerId: varchar("reviewer_id", { length: 255 }),
  artifactHash: varchar("artifact_hash", { length: 64 }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt,
}, (table) => [uniqueIndex("report_version_idx").on(table.documentId, table.version)]);

export const reportBlocks = pgTable("report_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id").notNull().references(() => reportVersions.id),
  position: integer("position").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  payload: jsonb("payload").notNull(),
}, (table) => [uniqueIndex("report_block_position_idx").on(table.versionId, table.position)]);

export const errata = pgTable("errata", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id").notNull().references(() => reportVersions.id),
  description: text("description").notNull(),
  correction: text("correction").notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt,
});

export const publicationPackages = pgTable("publication_packages", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  schemaVersion: varchar("schema_version", { length: 16 }).notNull(),
  checksum: varchar("checksum", { length: 64 }).notNull(),
  signature: text("signature").notNull(),
  rowCount: integer("row_count").notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  promotedBy: varchar("promoted_by", { length: 255 }),
  promotedAt: timestamp("promoted_at", { withTimezone: true }),
  createdAt,
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: varchar("actor_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }),
  entityId: varchar("entity_id", { length: 255 }),
  metadata: jsonb("metadata").notNull().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("audit_occurred_idx").on(table.occurredAt)]);

export const dataSources = pgTable("data_sources", {
  key: sourceEnum("key").primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  cadence: varchar("cadence", { length: 32 }).notNull(),
  retentionPolicy: text("retention_policy").notNull(),
  rawPersistenceAllowed: boolean("raw_persistence_allowed").notNull().default(false),
});

export const semrushSnapshots = pgTable("semrush_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  marketId: uuid("market_id").notNull().references(() => markets.id),
  snapshotDate: date("snapshot_date").notNull(),
  keywordSetVersion: integer("keyword_set_version").notNull(),
  visibility: numeric("visibility", { precision: 9, scale: 5 }).notNull(),
  shareOfVoice: numeric("share_of_voice", { precision: 9, scale: 5 }).notNull(),
  payload: jsonb("payload").notNull(),
  syncRunId: uuid("sync_run_id").notNull().references(() => syncRuns.id),
}, (table) => [uniqueIndex("semrush_project_market_date_idx").on(table.projectId, table.marketId, table.snapshotDate)]);

export const geoSnapshots = pgTable("geo_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  marketId: uuid("market_id").notNull().references(() => markets.id),
  snapshotDate: date("snapshot_date").notNull(),
  promptSetVersion: integer("prompt_set_version").notNull(),
  assistant: varchar("assistant", { length: 40 }).notNull(),
  modelVersion: varchar("model_version", { length: 120 }),
  citationShare: numeric("citation_share", { precision: 9, scale: 5 }).notNull(),
  promptCount: integer("prompt_count").notNull(),
  curatedEvidence: jsonb("curated_evidence").notNull(),
  syncRunId: uuid("sync_run_id").notNull().references(() => syncRuns.id),
}, (table) => [index("geo_project_market_date_idx").on(table.projectId, table.marketId, table.snapshotDate)]);

export const keywordEntities = pgTable("keyword_entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  keyword: text("keyword").notNull(),
  keywordHash: varchar("keyword_hash", { length: 64 }).notNull(),
  brandSegment: varchar("brand_segment", { length: 32 }).notNull(),
  intent: varchar("intent", { length: 32 }).notNull(),
  discoveredBy: sourceEnum("discovered_by").notNull(),
  createdAt,
}, (table) => [uniqueIndex("keywords_project_hash_idx").on(table.projectId, table.keywordHash)]);

export const competitors = pgTable("competitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  marketId: uuid("market_id").notNull().references(() => markets.id),
  name: varchar("name", { length: 160 }).notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt,
}, (table) => [uniqueIndex("competitors_scope_domain_idx").on(table.projectId, table.marketId, table.domain)]);

export const keywordSets = pgTable("keyword_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  marketId: uuid("market_id").notNull().references(() => markets.id),
  name: varchar("name", { length: 160 }).notNull(),
  version: integer("version").notNull(),
  stable: boolean("stable").notNull().default(true),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  createdAt,
}, (table) => [uniqueIndex("keyword_sets_version_idx").on(table.projectId, table.marketId, table.name, table.version)]);

export const keywordSetMembers = pgTable("keyword_set_members", {
  keywordSetId: uuid("keyword_set_id").notNull().references(() => keywordSets.id),
  keywordId: uuid("keyword_id").notNull().references(() => keywordEntities.id),
  weight: numeric("weight", { precision: 8, scale: 4 }).notNull().default("1"),
}, (table) => [primaryKey({ columns: [table.keywordSetId, table.keywordId] })]);

export const pageTaxonomies = pgTable("page_taxonomies", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  version: integer("version").notNull(),
  pageType: varchar("page_type", { length: 64 }).notNull(),
  matcher: jsonb("matcher").notNull(),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
});

export const searchIntents = pgTable("search_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  queryId: uuid("query_id").notNull().references(() => queryEntities.id),
  intent: varchar("intent", { length: 32 }).notNull(),
  confidence: confidenceEnum("confidence").notNull(),
  classifiedBy: varchar("classified_by", { length: 32 }).notNull(),
  version: integer("version").notNull(),
  createdAt,
}, (table) => [index("search_intents_query_idx").on(table.queryId, table.version)]);

export const technicalCrawlSnapshots = pgTable("technical_crawl_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  localRunId: varchar("local_run_id", { length: 100 }).notNull(),
  snapshotDate: date("snapshot_date").notNull(),
  schemaVersion: varchar("schema_version", { length: 16 }).notNull(),
  totalUrls: integer("total_urls").notNull(),
  indexableUrls: integer("indexable_urls").notNull(),
  healthScore: numeric("health_score", { precision: 6, scale: 2 }),
  packageId: uuid("package_id").references(() => publicationPackages.id),
  summary: jsonb("summary").notNull(),
  createdAt,
}, (table) => [uniqueIndex("crawl_snapshot_local_run_idx").on(table.projectId, table.localRunId)]);

export const hreflangCoverage = pgTable("hreflang_coverage", {
  id: uuid("id").primaryKey().defaultRandom(),
  crawlSnapshotId: uuid("crawl_snapshot_id").notNull().references(() => technicalCrawlSnapshots.id),
  sourceMarketId: uuid("source_market_id").notNull().references(() => markets.id),
  targetMarketId: uuid("target_market_id").notNull().references(() => markets.id),
  template: varchar("template", { length: 100 }).notNull(),
  totalUrls: integer("total_urls").notNull(),
  coveredUrls: integer("covered_urls").notNull(),
  reciprocalUrls: integer("reciprocal_urls").notNull(),
  invalidDestinations: integer("invalid_destinations").notNull(),
  xDefaultUrls: integer("x_default_urls").notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  insightId: uuid("insight_id").notNull().references(() => insights.id),
  title: text("title").notNull(),
  rationale: text("rationale").notNull(),
  impact: integer("impact").notNull(),
  confidence: integer("confidence").notNull(),
  effort: integer("effort").notNull(),
  urgency: integer("urgency").notNull(),
  dependencies: jsonb("dependencies").notNull().default([]),
  suggestedOwner: varchar("suggested_owner", { length: 160 }).notNull(),
  successCriterion: text("success_criterion").notNull(),
  createdAt,
});

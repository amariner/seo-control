CREATE TYPE "public"."action_status" AS ENUM('propuesta', 'planificada', 'en_curso', 'bloqueada', 'completada');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('alta', 'media', 'baja');--> statement-breakpoint
CREATE TYPE "public"."insight_category" AS ENUM('resultado', 'riesgo', 'oportunidad', 'diagnostico', 'calidad');--> statement-breakpoint
CREATE TYPE "public"."insight_status" AS ENUM('candidato', 'aprobado', 'archivado');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('borrador', 'revision', 'aprobado', 'publicado');--> statement-breakpoint
CREATE TYPE "public"."data_source" AS ENUM('ga4', 'gsc', 'semrush', 'geo', 'crux', 'pagespeed', 'crawl');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('queued', 'running', 'complete', 'partial', 'failed');--> statement-breakpoint
CREATE TABLE "action_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"insight_id" uuid,
	"title" text NOT NULL,
	"status" "action_status" NOT NULL,
	"owner" varchar(160) NOT NULL,
	"due_date" date,
	"priority_score" numeric(8, 2) NOT NULL,
	"success_criterion" text NOT NULL,
	"snapshot_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" varchar(255) NOT NULL,
	"action" varchar(80) NOT NULL,
	"entity_type" varchar(80),
	"entity_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"cluster" varchar(160),
	"pillar" boolean DEFAULT false NOT NULL,
	"status" varchar(32) NOT NULL,
	"published_at" date,
	"updated_content_at" date,
	"local_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_ga4_facts" (
	"project_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"day" date NOT NULL,
	"channel" varchar(80) NOT NULL,
	"device" varchar(32) NOT NULL,
	"landing_type" varchar(64) NOT NULL,
	"sessions" integer NOT NULL,
	"users" integer NOT NULL,
	"macro_conversions" numeric(14, 3) NOT NULL,
	"micro_conversions" numeric(14, 3) NOT NULL,
	"sync_run_id" uuid NOT NULL,
	CONSTRAINT "daily_ga4_facts_project_id_market_id_day_channel_device_landing_type_pk" PRIMARY KEY("project_id","market_id","day","channel","device","landing_type")
);
--> statement-breakpoint
CREATE TABLE "daily_gsc_facts" (
	"project_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"day" date NOT NULL,
	"query_hash" varchar(64) NOT NULL,
	"page_hash" varchar(64) NOT NULL,
	"device" varchar(32) NOT NULL,
	"search_type" varchar(32) NOT NULL,
	"brand_segment" varchar(32) NOT NULL,
	"intent" varchar(32) NOT NULL,
	"clicks" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" numeric(8, 5) NOT NULL,
	"position" numeric(8, 3) NOT NULL,
	"sync_run_id" uuid NOT NULL,
	CONSTRAINT "daily_gsc_facts_project_id_market_id_day_query_hash_page_hash_device_search_type_pk" PRIMARY KEY("project_id","market_id","day","query_hash","page_hash","device","search_type")
);
--> statement-breakpoint
CREATE TABLE "data_quality_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source" "data_source" NOT NULL,
	"assessed_on" date NOT NULL,
	"coverage_ratio" numeric(6, 5) NOT NULL,
	"quality" varchar(20) NOT NULL,
	"details" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "errata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"description" text NOT NULL,
	"correction" text NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insight_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"source" "data_source" NOT NULL,
	"entity_type" varchar(32),
	"entity_id" uuid,
	"observed_on" date NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"title" text NOT NULL,
	"executive_summary" text NOT NULL,
	"technical_explanation" text NOT NULL,
	"category" "insight_category" NOT NULL,
	"status" "insight_status" DEFAULT 'candidato' NOT NULL,
	"impact" integer NOT NULL,
	"urgency" integer NOT NULL,
	"confidence" "confidence" NOT NULL,
	"confidence_reason" text NOT NULL,
	"cause_type" varchar(32) NOT NULL,
	"cause" text NOT NULL,
	"recommendation" text NOT NULL,
	"suggested_owner" varchar(160) NOT NULL,
	"success_criterion" text NOT NULL,
	"selected_for_executive" boolean DEFAULT false NOT NULL,
	"approved_by" varchar(255),
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(8) NOT NULL,
	"name" varchar(100) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	CONSTRAINT "markets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "metric_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"label" varchar(160) NOT NULL,
	"unit" varchar(32) NOT NULL,
	"aggregation" varchar(32) NOT NULL,
	"compatible_across_projects" boolean DEFAULT false NOT NULL,
	"good_direction" varchar(8) NOT NULL,
	"definition" text NOT NULL,
	CONSTRAINT "metric_definitions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"market_id" uuid,
	"metric_definition_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"target_value" numeric(18, 4) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"url" text NOT NULL,
	"url_hash" varchar(64) NOT NULL,
	"title" text,
	"page_type" varchar(64) NOT NULL,
	"content_status" varchar(32) DEFAULT 'estable' NOT NULL,
	"taxonomy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_markets" (
	"project_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"tier" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "project_markets_project_id_market_id_pk" PRIMARY KEY("project_id","market_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "publication_packages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"schema_version" varchar(16) NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"signature" text NOT NULL,
	"row_count" integer NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"promoted_by" varchar(255),
	"promoted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"query" text NOT NULL,
	"query_hash" varchar(64) NOT NULL,
	"brand_segment" varchar(32) NOT NULL,
	"intent" varchar(32) NOT NULL,
	"cluster" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"type" varchar(32) NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"type" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "report_status" NOT NULL,
	"author_id" varchar(255) NOT NULL,
	"reviewer_id" varchar(255),
	"artifact_hash" varchar(64),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"fingerprint" varchar(100) NOT NULL,
	"type" varchar(64) NOT NULL,
	"materiality" numeric(8, 3) NOT NULL,
	"persistence_count" integer DEFAULT 1 NOT NULL,
	"critical" boolean DEFAULT false NOT NULL,
	"payload" jsonb NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"market_id" uuid,
	"source" "data_source" NOT NULL,
	"snapshot_date" date NOT NULL,
	"schema_version" varchar(16) NOT NULL,
	"payload" jsonb NOT NULL,
	"sync_run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source" "data_source" NOT NULL,
	"status" "sync_status" DEFAULT 'queued' NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cutoff_date" date,
	"coverage_ratio" numeric(6, 5),
	"row_count" integer,
	"last_valid_run_id" uuid,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technical_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"category" varchar(80) NOT NULL,
	"severity" varchar(16) NOT NULL,
	"affected_urls" integer NOT NULL,
	"traffic_at_risk" integer DEFAULT 0 NOT NULL,
	"persistence_runs" integer DEFAULT 1 NOT NULL,
	"effort" varchar(16) NOT NULL,
	"priority_score" numeric(8, 2) NOT NULL,
	"sample" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"happened_on" date NOT NULL,
	"type" varchar(32) NOT NULL,
	"label" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_snapshots" ADD CONSTRAINT "action_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_snapshots" ADD CONSTRAINT "action_snapshots_insight_id_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."insights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_entities" ADD CONSTRAINT "content_entities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_entities" ADD CONSTRAINT "content_entities_page_id_page_entities_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_ga4_facts" ADD CONSTRAINT "daily_ga4_facts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_ga4_facts" ADD CONSTRAINT "daily_ga4_facts_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_ga4_facts" ADD CONSTRAINT "daily_ga4_facts_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_gsc_facts" ADD CONSTRAINT "daily_gsc_facts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_gsc_facts" ADD CONSTRAINT "daily_gsc_facts_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_gsc_facts" ADD CONSTRAINT "daily_gsc_facts_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_quality_assessments" ADD CONSTRAINT "data_quality_assessments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "errata" ADD CONSTRAINT "errata_version_id_report_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."report_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_insight_id_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."insights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_metric_definition_id_metric_definitions_id_fk" FOREIGN KEY ("metric_definition_id") REFERENCES "public"."metric_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_entities" ADD CONSTRAINT "page_entities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_markets" ADD CONSTRAINT "project_markets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_markets" ADD CONSTRAINT "project_markets_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_packages" ADD CONSTRAINT "publication_packages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_entities" ADD CONSTRAINT "query_entities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_blocks" ADD CONSTRAINT "report_blocks_version_id_report_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."report_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_documents" ADD CONSTRAINT "report_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_document_id_report_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."report_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_issues" ADD CONSTRAINT "technical_issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_issues" ADD CONSTRAINT "technical_issues_snapshot_id_source_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."source_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_annotations" ADD CONSTRAINT "timeline_annotations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_occurred_idx" ON "audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "ga4_day_idx" ON "daily_ga4_facts" USING btree ("day");--> statement-breakpoint
CREATE INDEX "gsc_day_segment_idx" ON "daily_gsc_facts" USING btree ("day","brand_segment","intent");--> statement-breakpoint
CREATE INDEX "insights_status_idx" ON "insights" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_project_hash_idx" ON "page_entities" USING btree ("project_id","url_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "queries_project_hash_idx" ON "query_entities" USING btree ("project_id","query_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "report_block_position_idx" ON "report_blocks" USING btree ("version_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "report_version_idx" ON "report_versions" USING btree ("document_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "signals_fingerprint_idx" ON "signals" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "snapshots_lookup_idx" ON "source_snapshots" USING btree ("project_id","source","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_runs_idempotency_idx" ON "sync_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "sync_runs_project_source_idx" ON "sync_runs" USING btree ("project_id","source","requested_at");--> statement-breakpoint
CREATE INDEX "issues_priority_idx" ON "technical_issues" USING btree ("project_id","priority_score");
CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"key" "data_source" PRIMARY KEY NOT NULL,
	"label" varchar(120) NOT NULL,
	"cadence" varchar(32) NOT NULL,
	"retention_policy" text NOT NULL,
	"raw_persistence_allowed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"prompt_set_version" integer NOT NULL,
	"assistant" varchar(40) NOT NULL,
	"model_version" varchar(120),
	"citation_share" numeric(9, 5) NOT NULL,
	"prompt_count" integer NOT NULL,
	"curated_evidence" jsonb NOT NULL,
	"sync_run_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hreflang_coverage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crawl_snapshot_id" uuid NOT NULL,
	"source_market_id" uuid NOT NULL,
	"target_market_id" uuid NOT NULL,
	"template" varchar(100) NOT NULL,
	"total_urls" integer NOT NULL,
	"covered_urls" integer NOT NULL,
	"reciprocal_urls" integer NOT NULL,
	"invalid_destinations" integer NOT NULL,
	"x_default_urls" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"keyword" text NOT NULL,
	"keyword_hash" varchar(64) NOT NULL,
	"brand_segment" varchar(32) NOT NULL,
	"intent" varchar(32) NOT NULL,
	"discovered_by" "data_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_set_members" (
	"keyword_set_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	"weight" numeric(8, 4) DEFAULT '1' NOT NULL,
	CONSTRAINT "keyword_set_members_keyword_set_id_keyword_id_pk" PRIMARY KEY("keyword_set_id","keyword_id")
);
--> statement-breakpoint
CREATE TABLE "keyword_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"version" integer NOT NULL,
	"stable" boolean DEFAULT true NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_taxonomies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"page_type" varchar(64) NOT NULL,
	"matcher" jsonb NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insight_id" uuid NOT NULL,
	"title" text NOT NULL,
	"rationale" text NOT NULL,
	"impact" integer NOT NULL,
	"confidence" integer NOT NULL,
	"effort" integer NOT NULL,
	"urgency" integer NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_owner" varchar(160) NOT NULL,
	"success_criterion" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"query_id" uuid NOT NULL,
	"intent" varchar(32) NOT NULL,
	"confidence" "confidence" NOT NULL,
	"classified_by" varchar(32) NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semrush_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"keyword_set_version" integer NOT NULL,
	"visibility" numeric(9, 5) NOT NULL,
	"share_of_voice" numeric(9, 5) NOT NULL,
	"payload" jsonb NOT NULL,
	"sync_run_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technical_crawl_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"local_run_id" varchar(100) NOT NULL,
	"snapshot_date" date NOT NULL,
	"schema_version" varchar(16) NOT NULL,
	"total_urls" integer NOT NULL,
	"indexable_urls" integer NOT NULL,
	"health_score" numeric(6, 2),
	"package_id" uuid,
	"summary" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_snapshots" ADD CONSTRAINT "geo_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_snapshots" ADD CONSTRAINT "geo_snapshots_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_snapshots" ADD CONSTRAINT "geo_snapshots_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hreflang_coverage" ADD CONSTRAINT "hreflang_coverage_crawl_snapshot_id_technical_crawl_snapshots_id_fk" FOREIGN KEY ("crawl_snapshot_id") REFERENCES "public"."technical_crawl_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hreflang_coverage" ADD CONSTRAINT "hreflang_coverage_source_market_id_markets_id_fk" FOREIGN KEY ("source_market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hreflang_coverage" ADD CONSTRAINT "hreflang_coverage_target_market_id_markets_id_fk" FOREIGN KEY ("target_market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_entities" ADD CONSTRAINT "keyword_entities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_set_members" ADD CONSTRAINT "keyword_set_members_keyword_set_id_keyword_sets_id_fk" FOREIGN KEY ("keyword_set_id") REFERENCES "public"."keyword_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_set_members" ADD CONSTRAINT "keyword_set_members_keyword_id_keyword_entities_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keyword_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_sets" ADD CONSTRAINT "keyword_sets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_sets" ADD CONSTRAINT "keyword_sets_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_taxonomies" ADD CONSTRAINT "page_taxonomies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_insight_id_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."insights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_intents" ADD CONSTRAINT "search_intents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_intents" ADD CONSTRAINT "search_intents_query_id_query_entities_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."query_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semrush_snapshots" ADD CONSTRAINT "semrush_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semrush_snapshots" ADD CONSTRAINT "semrush_snapshots_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semrush_snapshots" ADD CONSTRAINT "semrush_snapshots_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_crawl_snapshots" ADD CONSTRAINT "technical_crawl_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_crawl_snapshots" ADD CONSTRAINT "technical_crawl_snapshots_package_id_publication_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."publication_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competitors_scope_domain_idx" ON "competitors" USING btree ("project_id","market_id","domain");--> statement-breakpoint
CREATE INDEX "geo_project_market_date_idx" ON "geo_snapshots" USING btree ("project_id","market_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "keywords_project_hash_idx" ON "keyword_entities" USING btree ("project_id","keyword_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "keyword_sets_version_idx" ON "keyword_sets" USING btree ("project_id","market_id","name","version");--> statement-breakpoint
CREATE INDEX "search_intents_query_idx" ON "search_intents" USING btree ("query_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "semrush_project_market_date_idx" ON "semrush_snapshots" USING btree ("project_id","market_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "crawl_snapshot_local_run_idx" ON "technical_crawl_snapshots" USING btree ("project_id","local_run_id");
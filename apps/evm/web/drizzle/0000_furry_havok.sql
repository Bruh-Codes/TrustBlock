CREATE TYPE "public"."workroom_comment_type" AS ENUM('general', 'request_changes', 'resolution_note');--> statement-breakpoint
CREATE TYPE "public"."workroom_role" AS ENUM('client', 'recipient', 'resolver');--> statement-breakpoint
CREATE TYPE "public"."workroom_submission_status" AS ENUM('draft', 'submitted', 'changes_requested', 'accepted');--> statement-breakpoint
CREATE TABLE "workroom_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escrow_id" bigint NOT NULL,
	"milestone_id" bigint NOT NULL,
	"submission_id" uuid,
	"author_wallet" text NOT NULL,
	"author_role" "workroom_role" NOT NULL,
	"comment_type" "workroom_comment_type" DEFAULT 'general' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workroom_submission_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text,
	"size_bytes" bigint,
	"storage_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workroom_submission_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workroom_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escrow_id" bigint NOT NULL,
	"milestone_id" bigint NOT NULL,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"submitted_by_wallet" text NOT NULL,
	"submitted_by_role" "workroom_role" NOT NULL,
	"delivery_note" text DEFAULT '' NOT NULL,
	"submission_status" "workroom_submission_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workroom_comments" ADD CONSTRAINT "workroom_comments_submission_id_workroom_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."workroom_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workroom_submission_files" ADD CONSTRAINT "workroom_submission_files_submission_id_workroom_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."workroom_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workroom_submission_links" ADD CONSTRAINT "workroom_submission_links_submission_id_workroom_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."workroom_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workroom_comments_milestone_idx" ON "workroom_comments" USING btree ("escrow_id","milestone_id","created_at");--> statement-breakpoint
CREATE INDEX "workroom_submission_files_submission_idx" ON "workroom_submission_files" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "workroom_submission_links_submission_idx" ON "workroom_submission_links" USING btree ("submission_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "workroom_submissions_revision_unique" ON "workroom_submissions" USING btree ("milestone_id","revision_number");--> statement-breakpoint
CREATE INDEX "workroom_submissions_escrow_idx" ON "workroom_submissions" USING btree ("escrow_id","milestone_id","created_at");
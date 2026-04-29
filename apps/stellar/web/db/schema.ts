import {
	bigint,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const workroomRoleEnum = pgEnum("workroom_role", [
	"client",
	"recipient",
	"resolver",
]);

export const workroomSubmissionStatusEnum = pgEnum("workroom_submission_status", [
	"draft",
	"shared",
	"submitted",
	"changes_requested",
	"accepted",
]);

export const workroomCommentTypeEnum = pgEnum("workroom_comment_type", [
	"general",
	"request_changes",
	"resolution_note",
]);

export const workroomSubmissions = pgTable(
	"workroom_submissions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		escrowId: bigint("escrow_id", { mode: "bigint" }).notNull(),
		milestoneId: bigint("milestone_id", { mode: "bigint" }).notNull(),
		revisionNumber: integer("revision_number").notNull().default(1),
		submittedByWallet: text("submitted_by_wallet").notNull(),
		submittedByRole: workroomRoleEnum("submitted_by_role").notNull(),
		deliveryNote: text("delivery_note").notNull().default(""),
		submissionStatus: workroomSubmissionStatusEnum("submission_status")
			.notNull()
			.default("draft"),
		submittedAt: timestamp("submitted_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("workroom_submissions_revision_unique").on(
			table.milestoneId,
			table.revisionNumber,
		),
		index("workroom_submissions_escrow_idx").on(
			table.escrowId,
			table.milestoneId,
			table.createdAt,
		),
	],
);

export const workroomSubmissionLinks = pgTable(
	"workroom_submission_links",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		submissionId: uuid("submission_id")
			.notNull()
			.references(() => workroomSubmissions.id, { onDelete: "cascade" }),
		label: text("label").notNull(),
		url: text("url").notNull(),
		position: integer("position").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("workroom_submission_links_submission_idx").on(
			table.submissionId,
			table.position,
		),
	],
);

export const workroomSubmissionFiles = pgTable(
	"workroom_submission_files",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		submissionId: uuid("submission_id")
			.notNull()
			.references(() => workroomSubmissions.id, { onDelete: "cascade" }),
		fileName: text("file_name").notNull(),
		fileUrl: text("file_url").notNull(),
		mimeType: text("mime_type"),
		sizeBytes: bigint("size_bytes", { mode: "bigint" }),
		storagePath: text("storage_path"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("workroom_submission_files_submission_idx").on(table.submissionId),
	],
);

export const workroomComments = pgTable(
	"workroom_comments",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		escrowId: bigint("escrow_id", { mode: "bigint" }).notNull(),
		milestoneId: bigint("milestone_id", { mode: "bigint" }).notNull(),
		submissionId: uuid("submission_id").references(() => workroomSubmissions.id, {
			onDelete: "cascade",
		}),
		authorWallet: text("author_wallet").notNull(),
		authorRole: workroomRoleEnum("author_role").notNull(),
		commentType: workroomCommentTypeEnum("comment_type")
			.notNull()
			.default("general"),
		body: text("body").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("workroom_comments_milestone_idx").on(
			table.escrowId,
			table.milestoneId,
			table.createdAt,
		),
	],
);

export const workroomSubmissionsRelations = relations(
	workroomSubmissions,
	({ many }) => ({
		links: many(workroomSubmissionLinks),
		files: many(workroomSubmissionFiles),
		comments: many(workroomComments),
	}),
);

export const workroomSubmissionLinksRelations = relations(
	workroomSubmissionLinks,
	({ one }) => ({
		submission: one(workroomSubmissions, {
			fields: [workroomSubmissionLinks.submissionId],
			references: [workroomSubmissions.id],
		}),
	}),
);

export const workroomSubmissionFilesRelations = relations(
	workroomSubmissionFiles,
	({ one }) => ({
		submission: one(workroomSubmissions, {
			fields: [workroomSubmissionFiles.submissionId],
			references: [workroomSubmissions.id],
		}),
	}),
);

export const workroomCommentsRelations = relations(workroomComments, ({ one }) => ({
	submission: one(workroomSubmissions, {
		fields: [workroomComments.submissionId],
		references: [workroomSubmissions.id],
	}),
}));

export type WorkroomSubmissionRow = typeof workroomSubmissions.$inferSelect;
export type NewWorkroomSubmissionRow = typeof workroomSubmissions.$inferInsert;
export type WorkroomSubmissionLinkRow = typeof workroomSubmissionLinks.$inferSelect;
export type NewWorkroomSubmissionLinkRow =
	typeof workroomSubmissionLinks.$inferInsert;
export type WorkroomSubmissionFileRow = typeof workroomSubmissionFiles.$inferSelect;
export type NewWorkroomSubmissionFileRow =
	typeof workroomSubmissionFiles.$inferInsert;
export type WorkroomCommentRow = typeof workroomComments.$inferSelect;
export type NewWorkroomCommentRow = typeof workroomComments.$inferInsert;

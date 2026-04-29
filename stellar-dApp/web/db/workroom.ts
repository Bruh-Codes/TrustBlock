import "server-only";

import { and, desc, eq, max } from "drizzle-orm";
import { db } from "./index";
import {
	workroomComments,
	workroomSubmissionFiles,
	workroomSubmissionLinks,
	workroomSubmissions,
	type NewWorkroomCommentRow,
	type NewWorkroomSubmissionFileRow,
	type NewWorkroomSubmissionLinkRow,
	type NewWorkroomSubmissionRow,
	type WorkroomCommentRow,
	type WorkroomSubmissionRow,
} from "./schema";

export type WorkroomSubmissionInput = {
	escrowId: bigint;
	milestoneId: bigint;
	submittedByWallet: string;
	submittedByRole: NewWorkroomSubmissionRow["submittedByRole"];
	deliveryNote: string;
	submissionStatus: NewWorkroomSubmissionRow["submissionStatus"];
	links?: Array<Pick<NewWorkroomSubmissionLinkRow, "label" | "url">>;
	files?: Array<
		Pick<NewWorkroomSubmissionFileRow, "fileName" | "fileUrl"> &
			Partial<
				Pick<
					NewWorkroomSubmissionFileRow,
					"mimeType" | "sizeBytes" | "storagePath"
				>
			>
	>;
};

export type WorkroomSnapshot = {
	submissions: Array<
		WorkroomSubmissionRow & {
			links: typeof workroomSubmissionLinks.$inferSelect[];
			files: typeof workroomSubmissionFiles.$inferSelect[];
		}
	>;
	comments: WorkroomCommentRow[];
};

export async function getMilestoneWorkroomSnapshot(
	escrowId: bigint,
	milestoneId: bigint,
): Promise<WorkroomSnapshot> {
	const [submissions, comments] = await Promise.all([
		db.query.workroomSubmissions.findMany({
			where: and(
				eq(workroomSubmissions.escrowId, escrowId),
				eq(workroomSubmissions.milestoneId, milestoneId),
			),
			with: {
				links: {
					orderBy: (table, { asc }) => [asc(table.position)],
				},
				files: true,
			},
			orderBy: (table, { desc: orderDesc }) => [orderDesc(table.createdAt)],
		}),
		db
			.select()
			.from(workroomComments)
			.where(
				and(
					eq(workroomComments.escrowId, escrowId),
					eq(workroomComments.milestoneId, milestoneId),
				),
			)
			.orderBy(desc(workroomComments.createdAt)),
	]);

	return {
		submissions,
		comments,
	};
}

export async function createWorkroomSubmission(input: WorkroomSubmissionInput) {
	return db.transaction(async (tx) => {
		const [latestRevision] = await tx
			.select({
				value: max(workroomSubmissions.revisionNumber),
			})
			.from(workroomSubmissions)
			.where(eq(workroomSubmissions.milestoneId, input.milestoneId));

		const revisionNumber = (latestRevision?.value ?? 0) + 1;
		const submittedAt =
			input.submissionStatus === "submitted" ? new Date() : null;

		const [submission] = await tx
			.insert(workroomSubmissions)
			.values({
				escrowId: input.escrowId,
				milestoneId: input.milestoneId,
				revisionNumber,
				submittedByWallet: input.submittedByWallet,
				submittedByRole: input.submittedByRole,
				deliveryNote: input.deliveryNote,
				submissionStatus: input.submissionStatus,
				submittedAt,
				updatedAt: new Date(),
			})
			.returning();

		if (input.links?.length) {
			await tx.insert(workroomSubmissionLinks).values(
				input.links.map((link, index) => ({
					submissionId: submission.id,
					label: link.label,
					url: link.url,
					position: index,
				})),
			);
		}

		if (input.files?.length) {
			await tx.insert(workroomSubmissionFiles).values(
				input.files.map((file) => ({
					submissionId: submission.id,
					fileName: file.fileName,
					fileUrl: file.fileUrl,
					mimeType: file.mimeType ?? null,
					sizeBytes: file.sizeBytes ?? null,
					storagePath: file.storagePath ?? null,
				})),
			);
		}

		return submission;
	});
}

export async function createWorkroomComment(input: NewWorkroomCommentRow) {
	const [comment] = await db.insert(workroomComments).values(input).returning();
	return comment;
}

export async function markSubmissionStatus(
	submissionId: string,
	submissionStatus: NewWorkroomSubmissionRow["submissionStatus"],
) {
	const [submission] = await db
		.update(workroomSubmissions)
		.set({
			submissionStatus,
			submittedAt: submissionStatus === "submitted" ? new Date() : null,
			updatedAt: new Date(),
		})
		.where(eq(workroomSubmissions.id, submissionId))
		.returning();

	return submission;
}

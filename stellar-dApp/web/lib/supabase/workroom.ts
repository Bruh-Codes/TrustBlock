import { formatDistanceToNowStrict } from "date-fns";
import { type EscrowCard, type TimelineMilestone } from "@/lib/escrow";
import {
	createInitialWorkroomState,
	type WorkroomComment,
	type WorkroomDraft,
	type WorkroomRole,
	type WorkroomSubmission,
	type WorkroomSubmissionStatus,
} from "@/lib/workroom";
import {
	getSupabaseBrowserClient,
	getSupabaseBrowserConfigError,
} from "./browser";

type WorkroomSubmissionRow = {
	id: string;
	escrow_id: string;
	milestone_id: string;
	revision_number: number;
	submitted_by_wallet: string;
	submitted_by_role: WorkroomRole;
	delivery_note: string;
	submission_status: WorkroomSubmissionStatus;
	submitted_at: string | null;
	created_at: string;
};

type WorkroomSubmissionLinkRow = {
	id: string;
	submission_id: string;
	label: string;
	url: string;
	position: number;
};

type WorkroomSubmissionFileRow = {
	id: string;
	submission_id: string;
	file_name: string;
	file_url: string;
	mime_type: string | null;
	size_bytes: string | number | null;
	storage_path: string | null;
};

type WorkroomCommentRow = {
	id: string;
	escrow_id: string;
	milestone_id: string;
	submission_id: string | null;
	author_wallet: string;
	author_role: WorkroomRole;
	comment_type: "general" | "request_changes" | "resolution_note";
	body: string;
	created_at: string;
};

function requireSupabaseBrowser() {
	const client = getSupabaseBrowserClient() as any;

	if (!client) {
		throw new Error(
			getSupabaseBrowserConfigError() ??
				"Supabase browser client is not configured.",
		);
	}

	return client;
}

function getRoleLabelMap(escrow: EscrowCard) {
	return {
		client: escrow.clientLabel,
		recipient: escrow.recipientLabel,
		resolver: escrow.resolverLabel,
	} satisfies Record<WorkroomRole, string>;
}

function formatTimestampLabel(value: string | null) {
	if (!value) {
		return "Just now";
	}

	try {
		return `${formatDistanceToNowStrict(new Date(value), { addSuffix: true })}`;
	} catch {
		return "Recently";
	}
}

function formatSizeLabel(sizeBytes: string | number | null) {
	if (sizeBytes === null || sizeBytes === undefined) {
		return undefined;
	}

	const size = typeof sizeBytes === "string" ? Number(sizeBytes) : sizeBytes;
	if (!Number.isFinite(size)) {
		return undefined;
	}

	if (size < 1024) {
		return `${size} B`;
	}

	if (size < 1024 * 1024) {
		return `${(size / 1024).toFixed(1)} KB`;
	}

	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fetchEscrowWorkroom(
	escrow: EscrowCard,
	milestones: TimelineMilestone[],
) {
	const supabase = requireSupabaseBrowser();
	const emptyState = createInitialWorkroomState(escrow.id, milestones);
	const roleLabels = getRoleLabelMap(escrow);
	const milestoneIdMap = new Map(
		milestones.map((milestone) => [milestone.rawId.toString(), milestone.id]),
	);

	const { data: submissionsData, error: submissionsError } = await supabase
		.from("workroom_submissions")
		.select("*")
		.eq("escrow_id", escrow.rawId.toString())
		.order("created_at", { ascending: false });

	if (submissionsError) {
		throw submissionsError;
	}

	const submissions = (submissionsData ?? []) as WorkroomSubmissionRow[];
	const submissionIds = submissions.map((submission) => submission.id);

	const [linksResult, filesResult, commentsResult] = await Promise.all([
		submissionIds.length > 0
			? supabase
					.from("workroom_submission_links")
					.select("*")
					.in("submission_id", submissionIds)
					.order("position", { ascending: true })
			: Promise.resolve({
					data: [] as WorkroomSubmissionLinkRow[],
					error: null,
				}),
		submissionIds.length > 0
			? supabase
					.from("workroom_submission_files")
					.select("*")
					.in("submission_id", submissionIds)
			: Promise.resolve({
					data: [] as WorkroomSubmissionFileRow[],
					error: null,
				}),
		supabase
			.from("workroom_comments")
			.select("*")
			.eq("escrow_id", escrow.rawId.toString())
			.order("created_at", { ascending: false }),
	]);

	if (linksResult.error) {
		throw linksResult.error;
	}

	if (filesResult.error) {
		throw filesResult.error;
	}

	if (commentsResult.error) {
		throw commentsResult.error;
	}

	const linksBySubmission = groupBy(
		(linksResult.data ?? []) as WorkroomSubmissionLinkRow[],
		(link) => link.submission_id,
	);
	const filesBySubmission = groupBy(
		(filesResult.data ?? []) as WorkroomSubmissionFileRow[],
		(file) => file.submission_id,
	);

	const submissionsByMilestone = { ...emptyState.submissionsByMilestone };
	for (const submission of submissions) {
		const milestoneId = milestoneIdMap.get(submission.milestone_id);
		if (!milestoneId) {
			continue;
		}

		const mappedSubmission: WorkroomSubmission = {
			id: submission.id,
			escrowId: escrow.id,
			milestoneId,
			revisionNumber: submission.revision_number,
			submittedByRole: submission.submitted_by_role,
			submittedByWalletLabel: roleLabels[submission.submitted_by_role],
			deliveryNote: submission.delivery_note,
			submissionStatus: submission.submission_status,
			submittedAtLabel: formatTimestampLabel(
				submission.submitted_at ?? submission.created_at,
			),
			links: (linksBySubmission[submission.id] ?? []).map((link) => ({
				id: link.id,
				label: link.label,
				url: link.url,
				position: link.position,
			})),
			files: (filesBySubmission[submission.id] ?? []).map((file) => ({
				id: file.id,
				fileName: file.file_name,
				fileUrl: file.file_url,
				mimeType: file.mime_type ?? undefined,
				sizeBytes:
					file.size_bytes === null
						? undefined
						: Number(file.size_bytes),
				sizeLabel: formatSizeLabel(file.size_bytes),
				storagePath: file.storage_path ?? undefined,
			})),
		};

		submissionsByMilestone[milestoneId] = [
			mappedSubmission,
			...(submissionsByMilestone[milestoneId] ?? []),
		];
	}

	const commentsByMilestone = { ...emptyState.commentsByMilestone };
	for (const comment of (commentsResult.data ?? []) as WorkroomCommentRow[]) {
		const milestoneId = milestoneIdMap.get(comment.milestone_id);
		if (!milestoneId) {
			continue;
		}

		const mappedComment: WorkroomComment = {
			id: comment.id,
			milestoneId,
			authorRole: comment.author_role,
			authorWalletLabel: roleLabels[comment.author_role],
			commentType: comment.comment_type,
			body: comment.body,
			createdAtLabel: formatTimestampLabel(comment.created_at),
		};

		commentsByMilestone[milestoneId] = [
			mappedComment,
			...(commentsByMilestone[milestoneId] ?? []),
		];
	}

	return {
		escrowId: escrow.id,
		submissionsByMilestone,
		commentsByMilestone,
		draftsByMilestone: emptyState.draftsByMilestone,
	};
}

export async function createSupabaseWorkroomSubmission(input: {
	escrow: EscrowCard;
	milestone: TimelineMilestone;
	draft: WorkroomDraft;
	authorRole: Extract<WorkroomRole, "client" | "recipient">;
	status: Extract<WorkroomSubmissionStatus, "shared" | "submitted">;
}) {
	const supabase = requireSupabaseBrowser();

	const { data: latestRevision, error: latestRevisionError } = await supabase
		.from("workroom_submissions")
		.select("revision_number")
		.eq("milestone_id", input.milestone.rawId.toString())
		.order("revision_number", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (latestRevisionError) {
		throw latestRevisionError;
	}

	const revisionNumber = (latestRevision?.revision_number ?? 0) + 1;
	const { data: insertedSubmission, error: submissionError } = await supabase
		.from("workroom_submissions")
		.insert({
			escrow_id: input.escrow.rawId.toString(),
			milestone_id: input.milestone.rawId.toString(),
			revision_number: revisionNumber,
			submitted_by_wallet:
				input.authorRole === "client"
					? input.escrow.clientAddress
					: input.escrow.recipientAddress,
			submitted_by_role: input.authorRole,
			delivery_note: input.draft.deliveryNote.trim(),
			submission_status: input.status,
			submitted_at: input.status === "submitted" ? new Date().toISOString() : null,
		})
		.select("id")
		.single();

	if (submissionError) {
		throw submissionError;
	}

	const submissionId = insertedSubmission.id;
	const links = input.draft.links.filter(
		(link) => link.label.trim() || link.url.trim(),
	);
	if (links.length > 0) {
		const { error } = await supabase.from("workroom_submission_links").insert(
			links.map((link, index) => ({
				submission_id: submissionId,
				label: link.label.trim() || `Link ${index + 1}`,
				url: link.url.trim(),
				position: index,
			})),
		);

		if (error) {
			throw error;
		}
	}

	const files = input.draft.files.filter(
		(file) => file.fileName.trim() && file.fileUrl.trim(),
	);
	if (files.length > 0) {
		const { error } = await supabase.from("workroom_submission_files").insert(
			files.map((file) => ({
				submission_id: submissionId,
				file_name: file.fileName.trim(),
				file_url: file.fileUrl.trim(),
				mime_type: file.mimeType ?? null,
				size_bytes: file.sizeBytes ?? null,
				storage_path: file.storagePath ?? null,
			})),
		);

		if (error) {
			throw error;
		}
	}

	return submissionId as string;
}

export async function createSupabaseWorkroomComment(input: {
	escrow: EscrowCard;
	milestone: TimelineMilestone;
	authorRole: WorkroomRole;
	body: string;
	commentType: "general" | "request_changes" | "resolution_note";
	submissionId?: string | null;
}) {
	const supabase = requireSupabaseBrowser();
	const authorWallet =
		input.authorRole === "client"
			? input.escrow.clientAddress
			: input.authorRole === "recipient"
				? input.escrow.recipientAddress
				: input.escrow.resolverAddress;

	const { error } = await supabase.from("workroom_comments").insert({
		escrow_id: input.escrow.rawId.toString(),
		milestone_id: input.milestone.rawId.toString(),
		submission_id: input.submissionId ?? null,
		author_wallet: authorWallet,
		author_role: input.authorRole,
		comment_type: input.commentType,
		body: input.body.trim(),
	});

	if (error) {
		throw error;
	}
}

export async function updateSupabaseWorkroomSubmissionStatus(
	submissionId: string,
	status: Exclude<WorkroomSubmissionStatus, "draft">,
) {
	const supabase = requireSupabaseBrowser();
	const { error } = await supabase
		.from("workroom_submissions")
		.update({
			submission_status: status,
			submitted_at: status === "submitted" ? new Date().toISOString() : null,
		})
		.eq("id", submissionId);

	if (error) {
		throw error;
	}
}

function groupBy<T>(items: T[], keySelector: (item: T) => string) {
	return items.reduce<Record<string, T[]>>((acc, item) => {
		const key = keySelector(item);
		acc[key] = [...(acc[key] ?? []), item];
		return acc;
	}, {});
}

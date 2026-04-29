import { type TimelineMilestone } from "@/lib/escrow";

export type WorkroomRole = "client" | "recipient" | "resolver";
export type WorkroomSubmissionStatus =
	| "draft"
	| "shared"
	| "submitted"
	| "changes_requested"
	| "accepted";
export type WorkroomCommentType =
	| "general"
	| "request_changes"
	| "resolution_note";

export type WorkroomSubmissionLink = {
	id: string;
	label: string;
	url: string;
	position: number;
};

export type WorkroomSubmissionFile = {
	id: string;
	fileName: string;
	fileUrl: string;
	mimeType?: string;
	sizeLabel?: string;
	sizeBytes?: number;
	storagePath?: string;
};

export type WorkroomComment = {
	id: string;
	milestoneId: string;
	authorRole: WorkroomRole;
	authorWalletLabel: string;
	commentType: WorkroomCommentType;
	body: string;
	createdAtLabel: string;
};

export type WorkroomSubmission = {
	id: string;
	escrowId: string;
	milestoneId: string;
	revisionNumber: number;
	submittedByRole: WorkroomRole;
	submittedByWalletLabel: string;
	deliveryNote: string;
	submissionStatus: WorkroomSubmissionStatus;
	submittedAtLabel: string;
	links: WorkroomSubmissionLink[];
	files: WorkroomSubmissionFile[];
};

export type WorkroomDraftLink = {
	id: string;
	label: string;
	url: string;
};

export type WorkroomDraftFile = {
	id: string;
	fileName: string;
	fileUrl: string;
	mimeType?: string;
	sizeLabel?: string;
	sizeBytes?: number;
	storagePath?: string;
};

export type WorkroomDraft = {
	deliveryNote: string;
	links: WorkroomDraftLink[];
	files: WorkroomDraftFile[];
};

export function createEmptyWorkroomDraft(): WorkroomDraft {
	return {
		deliveryNote: "",
		links: [{ id: "link-1", label: "", url: "" }],
		files: [],
	};
}

export function getWorkroomStatusLabel(
	status: WorkroomSubmissionStatus,
	role?: WorkroomRole,
) {
	switch (status) {
		case "shared":
			return role === "client" ? "Client update" : "Shared update";
		case "submitted":
			return "Submitted";
		case "changes_requested":
			return "Changes requested";
		case "accepted":
			return "Accepted";
		default:
			return "Draft";
	}
}

export function createInitialWorkroomState(
	escrowId: string,
	milestones: TimelineMilestone[],
) {
	const submissionsByMilestone = Object.fromEntries(
		milestones.map((milestone) => [milestone.id, [] as WorkroomSubmission[]]),
	);
	const commentsByMilestone = Object.fromEntries(
		milestones.map((milestone) => [milestone.id, [] as WorkroomComment[]]),
	);
	const draftsByMilestone = Object.fromEntries(
		milestones.map((milestone) => [milestone.id, createEmptyWorkroomDraft()]),
	);

	return {
		escrowId,
		submissionsByMilestone,
		commentsByMilestone,
		draftsByMilestone,
	};
}

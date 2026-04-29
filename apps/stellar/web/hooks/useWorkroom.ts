"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type EscrowCard, type TimelineMilestone } from "@/lib/escrow";
import { createInitialWorkroomState, type WorkroomDraft, type WorkroomRole } from "@/lib/workroom";
import {
	createSupabaseWorkroomComment,
	createSupabaseWorkroomSubmission,
	fetchEscrowWorkroom,
	updateSupabaseWorkroomSubmissionStatus,
} from "@/lib/supabase/workroom";

type UseWorkroomArgs = {
	escrow?: EscrowCard;
	milestones: TimelineMilestone[];
};

export function useWorkroom({ escrow, milestones }: UseWorkroomArgs) {
	const queryClient = useQueryClient();
	const queryKey = ["workroom", escrow?.id] as const;

	const workroomQuery = useQuery({
		queryKey,
		enabled: Boolean(escrow),
		queryFn: async () => {
			if (!escrow) {
				return createInitialWorkroomState("0", []);
			}

			return fetchEscrowWorkroom(escrow, milestones);
		},
	});

	const submissionMutation = useMutation({
		mutationFn: createSupabaseWorkroomSubmission,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	const commentMutation = useMutation({
		mutationFn: createSupabaseWorkroomComment,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	const updateSubmissionStatusMutation = useMutation({
		mutationFn: ({
			submissionId,
			status,
		}: {
			submissionId: string;
			status: "shared" | "submitted" | "changes_requested" | "accepted";
		}) => updateSupabaseWorkroomSubmissionStatus(submissionId, status),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	return {
		workroomState:
			escrow && workroomQuery.data
				? workroomQuery.data
				: createInitialWorkroomState(escrow?.id ?? "0", milestones),
		isLoading: workroomQuery.isLoading,
		errorMessage:
			workroomQuery.error instanceof Error ? workroomQuery.error.message : "",
		createSubmission: submissionMutation.mutateAsync,
		createComment: commentMutation.mutateAsync,
		updateSubmissionStatus: updateSubmissionStatusMutation.mutateAsync,
		isPersisting:
			submissionMutation.isPending ||
			commentMutation.isPending ||
			updateSubmissionStatusMutation.isPending,
		refetch: workroomQuery.refetch,
	};
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	Ban,
	CheckCircle2,
	Clock3,
	ExternalLink,
	Gavel,
	HandCoins,
	Scale,
	Send,
	ShieldAlert,
	Trash2,
	Undo2,
	Wallet,
} from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { ViewState } from "@/app/page";
import { useEscrowAction } from "@/hooks/useEscrowAction";
import { useEscrows } from "@/hooks/useEscrows";
import { useFundEscrow } from "@/hooks/useFundEscrow";
import { useWorkroom } from "@/hooks/useWorkroom";
import {
	ESCROW_STATUS,
	formatLongDate,
	getParticipantRole,
	isMilestoneSettled,
	MILESTONE_RELEASE_RULE,
	MILESTONE_STATUS,
	normalizeAddress,
	REFUND_POLICY,
	type EscrowCard,
	type TimelineMilestone,
} from "@/lib/escrow";
import {
	attachmentsBucketName,
	getSupabaseBrowserClient,
	getSupabaseBrowserConfigError,
} from "@/lib/supabase/browser";
import { fundingTokenDecimals, fundingTokenSymbol } from "@/lib/wagmi-helpers";
import {
	createEmptyWorkroomDraft,
	createInitialWorkroomState,
	getWorkroomStatusLabel,
	type WorkroomComment,
	type WorkroomDraft,
	type WorkroomSubmission,
} from "@/lib/workroom";

const milestoneToneClasses = [
	"milestone-tone-1",
	"milestone-tone-2",
	"milestone-tone-3",
	"milestone-tone-4",
] as const;

type ParticipantRole = ReturnType<typeof getParticipantRole>;
type DecoratedMilestone = TimelineMilestone & {
	tone: (typeof milestoneToneClasses)[number];
};
type WorkroomState = ReturnType<typeof createInitialWorkroomState>;

const CONTRACT_ID = "CAQGDVXYW6YHIMLXTNCINAPCZXZ37JKLACGEWXQULYJNAGB5JJBHV4NC";
const STELLAR_EXPLORER_BASE_URL = "https://stellar.expert/explorer/testnet";

function useNowUnixSeconds() {
	const [now, setNow] = useState<bigint>(0n);

	useEffect(() => {
		const updateNow = () => {
			setNow(BigInt(Math.floor(Date.now() / 1000)));
		};

		const timeoutId = window.setTimeout(updateNow, 0);
		const intervalId = window.setInterval(updateNow, 30_000);

		return () => {
			window.clearTimeout(timeoutId);
			window.clearInterval(intervalId);
		};
	}, []);

	return now;
}

export function EscrowDetailView({
	escrowId,
	onNavigate,
}: {
	escrowId?: string | null;
	onNavigate: (view: ViewState) => void;
}) {
	const {
		escrows,
		hasEscrows,
		isConnected,
		isLoading,
		contractsConfigured,
		isOnDeploymentChain,
		address,
		refetch,
	} = useEscrows();
	const [openDisputeFor, setOpenDisputeFor] = useState<string | null>(null);
	const [disputeReason, setDisputeReason] = useState("");
	const [openResolutionFor, setOpenResolutionFor] = useState<string | null>(
		null,
	);
	const [resolutionRecipientAmount, setResolutionRecipientAmount] =
		useState("");
	const [resolutionDetails, setResolutionDetails] = useState("");
	const [workroomStateByEscrow, setWorkroomStateByEscrow] = useState<
		Record<string, WorkroomState>
	>({});
	const [changeRequestDraftsByEscrow, setChangeRequestDraftsByEscrow] =
		useState<Record<string, Record<string, string>>>({});
	const [uploadingMilestones, setUploadingMilestones] = useState<
		Record<string, boolean>
	>({});
	const [workroomUploadError, setWorkroomUploadError] = useState<string | null>(
		null,
	);

	const selectedDeal = escrowId
		? escrows.find((deal) => deal.id === escrowId)
		: undefined;
	const participantRole: ParticipantRole = selectedDeal
		? getParticipantRole(selectedDeal, address)
		: "viewer";
	const contractExplorerHref = `${STELLAR_EXPLORER_BASE_URL}/contract/${CONTRACT_ID}`;
	const networkLabel = "Stellar TESTNET";
	const {
		fundEscrow,
		isApproving,
		isFunding,
		isProcessing: isFundProcessing,
		statusMessage: fundStatusMessage,
		errorMessage: fundErrorMessage,
	} = useFundEscrow({
		onSuccess: async () => {
			await refetch();
		},
	});
	const {
		executeEscrowAction,
		activeActionKey,
		isProcessing: isActionProcessing,
		statusMessage: actionStatusMessage,
		errorMessage: actionErrorMessage,
	} = useEscrowAction();

	const combinedStatusMessage = actionStatusMessage || fundStatusMessage;
	const combinedErrorMessage = actionErrorMessage || fundErrorMessage;
	const normalizedConnectedAddress = normalizeAddress(address);
	const canFundSelectedDeal =
		selectedDeal &&
		selectedDeal.rawStatus === ESCROW_STATUS.AWAITING_FUNDING &&
		participantRole === "client" &&
		normalizedConnectedAddress ===
			normalizeAddress(selectedDeal.clientAddress) &&
		normalizedConnectedAddress !==
			normalizeAddress(selectedDeal.recipientAddress);
	const canCancelSelectedDeal =
		selectedDeal &&
		selectedDeal.rawStatus === ESCROW_STATUS.AWAITING_FUNDING &&
		participantRole === "client";
	const fundActionLabel = isApproving
		? `Approve ${fundingTokenSymbol}`
		: isFunding
			? "Fund escrow"
			: isFundProcessing
				? "Waiting for confirmation"
				: "Fund escrow";
	const selectedEscrowMilestones = useMemo<DecoratedMilestone[]>(
		() =>
			selectedDeal?.milestones.map((milestone, index) => ({
				...milestone,
				tone: milestoneToneClasses[index % milestoneToneClasses.length],
			})) ?? [],
		[selectedDeal],
	);
	const {
		workroomState: persistedWorkroomState,
		isLoading: isWorkroomLoading,
		errorMessage: workroomErrorMessage,
		createSubmission,
		createComment,
		updateSubmissionStatus,
		isPersisting: isPersistingWorkroom,
	} = useWorkroom({
		escrow: selectedDeal,
		milestones: selectedEscrowMilestones,
	});
	const localWorkroomState = selectedDeal
		? (workroomStateByEscrow[selectedDeal.id] ??
			createInitialWorkroomState(selectedDeal.id, selectedEscrowMilestones))
		: createInitialWorkroomState("0", []);
	const workroomState = selectedDeal
		? {
				escrowId: selectedDeal.id,
				submissionsByMilestone: persistedWorkroomState.submissionsByMilestone,
				commentsByMilestone: persistedWorkroomState.commentsByMilestone,
				draftsByMilestone: localWorkroomState.draftsByMilestone,
			}
		: createInitialWorkroomState("0", []);
	const changeRequestDrafts = selectedDeal
		? (changeRequestDraftsByEscrow[selectedDeal.id] ?? {})
		: {};

	const refreshEscrows = async () => {
		await refetch();
	};

	const updateMilestoneDraft = (
		milestoneId: string,
		updater: (draft: WorkroomDraft) => WorkroomDraft,
	) => {
		if (!selectedDeal) {
			return;
		}

		setWorkroomStateByEscrow((current) => {
			const currentState =
				current[selectedDeal.id] ??
				createInitialWorkroomState(selectedDeal.id, selectedEscrowMilestones);

			return {
				...current,
				[selectedDeal.id]: {
					...currentState,
					draftsByMilestone: {
						...currentState.draftsByMilestone,
						[milestoneId]: updater(
							currentState.draftsByMilestone[milestoneId] ??
								createEmptyWorkroomDraft(),
						),
					},
				},
			};
		});
	};

	const appendDraftLink = (milestoneId: string) => {
		updateMilestoneDraft(milestoneId, (draft) => ({
			...draft,
			links: [
				...draft.links,
				{ id: `link-${draft.links.length + 1}`, label: "", url: "" },
			],
		}));
	};

	const removeDraftLink = (milestoneId: string, linkId: string) => {
		updateMilestoneDraft(milestoneId, (draft) => ({
			...draft,
			links: draft.links.filter((link) => link.id !== linkId),
		}));
	};

	const appendDraftFiles = async (
		milestoneId: string,
		fileList: FileList | null,
	) => {
		if (!fileList?.length) {
			return;
		}

		if (!selectedDeal) {
			return;
		}

		const supabaseBrowser = getSupabaseBrowserClient();
		if (!supabaseBrowser) {
			setWorkroomUploadError(getSupabaseBrowserConfigError());
			return;
		}

		setWorkroomUploadError(null);
		setUploadingMilestones((current) => ({
			...current,
			[milestoneId]: true,
		}));

		try {
			const uploadedFiles = await Promise.all(
				Array.from(fileList).map(async (file, index) => {
					const storagePath = buildAttachmentStoragePath({
						escrowId: selectedDeal.id,
						milestoneId,
						fileName: file.name,
						index,
					});
					const { error } = await supabaseBrowser.storage
						.from(attachmentsBucketName)
						.upload(storagePath, file, {
							cacheControl: "3600",
							upsert: false,
						});

					if (error) {
						throw error;
					}

					const { data } = supabaseBrowser.storage
						.from(attachmentsBucketName)
						.getPublicUrl(storagePath);

					return {
						id: `file-${Date.now()}-${index + 1}`,
						fileName: file.name,
						fileUrl: data.publicUrl,
						mimeType: file.type || undefined,
						sizeLabel: formatDraftFileSize(file.size),
						sizeBytes: file.size,
						storagePath,
					};
				}),
			);

			updateMilestoneDraft(milestoneId, (draft) => ({
				...draft,
				files: [...draft.files, ...uploadedFiles],
			}));
		} catch (error) {
			setWorkroomUploadError(getWorkroomUploadErrorMessage(error));
		} finally {
			setUploadingMilestones((current) => ({
				...current,
				[milestoneId]: false,
			}));
		}
	};

	const removeDraftFile = (milestoneId: string, fileId: string) => {
		updateMilestoneDraft(milestoneId, (draft) => ({
			...draft,
			files: draft.files.filter((file) => file.id !== fileId),
		}));
	};

	const persistDraftSubmission = async (
		milestone: TimelineMilestone,
		mode: "shared" | "submitted",
	) => {
		if (!selectedDeal) {
			return;
		}

		const draft =
			workroomState.draftsByMilestone[milestone.id] ??
			createEmptyWorkroomDraft();
		const hasWorkroomContent =
			draft.deliveryNote.trim().length > 0 ||
			draft.links.some((item) => item.label.trim() || item.url.trim()) ||
			draft.files.some((item) => item.fileName.trim() || item.fileUrl.trim());

		if (!hasWorkroomContent) {
			if (mode === "submitted") {
				await handleSubmitMilestone(milestone);
			}
			return;
		}

		try {
			const submissionId = await createSubmission({
				escrow: selectedDeal,
				milestone,
				draft,
				authorRole: participantRole === "client" ? "client" : "recipient",
				status: mode === "submitted" ? "shared" : "shared",
			});

			setWorkroomStateByEscrow((current) => {
				const currentState =
					current[selectedDeal.id] ??
					createInitialWorkroomState(selectedDeal.id, selectedEscrowMilestones);

				return {
					...current,
					[selectedDeal.id]: {
						...currentState,
						draftsByMilestone: {
							...currentState.draftsByMilestone,
							[milestone.id]: createEmptyWorkroomDraft(),
						},
					},
				};
			});

			if (mode === "submitted") {
				const submittedOnchain = await handleSubmitMilestone(milestone);
				if (submittedOnchain) {
					await updateSubmissionStatus({
						submissionId,
						status: "submitted",
					});
				}
			}
		} catch (error) {
			setWorkroomUploadError(getWorkroomUploadErrorMessage(error));
		}
	};

	const saveChangeRequest = async (milestone: TimelineMilestone) => {
		if (!selectedDeal) {
			return;
		}

		const body = changeRequestDrafts[milestone.id]?.trim();
		if (!body) {
			return;
		}

		try {
			const latestSubmission =
				workroomState.submissionsByMilestone[milestone.id]?.[0] ?? null;

			await createComment({
				escrow: selectedDeal,
				milestone,
				authorRole: "client",
				body,
				commentType: "request_changes",
				submissionId: latestSubmission?.id ?? null,
			});

			if (latestSubmission) {
				await updateSubmissionStatus({
					submissionId: latestSubmission.id,
					status: "changes_requested",
				});
			}

			setChangeRequestDraftsByEscrow((current) => ({
				...current,
				[selectedDeal.id]: {
					...(current[selectedDeal.id] ?? {}),
					[milestone.id]: "",
				},
			}));
		} catch (error) {
			setWorkroomUploadError(getWorkroomUploadErrorMessage(error));
		}
	};

	const handleCancelEscrow = async (escrow: EscrowCard) => {
		await executeEscrowAction({
			actionKey: `cancel-${escrow.id}`,
			functionName: "cancelEscrow",
			args: [escrow.rawId],
			pendingMessage: "Cancelling escrow draft...",
			successMessage: "Escrow cancelled successfully.",
			onSuccess: refreshEscrows,
		});
	};

	const handleSubmitMilestone = async (milestone: TimelineMilestone) => {
		return executeEscrowAction({
			actionKey: `submit-${milestone.id}`,
			functionName: "submitMilestone",
			args: [milestone.rawId],
			pendingMessage: "Submitting milestone for review...",
			successMessage: "Milestone submitted for review.",
			onSuccess: refreshEscrows,
		});
	};

	const handleApproveMilestone = async (milestone: TimelineMilestone) => {
		await executeEscrowAction({
			actionKey: `approve-${milestone.id}`,
			functionName: "approveMilestone",
			args: [milestone.rawId],
			pendingMessage: "Recording milestone approval...",
			successMessage: "Milestone approval recorded.",
			onSuccess: refreshEscrows,
		});
	};

	const handleApproveRefund = async (milestone: TimelineMilestone) => {
		await executeEscrowAction({
			actionKey: `refund-approve-${milestone.id}`,
			functionName: "approveRefund",
			args: [milestone.rawId],
			pendingMessage: "Recording refund approval...",
			successMessage: "Refund approval recorded.",
			onSuccess: refreshEscrows,
		});
	};

	const handleReleaseMilestone = async (milestone: TimelineMilestone) => {
		await executeEscrowAction({
			actionKey: `release-${milestone.id}`,
			functionName: "releaseMilestone",
			args: [milestone.rawId],
			pendingMessage: "Releasing milestone funds...",
			successMessage: "Milestone funds released successfully.",
			onSuccess: refreshEscrows,
		});
	};

	const handleRefundMilestone = async (milestone: TimelineMilestone) => {
		await executeEscrowAction({
			actionKey: `refund-${milestone.id}`,
			functionName: "refundMilestone",
			args: [milestone.rawId],
			pendingMessage: "Refunding milestone funds...",
			successMessage: "Milestone refunded successfully.",
			onSuccess: refreshEscrows,
		});
	};

	const handleOpenDispute = async (milestone: TimelineMilestone) => {
		if (!disputeReason.trim()) {
			return;
		}

		await executeEscrowAction({
			actionKey: `dispute-${milestone.id}`,
			functionName: "openDispute",
			args: [milestone.rawId, disputeReason.trim()],
			pendingMessage: "Opening dispute...",
			successMessage: "Dispute opened successfully.",
			onSuccess: async () => {
				setOpenDisputeFor(null);
				setDisputeReason("");
				await refreshEscrows();
			},
		});
	};

	const handleResolveDispute = async (milestone: TimelineMilestone) => {
		const normalizedAmount = resolutionRecipientAmount.trim() || "0";

		try {
			const recipientAmount = parseUnits(
				normalizedAmount,
				fundingTokenDecimals,
			);
			if (recipientAmount > milestone.amountValue) {
				return;
			}

			await executeEscrowAction({
				actionKey: `resolve-${milestone.id}`,
				functionName: "resolveDispute",
				args: [
					milestone.rawId,
					recipientAmount,
					milestone.amountValue - recipientAmount,
					resolutionDetails.trim() || "Resolved in TrustBlock ledger",
				],
				pendingMessage: "Resolving dispute...",
				successMessage: "Dispute resolved successfully.",
				onSuccess: async () => {
					setOpenResolutionFor(null);
					setResolutionRecipientAmount("");
					setResolutionDetails("");
					await refreshEscrows();
				},
			});
		} catch {
			return;
		}
	};

	if (!hasEscrows) {
		return (
			<div className="mx-auto flex max-w-6xl flex-col gap-5">
				{isConnected && !isOnDeploymentChain ? (
					<NetworkBanner networkLabel={networkLabel} />
				) : null}
				<div className="panel-surface p-5">
					<div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
						{!isConnected
							? "Connect a wallet to load escrow history."
							: !contractsConfigured
								? "Export the deployed contracts into the web app to load live escrow history."
								: isLoading
									? "Loading escrows..."
									: "No escrows found for this wallet yet."}
					</div>
				</div>
			</div>
		);
	}

	if (!selectedDeal) {
		return (
			<div className="mx-auto flex max-w-6xl flex-col gap-5">
				<div className="panel-surface p-5">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
								Escrow
							</p>
							<h2 className="mt-2 text-lg font-semibold text-foreground">
								Escrow not found
							</h2>
						</div>
						<button
							type="button"
							onClick={() => onNavigate("transactions")}
							className="ui-button-secondary px-4 py-2 text-sm font-semibold"
						>
							Back to ledger
						</button>
					</div>
					<div className="mt-5 rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
						This escrow was not found for the connected wallet on the selected
						network.
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-5">
			{isConnected && !isOnDeploymentChain ? (
				<NetworkBanner networkLabel={networkLabel} />
			) : null}
			<div className="panel-surface p-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="max-w-3xl">
						<div className="flex flex-wrap items-center gap-2">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
								Escrow detail
							</p>
							<RolePill role={participantRole} />
						</div>
						<h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
							{selectedDeal.title}
						</h2>
						<p className="mt-3 text-sm leading-7 text-muted-foreground">
							{selectedDeal.description}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => onNavigate("transactions")}
							className="ui-button-secondary px-4 py-2 text-sm font-semibold"
						>
							Back to ledger
						</button>
						{contractExplorerHref ? (
							<a
								href={contractExplorerHref}
								target="_blank"
								rel="noreferrer"
								className="ui-button-secondary px-4 py-2 text-sm font-semibold"
							>
								<ExternalLink className="h-4 w-4" />
								Contract
							</a>
						) : null}
					</div>
				</div>

				<div className="mt-5 grid gap-3.5 lg:grid-cols-4">
					<MetricCard label="Status" value={selectedDeal.status} />
					<MetricCard label="Escrow value" value={selectedDeal.amount} />
					<MetricCard label="Released" value={selectedDeal.released} />
					<MetricCard label="Pending" value={selectedDeal.pending} />
				</div>

				<div className="mt-5 grid gap-2.5 sm:grid-cols-3">
					<ParticipantCard
						label="Client"
						name={selectedDeal.clientName}
						address={selectedDeal.clientLabel}
					/>
					<ParticipantCard
						label="Recipient"
						name={selectedDeal.recipientName}
						address={selectedDeal.recipientLabel}
					/>
					<ParticipantCard
						label="Funding deadline"
						name={selectedDeal.fundingDeadlineLabel}
						address={selectedDeal.status}
					/>
				</div>

				<ActionNotice
					role={participantRole}
					selectedDeal={selectedDeal}
					canFundSelectedDeal={Boolean(canFundSelectedDeal)}
				/>

				{canFundSelectedDeal ? (
					<div className="mt-4 rounded-2xl border border-[color:color-mix(in_srgb,var(--accent)_28%,var(--border))] bg-[linear-gradient(180deg,rgba(183,243,77,0.12),rgba(183,243,77,0.04)),rgba(12,18,10,0.88)] p-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
									Awaiting funding
								</p>
								<p className="mt-2 text-sm leading-6 text-foreground">
									Fund this escrow when the draft is ready to go live.
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								{canCancelSelectedDeal ? (
									<ActionButton
										label="Cancel draft"
										onClick={() => handleCancelEscrow(selectedDeal)}
										variant="secondary"
										loading={
											activeActionKey === `cancel-${selectedDeal.id}` &&
											isActionProcessing
										}
									>
										<Ban className="h-4 w-4" />
									</ActionButton>
								) : null}
								<ActionButton
									label={fundActionLabel}
									onClick={() =>
										fundEscrow({
											escrowId: selectedDeal.rawId,
											totalAmount: selectedDeal.totalAmountValue,
										})
									}
									loading={isApproving || isFunding || isFundProcessing}
								>
									<Wallet className="h-4 w-4" />
								</ActionButton>
							</div>
						</div>
					</div>
				) : null}

				{combinedErrorMessage ? (
					<FeedbackBanner tone="error">{combinedErrorMessage}</FeedbackBanner>
				) : combinedStatusMessage ? (
					<FeedbackBanner tone="info">{combinedStatusMessage}</FeedbackBanner>
				) : null}
				{workroomErrorMessage ? (
					<FeedbackBanner tone="error">{workroomErrorMessage}</FeedbackBanner>
				) : null}
				{workroomUploadError ? (
					<FeedbackBanner tone="error">{workroomUploadError}</FeedbackBanner>
				) : null}

				<div className="mt-5 space-y-3">
					{selectedEscrowMilestones.map((milestone) => (
						<MilestoneCard
							key={milestone.id}
							milestone={milestone}
							selectedDeal={selectedDeal}
							participantRole={participantRole}
							workroomDraft={
								workroomState.draftsByMilestone[milestone.id] ??
								createEmptyWorkroomDraft()
							}
							submissions={
								workroomState.submissionsByMilestone[milestone.id] ?? []
							}
							comments={workroomState.commentsByMilestone[milestone.id] ?? []}
							changeRequestDraft={changeRequestDrafts[milestone.id] ?? ""}
							setChangeRequestDraft={(value) =>
								setChangeRequestDraftsByEscrow((current) => ({
									...current,
									[selectedDeal.id]: {
										...(current[selectedDeal.id] ?? {}),
										[milestone.id]: value,
									},
								}))
							}
							activeActionKey={activeActionKey}
							isActionProcessing={isActionProcessing}
							openDisputeFor={openDisputeFor}
							setOpenDisputeFor={setOpenDisputeFor}
							disputeReason={disputeReason}
							setDisputeReason={setDisputeReason}
							openResolutionFor={openResolutionFor}
							setOpenResolutionFor={setOpenResolutionFor}
							resolutionRecipientAmount={resolutionRecipientAmount}
							setResolutionRecipientAmount={setResolutionRecipientAmount}
							resolutionDetails={resolutionDetails}
							setResolutionDetails={setResolutionDetails}
							onSubmit={handleSubmitMilestone}
							onApprove={handleApproveMilestone}
							onApproveRefund={handleApproveRefund}
							onRelease={handleReleaseMilestone}
							onRefund={handleRefundMilestone}
							onOpenDispute={handleOpenDispute}
							onResolve={handleResolveDispute}
							onUpdateDraft={updateMilestoneDraft}
							onAddLink={appendDraftLink}
							onRemoveLink={removeDraftLink}
							onAddFiles={appendDraftFiles}
							onRemoveFile={removeDraftFile}
							isWorkroomLoading={isWorkroomLoading}
							isUploadingFiles={Boolean(uploadingMilestones[milestone.id])}
							isPersistingWorkroom={isPersistingWorkroom}
							onSaveDraft={persistDraftSubmission}
							onSaveChangeRequest={saveChangeRequest}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function MilestoneCard({
	milestone,
	selectedDeal,
	participantRole,
	workroomDraft,
	submissions,
	comments,
	changeRequestDraft,
	setChangeRequestDraft,
	activeActionKey,
	isActionProcessing,
	openDisputeFor,
	setOpenDisputeFor,
	disputeReason,
	setDisputeReason,
	openResolutionFor,
	setOpenResolutionFor,
	resolutionRecipientAmount,
	setResolutionRecipientAmount,
	resolutionDetails,
	setResolutionDetails,
	onSubmit,
	onApprove,
	onApproveRefund,
	onRelease,
	onRefund,
	onOpenDispute,
	onResolve,
	onUpdateDraft,
	onAddLink,
	onRemoveLink,
	onAddFiles,
	onRemoveFile,
	isWorkroomLoading,
	isUploadingFiles,
	isPersistingWorkroom,
	onSaveDraft,
	onSaveChangeRequest,
}: {
	milestone: DecoratedMilestone;
	selectedDeal: EscrowCard;
	participantRole: ParticipantRole;
	workroomDraft: WorkroomDraft;
	submissions: WorkroomSubmission[];
	comments: WorkroomComment[];
	changeRequestDraft: string;
	setChangeRequestDraft: (value: string) => void;
	activeActionKey: string | null;
	isActionProcessing: boolean;
	openDisputeFor: string | null;
	setOpenDisputeFor: React.Dispatch<React.SetStateAction<string | null>>;
	disputeReason: string;
	setDisputeReason: React.Dispatch<React.SetStateAction<string>>;
	openResolutionFor: string | null;
	setOpenResolutionFor: React.Dispatch<React.SetStateAction<string | null>>;
	resolutionRecipientAmount: string;
	setResolutionRecipientAmount: React.Dispatch<React.SetStateAction<string>>;
	resolutionDetails: string;
	setResolutionDetails: React.Dispatch<React.SetStateAction<string>>;
	onSubmit: (milestone: TimelineMilestone) => Promise<boolean | void>;
	onApprove: (milestone: TimelineMilestone) => Promise<void>;
	onApproveRefund: (milestone: TimelineMilestone) => Promise<void>;
	onRelease: (milestone: TimelineMilestone) => Promise<void>;
	onRefund: (milestone: TimelineMilestone) => Promise<void>;
	onOpenDispute: (milestone: TimelineMilestone) => Promise<void>;
	onResolve: (milestone: TimelineMilestone) => Promise<void>;
	onUpdateDraft: (
		milestoneId: string,
		updater: (draft: WorkroomDraft) => WorkroomDraft,
	) => void;
	onAddLink: (milestoneId: string) => void;
	onRemoveLink: (milestoneId: string, linkId: string) => void;
	onAddFiles: (milestoneId: string, files: FileList | null) => Promise<void>;
	onRemoveFile: (milestoneId: string, fileId: string) => void;
	isWorkroomLoading: boolean;
	isUploadingFiles: boolean;
	isPersistingWorkroom: boolean;
	onSaveDraft: (
		milestone: TimelineMilestone,
		mode: "shared" | "submitted",
	) => Promise<void>;
	onSaveChangeRequest: (milestone: TimelineMilestone) => Promise<void>;
}) {
	const now = useNowUnixSeconds();
	const escrowAllowsMilestoneActions =
		selectedDeal.rawStatus === ESCROW_STATUS.LIVE ||
		selectedDeal.rawStatus === ESCROW_STATUS.IN_REVIEW ||
		selectedDeal.rawStatus === ESCROW_STATUS.DISPUTED;
	const allowSubmit =
		escrowAllowsMilestoneActions &&
		participantRole === "recipient" &&
		milestone.rawStatus === MILESTONE_STATUS.PENDING &&
		selectedDeal.rawStatus === ESCROW_STATUS.LIVE;
	const allowApprove =
		(escrowAllowsMilestoneActions &&
			participantRole === "client" &&
			!milestone.clientApproved &&
			(milestone.rawStatus === MILESTONE_STATUS.IN_REVIEW ||
				milestone.rawStatus === MILESTONE_STATUS.APPROVED)) ||
		(escrowAllowsMilestoneActions &&
			participantRole === "recipient" &&
			milestone.releaseRule === MILESTONE_RELEASE_RULE.BOTH_PARTIES_APPROVE &&
			!milestone.recipientApproved &&
			milestone.rawStatus === MILESTONE_STATUS.IN_REVIEW);
	const allowRefundApproval =
		escrowAllowsMilestoneActions &&
		!isMilestoneSettled(milestone.rawStatus) &&
		milestone.rawStatus !== MILESTONE_STATUS.DISPUTED &&
		((participantRole === "client" && !milestone.clientRefundApproved) ||
			(participantRole === "recipient" && !milestone.recipientRefundApproved));
	const allowRelease =
		escrowAllowsMilestoneActions &&
		participantRole !== "viewer" &&
		(milestone.rawStatus === MILESTONE_STATUS.APPROVED ||
			(milestone.releaseRule ===
				MILESTONE_RELEASE_RULE.CLIENT_APPROVAL_OR_TIMEOUT &&
				milestone.rawStatus === MILESTONE_STATUS.IN_REVIEW &&
				milestone.reviewDeadline > 0n &&
				now >= milestone.reviewDeadline));
	const allowRefund =
		(escrowAllowsMilestoneActions &&
			participantRole === "client" &&
			milestone.refundPolicy === REFUND_POLICY.ON_EXPIRY_IF_UNAPPROVED &&
			milestone.rawStatus !== MILESTONE_STATUS.DISPUTED &&
			!isMilestoneSettled(milestone.rawStatus) &&
			milestone.dueDate > 0n &&
			now >= milestone.dueDate &&
			!milestone.clientApproved) ||
		(escrowAllowsMilestoneActions &&
			(participantRole === "client" || participantRole === "recipient") &&
			milestone.refundPolicy === REFUND_POLICY.MANUAL_ONLY &&
			milestone.clientRefundApproved &&
			milestone.recipientRefundApproved &&
			!isMilestoneSettled(milestone.rawStatus) &&
			milestone.rawStatus !== MILESTONE_STATUS.DISPUTED);
	const allowDispute =
		escrowAllowsMilestoneActions &&
		(participantRole === "client" || participantRole === "recipient") &&
		!isMilestoneSettled(milestone.rawStatus) &&
		milestone.rawStatus !== MILESTONE_STATUS.DISPUTED;
	const allowResolution =
		participantRole === "resolver" &&
		milestone.rawStatus === MILESTONE_STATUS.DISPUTED;
	const canComposeWorkroom =
		(participantRole === "recipient" || participantRole === "client") &&
		!isMilestoneSettled(milestone.rawStatus) &&
		milestone.rawStatus !== MILESTONE_STATUS.DISPUTED;
	const canRequestChanges =
		participantRole === "client" &&
		submissions.length > 0 &&
		!isMilestoneSettled(milestone.rawStatus) &&
		milestone.rawStatus !== MILESTONE_STATUS.DISPUTED;

	return (
		<div className={`ui-card p-3.5 ${milestone.tone}`}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<div className="ui-icon-box h-8 w-8">
							<TimelineIcon status={milestone.status} />
						</div>
						<div>
							<h4 className="text-main text-sm font-semibold">
								{milestone.title}
							</h4>
							<p className="text-muted mt-1 text-xs uppercase tracking-[0.16em]">
								{milestone.amount}
							</p>
						</div>
					</div>
					<p className="text-muted mt-2 text-sm leading-6">
						{milestone.description}
					</p>
					{milestone.releaseCondition ? (
						<p className="mt-2 text-sm leading-6 text-foreground/85">
							<span className="text-muted-foreground">Release condition:</span>{" "}
							{milestone.releaseCondition}
						</p>
					) : null}
				</div>
				<LedgerStatusBadge status={milestone.status} />
			</div>

			<div className="mt-3 flex flex-wrap gap-2">
				<span className="milestone-deadline-chip px-3 py-1 text-xs">
					{milestone.dueDate > 0n
						? `Due ${formatLongDate(milestone.dueDate)}`
						: selectedDeal.rawStatus === ESCROW_STATUS.LIVE
							? "Ready to start"
							: "Awaiting funding"}
				</span>
				{milestone.reviewDeadline > 0n ? (
					<span className="milestone-deadline-chip px-3 py-1 text-xs">
						Review until {formatLongDate(milestone.reviewDeadline)}
					</span>
				) : null}
			</div>

			<div className="mt-3 flex flex-wrap gap-2">
				<ApprovalChip
					label="Client approval"
					active={milestone.clientApproved}
				/>
				<ApprovalChip
					label="Recipient approval"
					active={milestone.recipientApproved}
				/>
				<ApprovalChip
					label="Refund: client"
					active={milestone.clientRefundApproved}
				/>
				<ApprovalChip
					label="Refund: recipient"
					active={milestone.recipientRefundApproved}
				/>
			</div>

			<div className="mt-4 rounded-xl border border-border/70 bg-background/20 p-3.5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
							Workroom
						</p>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">
							Deliverables, links, document attachments, and revision notes for
							this milestone.
						</p>
					</div>
					{participantRole === "recipient" ? (
						<span className="ui-chip px-2.5 py-1 text-[11px]">
							Recipient workspace
						</span>
					) : participantRole === "client" ? (
						<span className="ui-chip px-2.5 py-1 text-[11px]">
							Client review
						</span>
					) : null}
				</div>

				<div className="mt-4 space-y-3">
					{submissions.length > 0 ? (
						submissions.map((submission) => (
							<div
								key={submission.id}
								className="rounded-xl border border-border/70 bg-background/25 p-3"
							>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-foreground">
											Revision {submission.revisionNumber}
										</p>
										<p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
											{submission.submittedByWalletLabel} |{" "}
											{submission.submittedAtLabel}
										</p>
									</div>
									<span className="ui-chip px-2.5 py-1 text-[11px]">
										{getWorkroomStatusLabel(
											submission.submissionStatus,
											submission.submittedByRole,
										)}
									</span>
								</div>
								{submission.deliveryNote ? (
									<p className="mt-3 text-sm leading-6 text-muted-foreground">
										{submission.deliveryNote}
									</p>
								) : null}
								{submission.links.length > 0 ? (
									<div className="mt-3 flex flex-wrap gap-2">
										{submission.links.map((link) => (
											<a
												key={link.id}
												href={link.url}
												target="_blank"
												rel="noreferrer"
												className="ui-button-secondary px-3 py-1.5 text-xs font-semibold"
											>
												<ExternalLink className="h-3.5 w-3.5" />
												{link.label}
											</a>
										))}
									</div>
								) : null}
								{submission.files.length > 0 ? (
									<div className="mt-3 grid gap-2 sm:grid-cols-2">
										{submission.files.map((file) => (
											<a
												key={file.id}
												href={file.fileUrl}
												target="_blank"
												rel="noreferrer"
												className="rounded-xl border border-border/70 bg-background/25 px-3 py-2 text-sm text-foreground transition hover:bg-background/35"
											>
												<p className="font-semibold">{file.fileName}</p>
												<p className="mt-1 text-xs text-muted-foreground">
													{file.fileUrl}
												</p>
											</a>
										))}
									</div>
								) : null}
							</div>
						))
					) : isWorkroomLoading ? (
						<div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
							Loading workroom history...
						</div>
					) : (
						<div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
							No workroom submissions yet for this milestone.
						</div>
					)}
				</div>

				{comments.length > 0 ? (
					<div className="mt-4 space-y-2">
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
							Notes and requests
						</p>
						{comments.map((comment) => (
							<div
								key={comment.id}
								className="rounded-xl border border-border/70 bg-background/25 px-3 py-2.5"
							>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<p className="text-sm font-semibold text-foreground">
										{comment.authorWalletLabel}
									</p>
									<span className="ui-chip px-2.5 py-1 text-[11px]">
										{comment.commentType === "request_changes"
											? "Request changes"
											: comment.commentType === "resolution_note"
												? "Resolution note"
												: "Note"}
									</span>
								</div>
								<p className="mt-2 text-sm leading-6 text-muted-foreground">
									{comment.body}
								</p>
							</div>
						))}
					</div>
				) : null}

				{canComposeWorkroom ? (
					<div className="mt-4 rounded-xl border border-border/70 bg-background/25 p-3.5">
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
							{participantRole === "client"
								? "Share update"
								: "Prepare submission"}
						</p>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">
							Both sides can share files, links, and notes here. Only the
							recipient can formally submit the milestone for review.
						</p>
						<label className="mt-3 block">
							<span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
								Delivery note
							</span>
							<textarea
								value={workroomDraft.deliveryNote}
								onChange={(event) =>
									onUpdateDraft(milestone.id, (draft) => ({
										...draft,
										deliveryNote: event.target.value,
									}))
								}
								className="field-input min-h-24 resize-none"
								placeholder="Summarize what was delivered for this milestone."
							/>
						</label>

						<div className="mt-3 space-y-2">
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
									Links
								</p>
								<button
									type="button"
									onClick={() => onAddLink(milestone.id)}
									className="ui-button-secondary px-3 py-1.5 text-xs font-semibold"
								>
									Add link
								</button>
							</div>
							{workroomDraft.links.map((link, index) => (
								<div
									key={link.id}
									className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
								>
									<input
										value={link.label}
										onChange={(event) =>
											onUpdateDraft(milestone.id, (draft) => ({
												...draft,
												links: draft.links.map((item, itemIndex) =>
													itemIndex === index
														? { ...item, label: event.target.value }
														: item,
												),
											}))
										}
										className="field-input"
										placeholder="Prototype, drive folder, Loom"
									/>
									<input
										value={link.url}
										onChange={(event) =>
											onUpdateDraft(milestone.id, (draft) => ({
												...draft,
												links: draft.links.map((item, itemIndex) =>
													itemIndex === index
														? { ...item, url: event.target.value }
														: item,
												),
											}))
										}
										className="field-input"
										placeholder="https://"
									/>
									<button
										type="button"
										onClick={() => onRemoveLink(milestone.id, link.id)}
										className="ui-button-secondary h-11 w-11 justify-center px-0 py-0"
										aria-label="Remove link"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							))}
						</div>

						<div className="mt-3 space-y-2">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
								Files
							</p>
							<label className="block cursor-pointer rounded-xl border border-dashed border-border/70 bg-background/20 px-4 py-4 text-sm text-muted-foreground transition hover:bg-background/30">
								<input
									type="file"
									multiple
									className="sr-only"
									onChange={(event) => {
										onAddFiles(milestone.id, event.target.files);
										event.target.value = "";
									}}
								/>
								Choose files to attach to this milestone submission
							</label>
							{isUploadingFiles ? (
								<p className="text-sm text-[var(--accent)]">
									Uploading files to {attachmentsBucketName}...
								</p>
							) : null}
							{workroomDraft.files.length > 0 ? (
								<div className="space-y-2">
									{workroomDraft.files.map((file) => (
										<div
											key={file.id}
											className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/25 px-3 py-2.5"
										>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold text-foreground">
													{file.fileName}
												</p>
												<p className="mt-1 text-xs text-muted-foreground">
													{file.sizeLabel ?? "Selected file"}
												</p>
											</div>
											<button
												type="button"
												onClick={() => onRemoveFile(milestone.id, file.id)}
												className="ui-button-secondary h-10 w-10 justify-center px-0 py-0"
												aria-label="Remove file"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									))}
								</div>
							) : null}
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							<ActionButton
								label={
									participantRole === "client" ? "Post update" : "Save update"
								}
								onClick={() => onSaveDraft(milestone, "shared")}
								variant="secondary"
								disabled={isUploadingFiles || isPersistingWorkroom}
							>
								<ExternalLink className="h-4 w-4" />
							</ActionButton>
							{allowSubmit ? (
								<ActionButton
									label="Submit for review"
									onClick={() => onSaveDraft(milestone, "submitted")}
									disabled={isUploadingFiles || isPersistingWorkroom}
									loading={
										activeActionKey === `submit-${milestone.id}` &&
										isActionProcessing
									}
								>
									<Send className="h-4 w-4" />
								</ActionButton>
							) : null}
						</div>
					</div>
				) : null}

				{canRequestChanges ? (
					<div className="mt-4 rounded-xl border border-border/70 bg-background/25 p-3.5">
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
							Request changes
						</p>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">
							This is an offchain workroom note for the recipient. Use dispute
							if the issue needs onchain escalation.
						</p>
						<textarea
							value={changeRequestDraft}
							onChange={(event) => setChangeRequestDraft(event.target.value)}
							className="field-input mt-3 min-h-24 resize-none"
							placeholder="Describe what needs to be updated before approval."
						/>
						<div className="mt-3 flex justify-end">
							<ActionButton
								label="Send request"
								onClick={() => onSaveChangeRequest(milestone)}
								variant="secondary"
								disabled={!changeRequestDraft.trim() || isPersistingWorkroom}
							>
								<AlertCircle className="h-4 w-4" />
							</ActionButton>
						</div>
					</div>
				) : null}
			</div>

			{allowSubmit ||
			allowApprove ||
			allowRefundApproval ||
			allowRelease ||
			allowRefund ||
			allowDispute ||
			allowResolution ? (
				<div className="mt-4 flex flex-wrap gap-2">
					{allowSubmit ? (
						<ActionButton
							label="Submit milestone"
							onClick={() => onSubmit(milestone)}
							loading={
								activeActionKey === `submit-${milestone.id}` &&
								isActionProcessing
							}
						>
							<Send className="h-4 w-4" />
						</ActionButton>
					) : null}
					{allowApprove ? (
						<ActionButton
							label="Approve milestone"
							onClick={() => onApprove(milestone)}
							loading={
								activeActionKey === `approve-${milestone.id}` &&
								isActionProcessing
							}
						>
							<CheckCircle2 className="h-4 w-4" />
						</ActionButton>
					) : null}
					{allowRelease ? (
						<ActionButton
							label="Release funds"
							onClick={() => onRelease(milestone)}
							loading={
								activeActionKey === `release-${milestone.id}` &&
								isActionProcessing
							}
						>
							<HandCoins className="h-4 w-4" />
						</ActionButton>
					) : null}
					{allowRefundApproval ? (
						<ActionButton
							label="Approve refund"
							onClick={() => onApproveRefund(milestone)}
							variant="secondary"
							loading={
								activeActionKey === `refund-approve-${milestone.id}` &&
								isActionProcessing
							}
						>
							<Undo2 className="h-4 w-4" />
						</ActionButton>
					) : null}
					{allowRefund ? (
						<ActionButton
							label="Refund milestone"
							onClick={() => onRefund(milestone)}
							variant="secondary"
							loading={
								activeActionKey === `refund-${milestone.id}` &&
								isActionProcessing
							}
						>
							<Wallet className="h-4 w-4" />
						</ActionButton>
					) : null}
					{allowDispute ? (
						<ActionButton
							label={
								openDisputeFor === milestone.id
									? "Close dispute"
									: "Open dispute"
							}
							onClick={() => {
								setOpenResolutionFor(null);
								setOpenDisputeFor((current) =>
									current === milestone.id ? null : milestone.id,
								);
							}}
							variant="secondary"
						>
							<ShieldAlert className="h-4 w-4" />
						</ActionButton>
					) : null}
					{allowResolution ? (
						<ActionButton
							label={
								openResolutionFor === milestone.id
									? "Close resolution"
									: "Resolve dispute"
							}
							onClick={() => {
								setOpenDisputeFor(null);
								setOpenResolutionFor((current) =>
									current === milestone.id ? null : milestone.id,
								);
							}}
							variant="secondary"
						>
							<Gavel className="h-4 w-4" />
						</ActionButton>
					) : null}
				</div>
			) : null}

			{openDisputeFor === milestone.id ? (
				<div className="mt-4 rounded-xl border border-border/70 bg-background/25 p-3.5">
					<label className="block">
						<span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
							Dispute reason
						</span>
						<textarea
							value={disputeReason}
							onChange={(event) => setDisputeReason(event.target.value)}
							className="field-input min-h-24 resize-none"
							placeholder="Describe what is being contested."
						/>
					</label>
					<div className="mt-3 flex justify-end">
						<ActionButton
							label="Submit dispute"
							onClick={() => onOpenDispute(milestone)}
							disabled={!disputeReason.trim()}
							loading={
								activeActionKey === `dispute-${milestone.id}` &&
								isActionProcessing
							}
						>
							<Scale className="h-4 w-4" />
						</ActionButton>
					</div>
				</div>
			) : null}

			{openResolutionFor === milestone.id ? (
				<div className="mt-4 rounded-xl border border-border/70 bg-background/25 p-3.5">
					<div className="grid gap-3 md:grid-cols-2">
						<label className="block">
							<span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
								Recipient share ({fundingTokenSymbol})
							</span>
							<input
								type="text"
								inputMode="decimal"
								value={resolutionRecipientAmount}
								onChange={(event) =>
									setResolutionRecipientAmount(
										event.target.value.replace(/[^0-9.]/g, ""),
									)
								}
								className="field-input"
								placeholder="0"
							/>
						</label>
						<label className="block">
							<span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
								Client refund
							</span>
							<div className="field-input flex h-11 items-center">
								{deriveClientRefundLabel(
									resolutionRecipientAmount,
									milestone.amountValue,
								)}
							</div>
						</label>
					</div>
					<label className="mt-3 block">
						<span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
							Resolution note
						</span>
						<textarea
							value={resolutionDetails}
							onChange={(event) => setResolutionDetails(event.target.value)}
							className="field-input min-h-24 resize-none"
							placeholder="Explain the resolution."
						/>
					</label>
					<div className="mt-3 flex justify-end">
						<ActionButton
							label="Confirm resolution"
							onClick={() => onResolve(milestone)}
							disabled={isResolutionInvalid(
								resolutionRecipientAmount,
								milestone.amountValue,
							)}
							loading={
								activeActionKey === `resolve-${milestone.id}` &&
								isActionProcessing
							}
						>
							<Gavel className="h-4 w-4" />
						</ActionButton>
					</div>
				</div>
			) : null}
		</div>
	);
}

function MetricCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="ui-card p-4">
			<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
				{label}
			</p>
			<p className="mt-3 text-base font-semibold text-main">{value}</p>
		</div>
	);
}

function ParticipantCard({
	label,
	name,
	address,
}: {
	label: string;
	name: string;
	address: string;
}) {
	return (
		<div className="ui-card p-4">
			<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
				{label}
			</p>
			<p className="mt-3 text-sm font-semibold text-main">{name}</p>
			<p className="mt-1 text-sm text-muted-foreground">{address}</p>
		</div>
	);
}

function ActionNotice({
	role,
	selectedDeal,
	canFundSelectedDeal,
}: {
	role: ParticipantRole;
	selectedDeal: EscrowCard;
	canFundSelectedDeal: boolean;
}) {
	let message = "This escrow is visible to your connected wallet.";

	if (role === "client" && canFundSelectedDeal) {
		message =
			"You created this escrow. Fund it to move the agreement from draft to live.";
	} else if (
		role === "recipient" &&
		selectedDeal.rawStatus === ESCROW_STATUS.AWAITING_FUNDING
	) {
		message =
			"You are the recipient on this deal. It will become active once the client funds it.";
	} else if (
		role === "recipient" &&
		selectedDeal.rawStatus === ESCROW_STATUS.LIVE
	) {
		message =
			"You are the recipient on this deal. Submit milestones here as each delivery is ready.";
	} else if (
		role === "client" &&
		selectedDeal.rawStatus === ESCROW_STATUS.LIVE
	) {
		message =
			"You are the client on this deal. Review milestones, approve releases, and refund when needed.";
	} else if (role === "resolver") {
		message =
			"You are configured as resolver on this deal. Disputed milestones can be settled from this view.";
	}

	return (
		<div className="mt-5 rounded-2xl border border-border/70 bg-background/25 p-4 text-sm leading-6 text-muted-foreground">
			{message}
		</div>
	);
}

function ActionButton({
	label,
	onClick,
	children,
	variant = "primary",
	disabled = false,
	loading = false,
}: {
	label: string;
	onClick: () => void;
	children: React.ReactNode;
	variant?: "primary" | "secondary";
	disabled?: boolean;
	loading?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || loading}
			className={`px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
				variant === "secondary" ? "ui-button-secondary" : "ui-button-primary"
			}`}
		>
			{children}
			{loading ? "Working..." : label}
		</button>
	);
}

function FeedbackBanner({
	children,
	tone,
}: {
	children: React.ReactNode;
	tone: "info" | "error";
}) {
	return (
		<div
			className={`mt-5 rounded-2xl border p-4 text-sm ${
				tone === "error"
					? "border-[rgba(255,119,119,0.24)] bg-[linear-gradient(180deg,rgba(255,119,119,0.14),rgba(255,119,119,0.05)),rgba(20,10,10,0.88)] text-[#ffe8e8]"
					: "border-[color:color-mix(in_srgb,var(--accent)_32%,var(--border))] bg-[linear-gradient(180deg,rgba(183,243,77,0.14),rgba(183,243,77,0.05)),rgba(12,18,10,0.88)] text-[var(--text)]"
			}`}
		>
			<div className="flex items-start gap-3">
				{tone === "error" ? (
					<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
				) : (
					<Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
				)}
				<p>{children}</p>
			</div>
		</div>
	);
}

function RolePill({ role }: { role: ParticipantRole }) {
	const label =
		role === "client"
			? "Client"
			: role === "recipient"
				? "Recipient"
				: role === "resolver"
					? "Resolver"
					: "Viewer";

	return <span className="ui-chip px-2.5 py-1 text-[11px]">{label}</span>;
}

function ApprovalChip({ label, active }: { label: string; active: boolean }) {
	return (
		<span
			className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
				active
					? "bg-[rgba(183,243,77,0.16)] text-foreground"
					: "bg-background/40 text-muted-foreground"
			}`}
		>
			{label}
		</span>
	);
}

function TimelineIcon({ status }: { status: TimelineMilestone["status"] }) {
	if (status === "Released" || status === "Resolved") {
		return <CheckCircle2 className="h-5 w-5" />;
	}
	if (status === "In review" || status === "Approved") {
		return <Clock3 className="h-5 w-5" />;
	}
	if (status === "Disputed") {
		return <ShieldAlert className="h-5 w-5" />;
	}
	if (status === "Refunded") {
		return <Undo2 className="h-5 w-5" />;
	}
	return <Wallet className="h-5 w-5" />;
}

function LedgerStatusBadge({
	status,
}: {
	status: TimelineMilestone["status"];
}) {
	const toneClass =
		status === "Disputed"
			? "ledger-status-disputed"
			: status === "In review" || status === "Approved"
				? "ledger-status-review"
				: status === "Ready for delivery"
					? "ledger-status-review"
					: "ledger-status-completed";

	const Icon =
		status === "Disputed"
			? ShieldAlert
			: status === "Refunded"
				? Undo2
				: status === "Ready for delivery"
					? Wallet
					: status === "In review" || status === "Approved"
						? Clock3
						: CheckCircle2;

	return (
		<span className={`ledger-status-badge ${toneClass}`}>
			<Icon className="h-3.5 w-3.5" />
			{status}
		</span>
	);
}

function NetworkBanner({ networkLabel }: { networkLabel: string }) {
	return (
		<div className="rounded-2xl border border-[rgba(255,209,102,0.22)] bg-[linear-gradient(180deg,rgba(255,209,102,0.12),rgba(255,209,102,0.04)),rgba(24,19,11,0.88)] px-4 py-3 text-sm text-[#fff0c9]">
			Switch the wallet to {networkLabel} to approve, fund, or manage these
			escrows. The detail view is pinned to the deployed contracts on that
			network.
		</div>
	);
}

function deriveClientRefundLabel(
	recipientAmountInput: string,
	milestoneAmount: bigint,
) {
	try {
		const recipientAmount = parseUnits(
			recipientAmountInput.trim() || "0",
			fundingTokenDecimals,
		);

		if (recipientAmount > milestoneAmount) {
			return `Recipient share exceeds ${fundingTokenSymbol} milestone value`;
		}

		return `${formatTokenDisplay(milestoneAmount - recipientAmount)} ${fundingTokenSymbol}`;
	} catch {
		return `Enter a valid ${fundingTokenSymbol} amount`;
	}
}

function isResolutionInvalid(
	recipientAmountInput: string,
	milestoneAmount: bigint,
) {
	try {
		const recipientAmount = parseUnits(
			recipientAmountInput.trim() || "0",
			fundingTokenDecimals,
		);
		return recipientAmount > milestoneAmount;
	} catch {
		return true;
	}
}

function buildAttachmentStoragePath({
	escrowId,
	milestoneId,
	fileName,
	index,
}: {
	escrowId: string;
	milestoneId: string;
	fileName: string;
	index: number;
}) {
	const extension = fileName.includes(".")
		? `.${fileName.split(".").pop()}`
		: "";
	const normalizedBaseName = fileName
		.replace(/\.[^/.]+$/, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);

	return `escrows/${escrowId}/milestones/${milestoneId}/${Date.now()}-${index + 1}-${normalizedBaseName || "attachment"}${extension}`;
}

function getWorkroomUploadErrorMessage(error: unknown) {
	if (
		error &&
		typeof error === "object" &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message;
	}

	return "Attachment upload failed. Check the bucket policies and try again.";
}

function formatDraftFileSize(sizeInBytes: number) {
	if (sizeInBytes < 1024) {
		return `${sizeInBytes} B`;
	}

	if (sizeInBytes < 1024 * 1024) {
		return `${(sizeInBytes / 1024).toFixed(1)} KB`;
	}

	return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTokenDisplay(value: bigint) {
	return Number(formatUnits(value, fundingTokenDecimals)).toLocaleString(
		"en-US",
		{
			maximumFractionDigits: fundingTokenDecimals,
		},
	);
}

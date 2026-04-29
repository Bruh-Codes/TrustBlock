import type { KeyboardEvent, ReactNode } from "react";
import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  CircleHelp,
  FileText,
  ListChecks,
  Plus,
  Scale,
  SquareCheckBig,
  Trash2,
  Workflow,
} from "lucide-react";
import { ViewState } from "@/app/page";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWallet } from "@/components/WalletProvider";
import { useCreateEscrow } from "@/hooks/useCreateEscrow";
import {
  escrowPresets,
  milestoneTemplates,
  sampleMediators,
} from "@/lib/demo-data";
import { formatAddressLabel } from "@/lib/escrow";

const releaseDescriptions: Record<string, string> = {
  "Dual approval":
    "Funds release after both parties confirm the milestone outcome.",
  "Client approval + timeout":
    "Funds release after client approval, or automatically after the review window expires.",
};

const refundDescriptions: Record<string, string> = {
  "On expiry if unapproved":
    "If the agreement expires without approval, the escrow returns to the depositor.",
  "Mediator can split refund":
    "If a dispute is opened, the selected resolver can decide how the escrow is divided.",
  "Manual only":
    "Refunds require an explicit action and will not run automatically.",
};

const fundingWindowDescriptions: Record<string, string> = {
  "24 hours": "The depositor must fund the escrow within one day.",
  "48 hours": "The depositor must fund the escrow within two days.",
  "72 hours": "The depositor must fund the escrow within three days.",
};

const milestoneReleaseOptions = [
  "Client approval",
  "Both parties approve",
  "Client approval or timeout",
  "Custom",
] as const;

const milestoneToneClasses = [
  "milestone-tone-1",
  "milestone-tone-2",
  "milestone-tone-3",
  "milestone-tone-4",
] as const;

const setupSteps = [
  { id: "workflow", label: "Workflow", icon: Workflow },
  { id: "details", label: "Details", icon: FileText },
  { id: "milestones", label: "Milestones", icon: ListChecks },
  { id: "disputes", label: "Disputes", icon: Scale },
  { id: "review", label: "Review", icon: SquareCheckBig },
] as const;

type SetupStep = (typeof setupSteps)[number]["id"];
type MilestoneItem = (typeof milestoneTemplates)[number];
type MilestoneTone = (typeof milestoneToneClasses)[number];
type MilestoneStateItem = MilestoneItem & { tone: MilestoneTone };
type EscrowPresetItem = (typeof escrowPresets)[number];

const emptyMilestone = {
  title: "",
  description: "",
  amount: "",
  trigger: "Client approval",
  deadline: "",
};

const customPresetId = "preset-custom";
const emptyCustomPreset: EscrowPresetItem = {
  id: customPresetId,
  tag: "Custom",
  title: "Custom escrow",
  summary: "Blank starting point for a tailored escrow agreement.",
  client: "",
  vendor: "",
  amount: "",
  brief: "",
};

const emptyCustomTemplateDraft = {
  category: "Services",
  title: "",
  summary: "",
};

function isStellarAddress(value: string) {
  return value.startsWith("G") && value.length >= 20;
}

export function CreateEscrow({
  onNavigate,
}: {
  onNavigate: (view: ViewState) => void;
}) {
  const { address, status } = useWallet();
  const {
    handleCreateEscrow,
    isApproving,
    isCreating,
    isProcessing,
    statusMessage,
    errorMessage,
    fundingTokenConfigured,
    fundingTokenSymbol,
  } = useCreateEscrow({
    onSuccess: () => onNavigate("transactions"),
  });
  const [selectedPreset, setSelectedPreset] = useState(escrowPresets[0].id);
  const [customPreset, setCustomPreset] = useState<EscrowPresetItem>(
    emptyCustomPreset,
  );
  const [isCustomTemplateOpen, setIsCustomTemplateOpen] = useState(false);
  const [customTemplateDraft, setCustomTemplateDraft] = useState(
    emptyCustomTemplateDraft,
  );
  const [selectedMediator, setSelectedMediator] = useState(
    sampleMediators[0].id,
  );
  const [releaseType, setReleaseType] = useState("Dual approval");
  const [refundPolicy, setRefundPolicy] = useState("On expiry if unapproved");
  const [fundingWindow, setFundingWindow] = useState("48 hours");
  const [clientName, setClientName] = useState(escrowPresets[0].client);
  const [recipientName, setRecipientName] = useState(escrowPresets[0].vendor);
  const clientWallet = address ?? "";
  const [recipientWallet, setRecipientWallet] = useState("");
  const [contractTitle, setContractTitle] = useState(escrowPresets[0].title);
  const [contractAmount, setContractAmount] = useState(() =>
    formatAmountInput(parseAmount(escrowPresets[0].amount)),
  );
  const [contractDescription, setContractDescription] = useState(
    escrowPresets[0].brief,
  );
  const [milestones, setMilestones] = useState<MilestoneStateItem[]>(() =>
    milestoneTemplates.map((milestone, index) => ({
      ...milestone,
      tone: milestoneToneClasses[index % milestoneToneClasses.length],
    })),
  );
  const [activeStep, setActiveStep] = useState<SetupStep>("workflow");
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(
    null,
  );
  const [newMilestone, setNewMilestone] = useState(emptyMilestone);
  const [selectedMilestoneDate, setSelectedMilestoneDate] = useState<
    Date | undefined
  >(undefined);
  const [selectedMilestoneTrigger, setSelectedMilestoneTrigger] = useState<
    string | null
  >("Client approval");
  const isConnected = Boolean(address) && status === "connected";
  const contractsConfigured = true;
  const walletConfigured = true;

  const preset =
    selectedPreset === customPresetId
      ? customPreset
      : escrowPresets.find((item) => item.id === selectedPreset) ??
        escrowPresets[0];
  const selectedResolver =
    sampleMediators.find((item) => item.id === selectedMediator) ??
    sampleMediators[0];
  const stepIndex = setupSteps.findIndex((step) => step.id === activeStep);
  const normalizedContractAmount = sanitizeAmountInput(contractAmount);
  const normalizedMilestoneTotal = milestones.reduce(
    (sum, milestone) => sum + Number(sanitizeAmountInput(milestone.amount) || "0"),
    0,
  );
  const normalizedContractTotal = Number(normalizedContractAmount || "0");
  const milestoneTotalsMatch =
    milestones.length > 0 &&
    normalizedContractTotal > 0 &&
    Math.abs(normalizedMilestoneTotal - normalizedContractTotal) < 0.000001;
  const recipientWalletValid = isStellarAddress(recipientWallet);
  const isSubmitDisabled =
    !walletConfigured ||
    !contractsConfigured ||
    !fundingTokenConfigured ||
    isApproving ||
    isCreating ||
    isProcessing;
  const completedSteps = [
    Boolean(selectedPreset),
    Boolean(
      clientName &&
        recipientName &&
        clientWallet &&
        recipientWallet &&
        contractTitle &&
        contractAmount,
    ),
    milestones.length > 0,
    Boolean(selectedMediator),
  ].filter(Boolean).length;

  const openNewMilestoneDialog = () => {
    setEditingMilestoneId(null);
    setNewMilestone(emptyMilestone);
    setSelectedMilestoneDate(undefined);
    setSelectedMilestoneTrigger("Client approval");
    setIsAddMilestoneOpen(true);
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setActiveStep(setupSteps[stepIndex - 1].id);
    }
  };

  const goNext = () => {
    if (stepIndex < setupSteps.length - 1) {
      setActiveStep(setupSteps[stepIndex + 1].id);
    }
  };

  const applyPreset = (presetId: string, nextPreset?: EscrowPresetItem) => {
    const resolvedPreset =
      nextPreset ??
      (presetId === customPresetId
        ? customPreset
        : escrowPresets.find((item) => item.id === presetId) ?? escrowPresets[0]);

    setSelectedPreset(presetId);
    setClientName(resolvedPreset.client);
    setRecipientName(resolvedPreset.vendor);
    setRecipientWallet("");
    setContractTitle(resolvedPreset.title);
    setContractAmount(formatAmountInput(parseAmount(resolvedPreset.amount)));
    setContractDescription(resolvedPreset.brief);
    setMilestones(
      presetId === customPresetId
        ? []
        : milestoneTemplates.map((milestone, index) => ({
            ...milestone,
            tone: milestoneToneClasses[index % milestoneToneClasses.length],
          })),
    );
  };

  const openCustomTemplateDialog = () => {
    setCustomTemplateDraft({
      category: customPreset.tag === "Custom" ? "Services" : customPreset.tag,
      title: customPreset.title === "Custom escrow" ? "" : customPreset.title,
      summary:
        customPreset.summary ===
        "Blank starting point for a tailored escrow agreement."
          ? ""
          : customPreset.summary,
    });
    setIsCustomTemplateOpen(true);
  };

  const saveCustomTemplate = () => {
    const title = customTemplateDraft.title.trim() || "Custom escrow";
    const summary =
      customTemplateDraft.summary.trim() ||
      `Blank starting point for a ${customTemplateDraft.category.toLowerCase()} escrow agreement.`;

    const nextCustomPreset = {
      id: customPresetId,
      tag: customTemplateDraft.category,
      title,
      summary,
      client: "",
      vendor: "",
      amount: "",
      brief: summary,
    };

    setCustomPreset(nextCustomPreset);
    applyPreset(customPresetId, nextCustomPreset);
    setIsCustomTemplateOpen(false);
  };

  const submitEscrow = async () => {
    await handleCreateEscrow(
      {
        title: contractTitle,
        description: contractDescription,
        clientName,
        recipientName,
        recipientWallet,
        totalAmount: contractAmount,
        releaseType,
        refundPolicy,
        fundingWindow,
        selectedMediator,
        milestones,
      },
    );
  };

  const primaryActionLabel = isApproving
    ? `Approve ${fundingTokenSymbol}`
    : isCreating
      ? "Create escrow"
      : isProcessing
        ? "Waiting for confirmation"
        : "Create escrow";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <section className="panel-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              New escrow
            </p>
            <h2 className="mt-2 text-lg font-semibold text-foreground sm:text-xl">
              Set up a new escrow
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Move through the contract setup in sequence and keep the current
              decision in focus while the rest of the draft stays visible.
            </p>
          </div>
          <div className="ui-chip px-3.5 py-1.5 text-sm">
            {Math.min(completedSteps + 1, setupSteps.length)}/{setupSteps.length} in
            progress
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 md:grid-cols-5">
          {setupSteps.map((step, index) => (
            <StepPill
              key={step.id}
              icon={step.icon}
              label={step.label}
              active={activeStep === step.id}
              complete={index < completedSteps}
              onClick={() => setActiveStep(step.id)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.24fr_0.76fr]">
        <div className="panel-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Step {stepIndex + 1}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-foreground sm:text-xl">
                {stepTitle(activeStep)}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {stepHint(activeStep)}
              </p>
            </div>
          </div>

          {activeStep === "workflow" ? (
            <>
              <div className="mt-5">
                <SectionLabel
                  label="Template"
                  tooltip="Choose a ready-made structure or start a custom escrow from a clean draft."
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {escrowPresets.map((item) => {
                  const isActive = item.id === preset.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => applyPreset(item.id)}
                      className={`rounded-xl border p-3.5 text-left transition ${isActive ? "ui-nav-active" : "ui-selectable text-main"}`}
                    >
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${isActive ? "ui-nav-active-copy" : "text-muted"}`}
                      >
                        {item.tag}
                      </p>
                      <h3
                        className={`mt-2 text-[15px] font-semibold ${isActive ? "" : "text-main"}`}
                      >
                        {item.title}
                      </h3>
                      <p
                        className={`mt-2 text-sm leading-6 ${isActive ? "ui-nav-active-copy" : "text-muted"}`}
                      >
                        {item.summary}
                      </p>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={openCustomTemplateDialog}
                  className={`rounded-xl border border-dashed p-3.5 text-left transition ${
                    selectedPreset === customPresetId
                      ? "ui-nav-active"
                      : "ui-selectable text-main"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                          selectedPreset === customPresetId
                            ? "ui-nav-active-copy"
                            : "text-muted"
                        }`}
                      >
                        {customPreset.tag}
                      </p>
                      <h3
                        className={`mt-2 text-[15px] font-semibold ${
                          selectedPreset === customPresetId ? "" : "text-main"
                        }`}
                      >
                        {customPreset.title}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex size-8 items-center justify-center rounded-full ${
                        selectedPreset === customPresetId
                          ? "ui-nav-active-pill"
                          : "bg-[var(--surface-soft-hover)] text-foreground"
                      }`}
                    >
                      <Plus className="size-4" />
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      selectedPreset === customPresetId
                        ? "ui-nav-active-copy"
                        : "text-muted"
                    }`}
                  >
                    {customPreset.summary}
                  </p>
                </button>
              </div>
            </>
          ) : null}

          {activeStep === "details" ? (
            <>
              <div className="mt-5 grid gap-3.5 md:grid-cols-2">
                <Field label="Client">
                  <input
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    className="field-input"
                  />
                </Field>
                <Field label="Recipient">
                  <input
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                    className="field-input"
                  />
                </Field>
                <Field
                  label={
                    <FieldLabelWithTooltip
                      label="Client wallet"
                      tooltip="The connected wallet that creates and funds the escrow. This address controls client-side actions."
                    />
                  }
                >
                  <input
                    value={clientWallet}
                    className="field-input"
                    placeholder={
                      walletConfigured
                        ? "Connect wallet to populate"
                        : "Wallet unavailable"
                    }
                    readOnly
                  />
                </Field>
                <Field
                  label={
                    <FieldLabelWithTooltip
                      label="Recipient wallet"
                      tooltip="The wallet allowed to receive released funds and access the escrow as the delivery party."
                    />
                  }
                >
                  <input
                    value={recipientWallet}
                    onChange={(event) =>
                      setRecipientWallet(event.target.value)
                    }
                    className="field-input"
                    placeholder="G..."
                  />
                </Field>
                <Field label="Title">
                  <input
                    value={contractTitle}
                    onChange={(event) => setContractTitle(event.target.value)}
                    className="field-input"
                  />
                </Field>
                <Field label="Amount (XLM)">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={contractAmount}
                    onChange={(event) =>
                      setContractAmount(formatAmountInput(event.target.value))
                    }
                    className="field-input"
                    onKeyDown={preventNegativeInput}
                  />
                </Field>
              </div>

              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Wallet addresses define who can act onchain after the escrow is
                created. Dispute resolver access is assigned internally and is
                not exposed in this form.
              </p>

              {!walletConfigured ? (
                <p className="mt-3 text-xs leading-5 text-amber-700">
                  Wallet connection is unavailable in this form right now.
                </p>
              ) : !isConnected ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Connect your wallet from the header to lock the client wallet
                  for this escrow draft.
                </p>
              ) : null}

              <Field label="Description" className="mt-3.5">
                <textarea
                  value={contractDescription}
                  onChange={(event) =>
                    setContractDescription(event.target.value)
                  }
                  rows={4}
                  className="field-input min-h-24 resize-none"
                />
              </Field>

              <div className="mt-3.5 grid gap-3.5 md:grid-cols-3">
                <Field
                  label={
                    <FieldLabelWithTooltip
                      label="Release"
                      tooltip="Defines how escrowed funds can be released once a milestone is delivered."
                    />
                  }
                >
                  <Select
                    value={releaseType}
                    onValueChange={(value: string | null) => {
                      if (value) {
                        setReleaseType(value);
                      }
                    }}
                  >
                    <SelectTrigger className="field-input h-11 w-full px-3">
                      <SelectValue placeholder="Select release logic" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      alignItemWithTrigger={false}
                      className="min-w-64"
                    >
                      <SelectGroup>
                        <SelectItem value="Dual approval">Dual approval</SelectItem>
                        <SelectItem value="Client approval + timeout">
                          Client approval + timeout
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldHint>{releaseDescriptions[releaseType]}</FieldHint>
                </Field>
                <Field
                  label={
                    <FieldLabelWithTooltip
                      label="Refund"
                      tooltip="Sets the default refund path if the agreement expires or the milestone is not approved."
                    />
                  }
                >
                  <Select
                    value={refundPolicy}
                    onValueChange={(value: string | null) => {
                      if (value) {
                        setRefundPolicy(value);
                      }
                    }}
                  >
                    <SelectTrigger className="field-input h-11 w-full px-3">
                      <SelectValue placeholder="Select refund policy" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      alignItemWithTrigger={false}
                      className="min-w-64"
                    >
                      <SelectGroup>
                        <SelectItem value="On expiry if unapproved">
                          On expiry if unapproved
                        </SelectItem>
                        <SelectItem value="Mediator can split refund">
                          Mediator can split refund
                        </SelectItem>
                        <SelectItem value="Manual only">Manual only</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldHint>{refundDescriptions[refundPolicy]}</FieldHint>
                </Field>
                <Field
                  label={
                    <FieldLabelWithTooltip
                      label="Funding window"
                      tooltip="Defines how long the depositor has to fund the escrow after the draft is created."
                    />
                  }
                >
                  <Select
                    value={fundingWindow}
                    onValueChange={(value: string | null) => {
                      if (value) {
                        setFundingWindow(value);
                      }
                    }}
                  >
                    <SelectTrigger className="field-input h-11 w-full px-3">
                      <SelectValue placeholder="Select funding window" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      alignItemWithTrigger={false}
                      className="min-w-64"
                    >
                      <SelectGroup>
                        <SelectItem value="24 hours">24 hours</SelectItem>
                        <SelectItem value="48 hours">48 hours</SelectItem>
                        <SelectItem value="72 hours">72 hours</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldHint>{fundingWindowDescriptions[fundingWindow]}</FieldHint>
                </Field>
              </div>
            </>
          ) : null}

          {activeStep === "milestones" ? (
            <>
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Milestone schedule
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Double-click any milestone to edit it. Use the arrow
                    controls to reorder the release sequence.
                  </p>
                </div>
                <div className="ui-chip px-3 py-1.5 text-xs font-medium">
                  {milestones.length} milestones
                </div>
              </div>

              <div className="mt-4 max-w-4xl overflow-hidden rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-soft)]/35">
                <div className="max-h-[28rem] space-y-2.5 overflow-y-auto p-2.5">
                  {milestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className={`ui-card p-3.5 ${milestone.tone}`}
                      onDoubleClick={() =>
                        openMilestoneEditor(
                          milestone,
                          setEditingMilestoneId,
                          setNewMilestone,
                          setSelectedMilestoneDate,
                          setSelectedMilestoneTrigger,
                          setIsAddMilestoneOpen,
                        )
                      }
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {milestone.title}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-muted">
                            {milestone.description}
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="ui-chip px-3 py-1 text-xs font-medium">
                            {milestone.amount}
                          </div>
                          <div className="flex gap-1">
                            <IconActionButton
                              label="Move milestone up"
                              onClick={() =>
                                moveMilestone(setMilestones, index, "up")
                              }
                              disabled={index === 0}
                            >
                              <ArrowUp className="size-4" />
                            </IconActionButton>
                            <IconActionButton
                              label="Move milestone down"
                              onClick={() =>
                                moveMilestone(setMilestones, index, "down")
                              }
                              disabled={index === milestones.length - 1}
                            >
                              <ArrowDown className="size-4" />
                            </IconActionButton>
                            <IconActionButton
                              label="Remove milestone"
                              onClick={() =>
                                removeMilestone(setMilestones, milestone.id)
                              }
                            >
                              <Trash2 className="size-4" />
                            </IconActionButton>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="milestone-trigger-chip px-3 py-1 text-xs">
                          {milestone.trigger}
                        </span>
                        <span className="milestone-deadline-chip px-3 py-1 text-xs">
                          {milestone.deadline}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                className="mt-3.5 h-10 w-full justify-center border border-dashed border-[var(--border-strong)] bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-foreground hover:bg-[color:color-mix(in_srgb,var(--accent)_26%,transparent)]"
                onClick={openNewMilestoneDialog}
              >
                <Plus data-icon="inline-start" />
                Add milestone
              </Button>
            </>
          ) : null}

          {activeStep === "disputes" ? (
            <div className="mt-6">
              <SectionLabel
                label="Dispute resolution"
                tooltip="Choose how disagreements are handled if the client and recipient do not agree on the outcome."
              />
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                A dispute resolver is only used when the two parties cannot agree
                on a milestone result.
              </p>

            <div className="mt-4 space-y-2.5">
                {sampleMediators.map((mediator) => {
                  const isActive = mediator.id === selectedMediator;

                  return (
                    <button
                      key={mediator.id}
                      onClick={() => setSelectedMediator(mediator.id)}
                      className={`w-full rounded-xl border p-3.5 text-left transition ${isActive ? "ui-nav-active" : "ui-selectable text-main"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3
                              className={`text-sm font-semibold ${isActive ? "" : "text-main"}`}
                            >
                              {mediator.name}
                            </h3>
                            <Tooltip>
                              <TooltipTrigger
                                aria-label={`${mediator.name} fee information`}
                                className={`inline-flex size-4 shrink-0 items-center justify-center transition ${isActive ? "text-[color:color-mix(in_srgb,var(--accent-text)_78%,transparent)] hover:text-[var(--accent-text)]" : "text-muted-foreground hover:text-foreground"}`}
                              >
                                <CircleHelp className="size-3.5" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-56 text-pretty leading-5 normal-case">
                                {mediator.fee}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p
                            className={`mt-1 text-sm ${isActive ? "ui-nav-active-copy" : "text-muted"}`}
                          >
                            {mediator.specialty}
                          </p>
                        </div>
                        {mediator.fee !== "No dispute fee" ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${isActive ? "ui-nav-active-pill" : "ui-chip"}`}
                          >
                            {mediator.fee}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Fees apply only if a dispute is opened and the selected review
                path is used.
              </p>
            </div>
          ) : null}

          {activeStep === "review" ? (
            <>
              <div className="mt-5 grid gap-3.5 md:grid-cols-3">
                <div className="ui-card p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Counterparties
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {clientName || "Not set"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {recipientName || "Not set"}
                  </p>
                </div>
                <div className="ui-card p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Access
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Client wallet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatAddressLabel(clientWallet)}
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Recipient wallet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatAddressLabel(recipientWallet)}
                  </p>
                </div>
                <div className="ui-card p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Terms
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {contractAmount
                      ? `${contractAmount} ${fundingTokenSymbol}`
                      : "Not set"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {releaseType} · {fundingWindow}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 space-y-2.5">
                {!isConnected ? (
                  <StatusNotice tone="warning">
                    Connect the client wallet before creating the escrow.
                  </StatusNotice>
                ) : null}

                {!recipientWallet ? (
                  <StatusNotice tone="warning">
                    Enter the recipient wallet address before submitting.
                  </StatusNotice>
                ) : null}

                {recipientWallet && !recipientWalletValid ? (
                  <StatusNotice tone="warning">
                    Enter a valid recipient wallet before submitting.
                  </StatusNotice>
                ) : null}

                {!contractTitle.trim() ? (
                  <StatusNotice tone="warning">
                    Add an escrow title before submitting.
                  </StatusNotice>
                ) : null}

                {!contractAmount.trim() ? (
                  <StatusNotice tone="warning">
                    Set the escrow amount before submitting.
                  </StatusNotice>
                ) : null}

                {milestones.length === 0 ? (
                  <StatusNotice tone="warning">
                    Add at least one milestone before submitting.
                  </StatusNotice>
                ) : null}

                {!milestoneTotalsMatch ? (
                  <StatusNotice tone="warning">
                    Milestone amounts must add up to the contract total before
                    the transaction can be sent.
                  </StatusNotice>
                ) : null}

                {errorMessage ? (
                  <StatusNotice tone="error">{errorMessage}</StatusNotice>
                ) : null}

                {!errorMessage && statusMessage ? (
                  <StatusNotice tone="info">{statusMessage}</StatusNotice>
                ) : null}
              </div>
            </>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="ui-button-secondary px-4 py-2.5 text-sm font-semibold"
              >
                Back
              </button>
            ) : null}
            {activeStep !== "review" ? (
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={goNext}
                  className="ui-button-primary px-5 py-2.5 text-sm font-semibold"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="ml-auto flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={submitEscrow}
                  disabled={isSubmitDisabled}
                  className="ui-button-primary px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {primaryActionLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("transactions")}
                  className="ui-button-secondary px-5 py-2.5 text-sm font-semibold"
                >
                  Open Ledger
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3.5 xl:sticky xl:top-5 xl:self-start">
          <div className="panel-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Draft snapshot
            </p>
            <h2 className="mt-2 text-base font-semibold text-foreground sm:text-lg">
              {contractTitle || "Untitled escrow"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A compact reference while you move through each setup stage.
            </p>

            <div className="mt-4 space-y-3.5">
              <SummaryRow label="Client" value={clientName || "Not set"} />
              <SummaryRow
                label="Client wallet"
                value={formatAddressLabel(clientWallet)}
              />
              <SummaryRow
                label="Recipient"
                value={recipientName || "Not set"}
              />
              <SummaryRow
                label="Recipient wallet"
                value={formatAddressLabel(recipientWallet)}
              />
              <SummaryRow
                label="Amount"
                value={contractAmount ? `${contractAmount} XLM` : "Not set"}
              />
              <SummaryRow
                label="Milestones"
                value={`${milestones.length} releases`}
              />
              <SummaryRow
                label="Dispute resolution"
                value={selectedResolver.name}
              />
            </div>
          </div>

          <div className="panel-surface p-4.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current focus
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              {stepTitle(activeStep)}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {stepHint(activeStep)}
            </p>
          </div>
        </div>
      </section>

      <Dialog
        open={isCustomTemplateOpen}
        onOpenChange={setIsCustomTemplateOpen}
      >
        <DialogContent className="max-w-lg bg-[var(--surface-strong)] text-foreground">
          <DialogHeader>
            <DialogTitle>Create custom template</DialogTitle>
            <DialogDescription>
              Start a new escrow from a clean draft. Choose the business
              category and name the template before filling in the contract
              details.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field label="Category">
              <Select
                value={customTemplateDraft.category}
                onValueChange={(value: string | null) => {
                  if (value) {
                    setCustomTemplateDraft((current) => ({
                      ...current,
                      category: value,
                    }));
                  }
                }}
              >
                <SelectTrigger className="field-input h-11 w-full px-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  alignItemWithTrigger={false}
                  className="min-w-64"
                >
                  <SelectGroup>
                    <SelectItem value="Services">Services</SelectItem>
                    <SelectItem value="Trade">Trade</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldHint>
                This sets the template category shown in the workflow step.
              </FieldHint>
            </Field>

            <Field label="Template name">
              <input
                value={customTemplateDraft.title}
                onChange={(event) =>
                  setCustomTemplateDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="field-input"
                placeholder="Custom supplier escrow"
              />
            </Field>

            <Field label="Summary">
              <textarea
                value={customTemplateDraft.summary}
                onChange={(event) =>
                  setCustomTemplateDraft((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                rows={3}
                className="field-input min-h-24 resize-none"
                placeholder="Blank starting point for a tailored supplier escrow agreement."
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCustomTemplateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveCustomTemplate}>
              Use custom template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMilestoneOpen} onOpenChange={setIsAddMilestoneOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-xl bg-[var(--surface-strong)] text-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingMilestoneId ? "Edit milestone" : "Add milestone"}
            </DialogTitle>
            <DialogDescription>
              {editingMilestoneId
                ? "Update the delivery, release amount, approval rule, and due date for this milestone."
                : "Define the delivery, release amount, approval rule, and due date for the next payout step."}
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-4 flex max-h-[calc(100vh-14rem)] flex-col gap-4 overflow-y-auto px-4">
            <Field label="Title">
              <input
                value={newMilestone.title}
                onChange={(event) =>
                  setNewMilestone((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="field-input"
                placeholder="Final QA review"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={newMilestone.description}
                onChange={(event) =>
                  setNewMilestone((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                className="field-input min-h-24 resize-none"
                placeholder="Describe the delivery required before release."
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount (XLM)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={newMilestone.amount}
                  onChange={(event) =>
                    setNewMilestone((current) => ({
                      ...current,
                      amount: formatAmountInput(event.target.value),
                    }))
                  }
                  onKeyDown={preventNegativeInput}
                  className="field-input"
                  placeholder="5000"
                />
              </Field>
              <Field label="Due date">
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-between px-3 font-normal"
                      />
                    }
                  >
                    <span
                      className={
                        newMilestone.deadline
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {newMilestone.deadline || "Select due date"}
                    </span>
                    <CalendarDays data-icon="inline-end" />
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-auto bg-[var(--surface-strong)] p-2"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedMilestoneDate}
                      disabled={{ before: startOfToday() }}
                      onSelect={(date) => {
                        setSelectedMilestoneDate(date);
                        setNewMilestone((current) => ({
                          ...current,
                          deadline: date ? formatDueDate(date) : "",
                        }));
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
            </div>
            <Field label="Release condition">
              <div className="flex flex-col gap-3">
                <Select
                  value={selectedMilestoneTrigger}
                  onValueChange={(value: string | null) => {
                    setSelectedMilestoneTrigger(value);
                    setNewMilestone((current) => ({
                      ...current,
                      trigger:
                        value && value !== "Custom"
                          ? value
                          : value === "Custom"
                            ? ""
                            : current.trigger,
                    }));
                  }}
                >
                  <SelectTrigger className="field-input h-11 w-full px-3">
                    <SelectValue placeholder="Select release condition" />
                  </SelectTrigger>
                  <SelectContent
                    align="start"
                    alignItemWithTrigger={false}
                    className="min-w-64"
                  >
                    <SelectGroup>
                      {milestoneReleaseOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {selectedMilestoneTrigger === "Custom" ? (
                  <input
                    value={newMilestone.trigger}
                    onChange={(event) =>
                      setNewMilestone((current) => ({
                        ...current,
                        trigger: event.target.value,
                      }))
                    }
                    className="field-input"
                    placeholder="Describe the release condition"
                  />
                ) : null}
              </div>
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                resetMilestoneDialog(
                  setIsAddMilestoneOpen,
                  setEditingMilestoneId,
                  setNewMilestone,
                  setSelectedMilestoneDate,
                  setSelectedMilestoneTrigger,
                )
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (editingMilestoneId) {
                  updateMilestone(setMilestones, editingMilestoneId, newMilestone);
                } else {
                  addMilestone(setMilestones, milestones.length, newMilestone);
                }
                resetMilestoneDialog(
                  setIsAddMilestoneOpen,
                  setEditingMilestoneId,
                  setNewMilestone,
                  setSelectedMilestoneDate,
                  setSelectedMilestoneTrigger,
                );
              }}
              disabled={!isMilestoneDraftValid(newMilestone)}
            >
              {editingMilestoneId ? "Save changes" : "Add milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-muted mb-2 block text-xs font-semibold uppercase tracking-[0.18em] whitespace-nowrap">
        {label}
      </span>
      {children}
    </label>
  );
}

function StepPill({
  icon: Icon,
  label,
  active,
  complete,
  onClick,
}: {
  icon: typeof Workflow;
  label: string;
  active: boolean;
  complete: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        active ? "ui-nav-active" : "ui-selectable"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
            active
              ? "bg-[color:color-mix(in_srgb,var(--accent-text)_12%,transparent)] text-[var(--accent-text)]"
              : complete
                ? "bg-[var(--surface-stronger)] text-foreground"
                : "bg-[var(--surface-soft-hover)] text-muted-foreground"
          }`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${active ? "" : "text-foreground"}`}>
            {label}
          </p>
          <p
            className={`mt-1 text-xs ${active ? "ui-nav-active-copy" : "text-muted-foreground"}`}
          >
            {complete ? "Ready" : "Pending"}
          </p>
        </div>
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-subtle flex items-start justify-between gap-4 border-b pb-4 text-sm last:border-b-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="text-main max-w-[16rem] text-right font-medium">
        {value}
      </span>
    </div>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs leading-5 text-muted-foreground">{children}</p>;
}

function StatusNotice({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "info" | "warning" | "error";
}) {
  const config =
    tone === "error"
      ? {
          label: "Action blocked",
          containerClass:
            "border-[rgba(255,119,119,0.24)] bg-[linear-gradient(180deg,rgba(255,119,119,0.14),rgba(255,119,119,0.05)),rgba(20,10,10,0.88)] text-[#ffe8e8]",
          pillClass:
            "border-[rgba(255,119,119,0.26)] bg-[rgba(255,119,119,0.16)] text-[#ffd7d7]",
        }
      : tone === "warning"
        ? {
            label: "Needs input",
            containerClass:
              "border-[rgba(255,209,102,0.22)] bg-[linear-gradient(180deg,rgba(255,209,102,0.12),rgba(255,209,102,0.04)),rgba(24,19,11,0.88)] text-[#fff0c9]",
            pillClass:
              "border-[rgba(255,209,102,0.28)] bg-[rgba(255,209,102,0.14)] text-[#fff0c9]",
          }
        : {
            label: "Onchain status",
            containerClass:
              "border-[color:color-mix(in_srgb,var(--accent)_32%,var(--border))] bg-[linear-gradient(180deg,rgba(183,243,77,0.14),rgba(183,243,77,0.05)),rgba(12,18,10,0.88)] text-[var(--text)]",
            pillClass:
              "border-[color:color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--text)]",
          };

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-2xl border px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${config.containerClass}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${config.pillClass}`}
        >
          {config.label}
        </span>
        <p className="pt-0.5 text-sm leading-6">{children}</p>
      </div>
    </div>
  );
}

function IconActionButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`size-10 rounded-xl p-0 disabled:cursor-not-allowed disabled:opacity-40 ${
        label === "Remove milestone"
          ? "milestone-delete-button"
          : "ui-button-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-muted text-xs font-semibold uppercase tracking-[0.2em]">
        {label}
      </p>
      <Tooltip>
        <TooltipTrigger
          aria-label={`${label} information`}
          className="inline-flex size-4 items-center justify-center text-muted-foreground/80 transition hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
        >
          <CircleHelp className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-56 text-pretty leading-5">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function FieldLabelWithTooltip({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger
          aria-label={`${label} information`}
          className="inline-flex size-4 items-center justify-center text-muted-foreground/80 normal-case transition hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
        >
          <CircleHelp className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-56 text-pretty leading-5 normal-case">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

function parseAmount(amount: string) {
  return amount.replace(/[^0-9.]/g, "");
}

function preventNegativeInput(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "-" || event.key === "e" || event.key === "E") {
    event.preventDefault();
  }
}

function moveMilestone(
  setMilestones: React.Dispatch<React.SetStateAction<MilestoneStateItem[]>>,
  index: number,
  direction: "up" | "down",
) {
  setMilestones((current) => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= current.length) {
      return current;
    }

    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  });
}

function removeMilestone(
  setMilestones: React.Dispatch<React.SetStateAction<MilestoneStateItem[]>>,
  id: string,
) {
  setMilestones((current) =>
    current.length > 1
      ? current.filter((milestone) => milestone.id !== id)
      : current,
  );
}

function addMilestone(
  setMilestones: React.Dispatch<React.SetStateAction<MilestoneStateItem[]>>,
  count: number,
  draft: Omit<MilestoneItem, "id">,
) {
  setMilestones((current) => [
    ...current,
    {
      id: `m${count + 1}`,
      title: draft.title.trim(),
      description: draft.description.trim(),
      amount: formatMilestoneAmount(draft.amount),
      trigger: draft.trigger.trim(),
      deadline: draft.deadline.trim(),
      tone: milestoneToneClasses[count % milestoneToneClasses.length],
    },
  ]);
}

function updateMilestone(
  setMilestones: React.Dispatch<React.SetStateAction<MilestoneStateItem[]>>,
  id: string,
  draft: Omit<MilestoneItem, "id">,
) {
  setMilestones((current) =>
    current.map((milestone) =>
      milestone.id === id
        ? {
            ...milestone,
            title: draft.title.trim(),
            description: draft.description.trim(),
            amount: formatMilestoneAmount(draft.amount),
            trigger: draft.trigger.trim(),
            deadline: draft.deadline.trim(),
          }
        : milestone,
    ),
  );
}

function isMilestoneDraftValid(draft: Omit<MilestoneItem, "id">) {
  return Boolean(
    draft.title.trim() &&
      draft.description.trim() &&
      draft.amount.trim() &&
      draft.trigger.trim() &&
      draft.deadline.trim(),
  );
}

function formatDueDate(date: Date) {
  return `Due ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function stepTitle(step: SetupStep) {
  switch (step) {
    case "workflow":
      return "Choose how the new escrow starts";
    case "details":
      return "Define the escrow terms";
    case "milestones":
      return "Build the milestone schedule";
    case "disputes":
      return "Set dispute handling";
    case "review":
      return "Review the new escrow";
  }
}

function stepHint(step: SetupStep) {
  switch (step) {
    case "workflow":
      return "Choose the starting structure for this new escrow before refining the agreement.";
    case "details":
      return "Confirm the parties, escrow amount, release rule, refund behavior, and funding window.";
    case "milestones":
      return "Break the new escrow into clear release checkpoints that can be reviewed one by one.";
    case "disputes":
      return "Choose how disagreements will be handled if the client and recipient cannot agree.";
    case "review":
      return "Check the final structure before creating the new escrow draft.";
  }
}

function openMilestoneEditor(
  milestone: MilestoneStateItem,
  setEditingMilestoneId: React.Dispatch<React.SetStateAction<string | null>>,
  setNewMilestone: React.Dispatch<
    React.SetStateAction<Omit<MilestoneItem, "id">>
  >,
  setSelectedMilestoneDate: React.Dispatch<
    React.SetStateAction<Date | undefined>
  >,
  setSelectedMilestoneTrigger: React.Dispatch<
    React.SetStateAction<string | null>
  >,
  setIsAddMilestoneOpen: React.Dispatch<React.SetStateAction<boolean>>,
) {
  setEditingMilestoneId(milestone.id);
  setNewMilestone({
    title: milestone.title,
    description: milestone.description,
    amount: parseAmount(milestone.amount),
    trigger: milestone.trigger,
    deadline: milestone.deadline,
  });
  setSelectedMilestoneDate(parseDueDate(milestone.deadline));
  setSelectedMilestoneTrigger(
    milestoneReleaseOptions.includes(
      milestone.trigger as (typeof milestoneReleaseOptions)[number],
    )
      ? milestone.trigger
      : "Custom",
  );
  setIsAddMilestoneOpen(true);
}

function resetMilestoneDialog(
  setIsAddMilestoneOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setEditingMilestoneId: React.Dispatch<React.SetStateAction<string | null>>,
  setNewMilestone: React.Dispatch<
    React.SetStateAction<Omit<MilestoneItem, "id">>
  >,
  setSelectedMilestoneDate: React.Dispatch<
    React.SetStateAction<Date | undefined>
  >,
  setSelectedMilestoneTrigger: React.Dispatch<
    React.SetStateAction<string | null>
  >,
) {
  setIsAddMilestoneOpen(false);
  setEditingMilestoneId(null);
  setNewMilestone(emptyMilestone);
  setSelectedMilestoneDate(undefined);
  setSelectedMilestoneTrigger("Client approval");
}

function parseDueDate(value: string) {
  const parsed = new Date(
    `${value.replace(/^Due\\s+/, "")}, ${new Date().getFullYear()}`,
  );
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatMilestoneAmount(value: string) {
  const formatted = formatAmountInput(value);
  return formatted ? `${formatted} XLM` : "0 XLM";
}

function formatAmountInput(value: string) {
  const sanitized = sanitizeAmountInput(value);
  if (!sanitized) {
    return "";
  }

  const [integerPart, decimalPart] = sanitized.split(".");
  const formattedInteger = Number(integerPart || "0").toLocaleString("en-US");

  if (decimalPart !== undefined) {
    return `${formattedInteger}.${decimalPart}`;
  }

  return formattedInteger;
}

function sanitizeAmountInput(value: string) {
  const stripped = value.replace(/[^0-9.]/g, "");
  const firstDotIndex = stripped.indexOf(".");

  if (firstDotIndex === -1) {
    return stripped;
  }

  const integerPart = stripped.slice(0, firstDotIndex);
  const decimalPart = stripped.slice(firstDotIndex + 1).replace(/\\./g, "");
  return `${integerPart}.${decimalPart}`;
}

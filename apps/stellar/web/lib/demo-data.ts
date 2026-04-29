import { Bot, Landmark, ShieldCheck, Workflow, type LucideIcon } from 'lucide-react';

export const dashboardStats: Array<{ label: string; value: string; helper: string; icon: LucideIcon }> = [
  {
    label: 'Protected volume',
    value: '$184K',
    helper: 'Escrow value across active and completed contracts.',
    icon: Landmark,
  },
  {
    label: 'Open contracts',
    value: '18',
    helper: 'Contracts currently funded or in review.',
    icon: Workflow,
  },
  {
    label: 'Avg. release fee',
    value: '$0.09',
    helper: 'Average network cost per release action.',
    icon: ShieldCheck,
  },
  {
    label: 'Dispute rate',
    value: '2.1%',
    helper: 'Contracts routed to mediator review.',
    icon: Bot,
  },
];

export const activeDeals = [
  {
    id: 'deal-product-design',
    category: 'Agency services',
    title: 'Product design sprint',
    counterparties: 'NexaPay Treasury and Sandline Studio',
    amount: '32,000 USDC',
    progress: 66,
    completedMilestones: 2,
    totalMilestones: 3,
    status: 'In review',
    statusTone: 'status-amber',
    released: '21,000 USDC',
    pending: '11,000 USDC',
    mediator: 'Delta Resolution',
  },
  {
    id: 'deal-hardware-shipment',
    category: 'Cross-border trade',
    title: 'Hardware shipment escrow',
    counterparties: 'Harbor Grid and Atlas Components',
    amount: '84,500 USDC',
    progress: 42,
    completedMilestones: 2,
    totalMilestones: 5,
    status: 'Funded',
    statusTone: 'status-cyan',
    released: '35,000 USDC',
    pending: '49,500 USDC',
    mediator: 'Mercury Trade Panel',
  },
  {
    id: 'deal-audit',
    category: 'Security',
    title: 'Protocol audit escrow',
    counterparties: 'Orbit Labs and Redline Security',
    amount: '18,000 USDC',
    progress: 100,
    completedMilestones: 4,
    totalMilestones: 4,
    status: 'Completed',
    statusTone: 'status-emerald',
    released: '18,000 USDC',
    pending: '0 USDC',
    mediator: 'Delta Resolution',
  },
];

export const escrowPresets = [
  {
    id: 'preset-design',
    tag: 'Services',
    title: 'Design sprint escrow',
    summary: 'Three-stage contract for a design engagement.',
    client: 'NexaPay Treasury',
    vendor: 'Sandline Studio',
    amount: '32,000 USDC',
    brief: 'Five-week design engagement covering discovery, prototype delivery, and final handoff.',
  },
  {
    id: 'preset-supplier',
    tag: 'Trade',
    title: 'Supplier shipment escrow',
    summary: 'Milestone-based settlement for a supplier order.',
    client: 'Harbor Grid Procurement',
    vendor: 'Atlas Components',
    amount: '84,500 USDC',
    brief: 'Hardware procurement agreement with inspection, shipping, and clearance checkpoints.',
  },
  {
    id: 'preset-audit',
    tag: 'Security',
    title: 'Protocol audit escrow',
    summary: 'Staged payout for audit delivery and remediation review.',
    client: 'Orbit Labs',
    vendor: 'Redline Security',
    amount: '18,000 USDC',
    brief: 'Audit contract with staged releases for report delivery, remediation review, and sign-off.',
  },
];

export const milestoneTemplates = [
  {
    id: 'm1',
    title: 'Discovery and scope lock',
    description: 'Kickoff, scope confirmation, and signed brief.',
    amount: '8,000 USDC',
    trigger: 'Client approval',
    deadline: 'Due Mar 18',
  },
  {
    id: 'm2',
    title: 'Prototype and stakeholder review',
    description: 'Prototype delivery with client review and revisions.',
    amount: '13,000 USDC',
    trigger: 'Approval or 5-day timeout',
    deadline: 'Due Mar 29',
  },
  {
    id: 'm3',
    title: 'Final handoff and QA support',
    description: 'Final files, tokens, and handoff support.',
    amount: '11,000 USDC',
    trigger: 'Dual approval',
    deadline: 'Due Apr 8',
  },
];

export const sampleMediators = [
  {
    id: 'none',
    name: 'No dispute resolver',
    specialty: 'The parties resolve issues directly without a third-party review.',
    fee: 'No dispute fee',
  },
  {
    id: 'platform',
    name: 'Platform review',
    specialty: 'A standard review flow for service and product delivery disagreements.',
    fee: '1.0%',
  },
  {
    id: 'independent',
    name: 'Independent resolver',
    specialty: 'A neutral third party can review evidence and decide the outcome.',
    fee: '1.5%',
  },
];

export const dealTimeline: Record<
  string,
  Array<{
    id: string;
    title: string;
    description: string;
    amount: string;
    timestamp: string;
    status: 'Completed' | 'In review' | 'Disputed';
    statusTone: string;
  }>
> = {
  'deal-product-design': [
    {
      id: 'pd-1',
      title: 'Discovery and scope lock',
      description: 'Brief approved and first release completed.',
      amount: '8,000 USDC',
      timestamp: 'Mar 4, 2026',
      status: 'Completed',
      statusTone: 'status-emerald',
    },
    {
      id: 'pd-2',
      title: 'Prototype and stakeholder review',
      description: 'Prototype approved and payment released.',
      amount: '13,000 USDC',
      timestamp: 'Mar 8, 2026',
      status: 'Completed',
      statusTone: 'status-emerald',
    },
    {
      id: 'pd-3',
      title: 'Final handoff and QA support',
      description: 'Awaiting client approval for final delivery.',
      amount: '11,000 USDC',
      timestamp: 'Due Mar 14, 2026',
      status: 'In review',
      statusTone: 'status-amber',
    },
  ],
  'deal-hardware-shipment': [
    {
      id: 'hw-1',
      title: 'Factory inspection release',
      description: 'Inspection completed and deposit released.',
      amount: '20,000 USDC',
      timestamp: 'Mar 1, 2026',
      status: 'Completed',
      statusTone: 'status-emerald',
    },
    {
      id: 'hw-2',
      title: 'Port departure confirmation',
      description: 'Shipment confirmed and second release completed.',
      amount: '15,000 USDC',
      timestamp: 'Mar 6, 2026',
      status: 'Completed',
      statusTone: 'status-emerald',
    },
    {
      id: 'hw-3',
      title: 'Customs clearance checkpoint',
      description: 'Clearance issue under mediator review.',
      amount: '22,500 USDC',
      timestamp: 'Mar 10, 2026',
      status: 'Disputed',
      statusTone: 'status-rose',
    },
  ],
  'deal-audit': [
    {
      id: 'au-1',
      title: 'Threat model and kickoff',
      description: 'Scope approved and first release completed.',
      amount: '4,000 USDC',
      timestamp: 'Feb 19, 2026',
      status: 'Completed',
      statusTone: 'status-emerald',
    },
    {
      id: 'au-2',
      title: 'Initial findings report',
      description: 'Findings delivered and accepted.',
      amount: '6,000 USDC',
      timestamp: 'Feb 26, 2026',
      status: 'Completed',
      statusTone: 'status-emerald',
    },
    {
      id: 'au-3',
      title: 'Remediation verification',
      description: 'Remediation verified and contract closed.',
      amount: '8,000 USDC',
      timestamp: 'Mar 3, 2026',
      status: 'Completed',
      statusTone: 'status-emerald',
    },
  ],
};

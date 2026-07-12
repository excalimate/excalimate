export const FEEDBACK_SCOPE_LABEL = 'feedback';
export const FEEDBACK_CATEGORY_IDS = [
  'feature',
  'improvement',
  'bug',
  'integration',
  'other',
] as const;
export const FEEDBACK_STATUS_IDS = [
  'under-review',
  'planned',
  'in-progress',
  'completed',
  'rejected',
] as const;

export const FEEDBACK_CATEGORIES = {
  feature: {
    label: 'Feature request',
    githubLabel: 'feedback: feature',
    color: 'FFC300',
    description: 'A new capability or workflow',
  },
  improvement: {
    label: 'Improvement',
    githubLabel: 'feedback: improvement',
    color: 'EE5622',
    description: 'An improvement to existing behavior',
  },
  bug: {
    label: 'Bug',
    githubLabel: 'feedback: bug',
    color: 'D73A4A',
    description: 'Something is not working as expected',
  },
  integration: {
    label: 'Integration',
    githubLabel: 'feedback: integration',
    color: '7129C5',
    description: 'A request involving another tool or platform',
  },
  other: {
    label: 'Other',
    githubLabel: 'feedback: other',
    color: '656570',
    description: 'Feedback that does not fit another category',
  },
} as const;

export const FEEDBACK_STATUSES = {
  'under-review': {
    label: 'Under review',
    githubLabel: 'status: under review',
    color: '656570',
    description: 'The team is reviewing this feedback',
    terminal: false,
  },
  planned: {
    label: 'Planned',
    githubLabel: 'status: planned',
    color: '7129C5',
    description: 'Accepted and planned for future work',
    terminal: false,
  },
  'in-progress': {
    label: 'In progress',
    githubLabel: 'status: in progress',
    color: 'FFC300',
    description: 'Work is currently underway',
    terminal: false,
  },
  completed: {
    label: 'Completed',
    githubLabel: 'status: completed',
    color: '169B3E',
    description: 'The requested work has been completed',
    terminal: true,
  },
  rejected: {
    label: 'Rejected',
    githubLabel: 'status: rejected',
    color: 'D73A4A',
    description: 'The team is not planning to pursue this feedback',
    terminal: true,
  },
} as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORY_IDS)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUS_IDS)[number];

export const DEFAULT_FEEDBACK_STATUS: FeedbackStatus = 'under-review';

export const FEEDBACK_LABEL_DEFINITIONS = [
  {
    name: FEEDBACK_SCOPE_LABEL,
    color: '221E22',
    description: 'Public feedback shown on excalimate.com',
  },
  ...Object.values(FEEDBACK_CATEGORIES).map(({ githubLabel, color, description }) => ({
    name: githubLabel,
    color,
    description,
  })),
  ...Object.values(FEEDBACK_STATUSES).map(({ githubLabel, color, description }) => ({
    name: githubLabel,
    color,
    description,
  })),
];

export function getCategoryFromLabels(labels: readonly string[]): FeedbackCategory {
  const entry = Object.entries(FEEDBACK_CATEGORIES).find(([, value]) =>
    labels.includes(value.githubLabel),
  );
  return (entry?.[0] as FeedbackCategory | undefined) ?? 'other';
}

export function getStatusFromLabels(labels: readonly string[]): FeedbackStatus {
  const entry = Object.entries(FEEDBACK_STATUSES).find(([, value]) =>
    labels.includes(value.githubLabel),
  );
  return (entry?.[0] as FeedbackStatus | undefined) ?? DEFAULT_FEEDBACK_STATUS;
}

export function isTerminalStatus(status: FeedbackStatus): boolean {
  return FEEDBACK_STATUSES[status].terminal;
}

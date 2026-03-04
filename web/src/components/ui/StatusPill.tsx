import { JobStatus, QuoteStatus } from '@/types';
import { Badge } from './Badge';

interface StatusPillProps {
  status: JobStatus | QuoteStatus | string;
}

const jobStatusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  draft:       { label: 'Draft',       variant: 'default' },
  posted:      { label: 'Open',        variant: 'info' },
  quoting:     { label: 'Quoting',     variant: 'info' },
  awarded:     { label: 'Awarded',     variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  completed:   { label: 'Completed',   variant: 'success' },
  cancelled:   { label: 'Cancelled',   variant: 'danger' },
  expired:     { label: 'Expired',     variant: 'default' },
};

const quoteStatusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pending:     { label: 'Pending',     variant: 'warning' },
  viewed:      { label: 'Viewed',      variant: 'info' },
  shortlisted: { label: 'Shortlisted', variant: 'info' },
  awarded:     { label: 'Awarded',     variant: 'success' },
  rejected:    { label: 'Rejected',    variant: 'danger' },
  withdrawn:   { label: 'Withdrawn',   variant: 'default' },
  expired:     { label: 'Expired',     variant: 'default' },
};

export function StatusPill({ status }: StatusPillProps) {
  const config = jobStatusConfig[status] ?? quoteStatusConfig[status];

  if (!config) return <Badge variant="default">{status}</Badge>;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

import React from 'react';
import { View, Text } from 'react-native';
import type { JobStatus, QuoteStatus } from '../../types';

type Status = JobStatus | QuoteStatus | string;

const CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  // Job statuses
  draft:       { bg: 'bg-gray-100',    text: 'text-gray-700',    label: 'Draft' },
  posted:      { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Open' },
  quoting:     { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Quoting' },
  awarded:     { bg: 'bg-violet-100',  text: 'text-violet-800',  label: 'Awarded' },
  in_progress: { bg: 'bg-amber-100',   text: 'text-amber-800',   label: 'In Progress' },
  completed:   { bg: 'bg-green-100',   text: 'text-green-800',   label: 'Completed' },
  cancelled:   { bg: 'bg-red-100',     text: 'text-red-800',     label: 'Cancelled' },
  expired:     { bg: 'bg-gray-100',    text: 'text-gray-700',    label: 'Expired' },
  closed:      { bg: 'bg-gray-100',    text: 'text-gray-700',    label: 'Closed' },
  disputed:    { bg: 'bg-red-100',     text: 'text-red-800',     label: 'Disputed' },
  // Quote statuses
  pending:     { bg: 'bg-yellow-100',  text: 'text-yellow-800',  label: 'Pending' },
  viewed:      { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Viewed' },
  shortlisted: { bg: 'bg-indigo-100',  text: 'text-indigo-800',  label: 'Shortlisted' },
  rejected:    { bg: 'bg-red-100',     text: 'text-red-800',     label: 'Rejected' },
  withdrawn:   { bg: 'bg-gray-100',    text: 'text-gray-700',    label: 'Withdrawn' },
};

interface StatusPillProps {
  status: Status;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'md' }) => {
  const cfg = CONFIG[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View className={`self-start rounded-xl ${cfg.bg} ${padding}`}>
      <Text className={`font-semibold ${cfg.text} ${textSize}`}>{cfg.label}</Text>
    </View>
  );
};

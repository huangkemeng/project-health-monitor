"use client";

import { Badge } from "@/components/ui/badge";
import type { FeedbackStatus, FeedbackType } from "@/types";

const statusConfig: Record<FeedbackStatus, { label: string; className: string }> = {
  pending: { label: "待处理", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" },
  processing: { label: "处理中", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" },
  fixed: { label: "已修复", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
  closed: { label: "已关闭", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
  duplicate: { label: "重复反馈", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
};

const typeConfig: Record<FeedbackType, { label: string; className: string }> = {
  bug: { label: "Bug", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" },
  feature_request: { label: "功能建议", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  other: { label: "其他", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
};

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function FeedbackTypeBadge({ type }: { type: FeedbackType }) {
  const config = typeConfig[type] || typeConfig.other;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

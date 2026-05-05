"use client";

import { Info, User, UserCheck, ArrowLeftRight } from "lucide-react";
import type { FeedbackTimelineItem } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  fixed: "已修复",
  closed: "已关闭",
  duplicate: "重复反馈",
};

interface ActionConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const actionConfigs: Record<string, ActionConfig> = {
  created: {
    icon: <Info className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  status_changed: {
    icon: <ArrowLeftRight className="h-4 w-4" />,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  replied: {
    icon: <User className="h-4 w-4" />,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
  reopened: {
    icon: <ArrowLeftRight className="h-4 w-4" />,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 2) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAbsoluteTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN");
}

function getContent(item: FeedbackTimelineItem): string {
  switch (item.action_type) {
    case "created":
      return "提交了反馈";
    case "status_changed":
      if (item.old_status && item.new_status) {
        return `状态从「${STATUS_LABELS[item.old_status] || item.old_status}」变更为「${STATUS_LABELS[item.new_status] || item.new_status}」`;
      }
      return item.content || "";
    case "replied":
      return item.content ? `回复：${item.content}` : "回复了反馈";
    case "reopened":
      return "重新开启了反馈";
    default:
      return item.content || "";
  }
}

function getActorLabel(item: FeedbackTimelineItem): string {
  if (item.action_type === "created") return "";
  if (item.operator_name) {
    return item.operator_name;
  }
  return "";
}

interface FeedbackTimelineProps {
  items: FeedbackTimelineItem[];
}

export function FeedbackTimeline({ items }: FeedbackTimelineProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {items.map((item, index) => {
          const config = actionConfigs[item.action_type] || actionConfigs.created;
          const actorLabel = getActorLabel(item);

          return (
            <div key={item.id} className="relative flex gap-4 pl-10">
              <div
                className={`absolute left-2.5 top-0.5 flex items-center justify-center w-5 h-5 rounded-full ring-4 ring-background ${config.bgColor} ${config.color}`}
                title={item.action_type}
              >
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{getContent(item)}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {actorLabel && <span>{actorLabel}</span>}
                  <time dateTime={item.created_at} title={formatAbsoluteTime(item.created_at)}>
                    {formatTime(item.created_at)}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

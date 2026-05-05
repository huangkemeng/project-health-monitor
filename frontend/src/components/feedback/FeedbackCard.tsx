"use client";

import Link from "next/link";
import { FeedbackStatusBadge, FeedbackTypeBadge } from "./FeedbackStatusBadge";
import type { FeedbackListItem } from "@/types";

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
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

interface FeedbackCardProps {
  item: FeedbackListItem;
}

export function FeedbackCard({ item }: FeedbackCardProps) {
  return (
    <Link
      href={`/feedback/${item.id}`}
      className="block rounded-lg border p-4 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {item.feedback_no}
            </span>
            <FeedbackTypeBadge type={item.type} />
            <FeedbackStatusBadge status={item.status} />
          </div>
          <h3 className="font-medium truncate">{item.title}</h3>
          {item.submitter_name && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.submitter_name}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">
            {formatTime(item.created_at)}
          </p>
          {item.reply_count > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.reply_count} 条回复
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { feedbackApi } from "@/lib/api";
import type { FeedbackStats } from "@/types";

const statCards = [
  { key: "pending_count" as const, label: "待处理", color: "border-l-red-500 bg-red-50 dark:bg-red-950/20" },
  { key: "processing_count" as const, label: "处理中", color: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" },
  { key: "today_count" as const, label: "今日新增", color: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20" },
  { key: "week_count" as const, label: "本周新增", color: "border-l-green-500 bg-green-50 dark:bg-green-950/20" },
  { key: "avg_response_time" as const, label: "平均响应(h)", color: "border-l-purple-500 bg-purple-50 dark:bg-purple-950/20" },
];

export function FeedbackAdminStats() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feedbackApi.adminStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatValue = (key: string, value: number): string => {
    if (key === "avg_response_time") {
      return `${value.toFixed(1)}h`;
    }
    return value.toString();
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {statCards.map((card) => (
        <Card key={card.key} className={`border-l-4 ${card.color}`}>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold">
                {stats ? formatValue(card.key, stats[card.key]) : "0"}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

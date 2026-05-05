"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { feedbackApi } from "@/lib/api";

interface BatchActionBarProps {
  selectedIds: string[];
  onClear: () => void;
  onDone: () => void;
}

export function BatchActionBar({ selectedIds, onClear, onDone }: BatchActionBarProps) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBatchAction = async (action: string) => {
    setLoading(true);
    try {
      await feedbackApi.adminBatch({ ids: selectedIds, action });
      onDone();
      onClear();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const actionLabels: Record<string, string> = {
    mark_processing: "批量标记为处理中",
    mark_fixed: "批量标记为已修复",
    close: "批量关闭",
  };

  const confirmTitle = confirmAction ? actionLabels[confirmAction] || "" : "";

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted">
        <span className="text-sm text-muted-foreground">
          已选择 <strong>{selectedIds.length}</strong> 项
        </span>
        <div className="flex gap-2">
          {Object.entries(actionLabels).map(([action, label]) => (
            <Button
              key={action}
              size="sm"
              variant="secondary"
              onClick={() => setConfirmAction(action)}
              disabled={loading}
            >
              {label}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={loading}>
          取消选择
        </Button>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              将对选中的 {selectedIds.length} 条反馈执行此操作，确定继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBatchAction(confirmAction!)} disabled={loading}>
              {loading ? "处理中..." : "确认"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

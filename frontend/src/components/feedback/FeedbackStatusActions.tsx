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
import type { FeedbackStatus } from "@/types";

interface FeedbackStatusActionsProps {
  status: FeedbackStatus;
  isOwner: boolean;
  isAdmin: boolean;
  closedAt?: string;
  onClose: () => Promise<void>;
  onReopen: () => Promise<void>;
  onConfirmFixed: () => Promise<void>;
  onRejectFixed: () => Promise<void>;
}

export function FeedbackStatusActions({
  status,
  isOwner,
  isAdmin,
  closedAt,
  onClose,
  onReopen,
  onConfirmFixed,
  onRejectFixed,
}: FeedbackStatusActionsProps) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canClose = isOwner || isAdmin;
  const isClosed = status === "closed";
  const isFixed = status === "fixed";

  const canReopen = isClosed && isOwner && closedAt
    ? (Date.now() - new Date(closedAt).getTime()) / (1000 * 60 * 60 * 24) <= 7
    : false;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      switch (confirmAction) {
        case "close":
          await onClose();
          break;
        case "reopen":
          await onReopen();
          break;
        case "confirmFixed":
          await onConfirmFixed();
          break;
        case "rejectFixed":
          await onRejectFixed();
          break;
      }
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const confirmMessages: Record<string, { title: string; description: string }> = {
    close: {
      title: "确认关闭",
      description: "确定要关闭此反馈吗？关闭后7天内可以重新开启。",
    },
    reopen: {
      title: "确认重新开启",
      description: "确定要重新开启此反馈吗？",
    },
    confirmFixed: {
      title: "确认已修复",
      description: "请确认问题已解决，确认后将关闭反馈。",
    },
    rejectFixed: {
      title: "确认未修复",
      description: "问题仍未解决，将重新进入处理状态。",
    },
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {isFixed && isOwner && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => setConfirmAction("confirmFixed")}
            >
              确认已修复
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmAction("rejectFixed")}
            >
              未修复
            </Button>
          </>
        )}

        {canClose && !isClosed && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmAction("close")}
          >
            关闭反馈
          </Button>
        )}

        {canReopen && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmAction("reopen")}
          >
            重新开启
          </Button>
        )}

        {isClosed && !canReopen && isOwner && (
          <p className="text-xs text-muted-foreground py-1">
            反馈已关闭超过7天，无法重新开启
          </p>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction ? confirmMessages[confirmAction]?.title : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction ? confirmMessages[confirmAction]?.description : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading ? "处理中..." : "确认"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

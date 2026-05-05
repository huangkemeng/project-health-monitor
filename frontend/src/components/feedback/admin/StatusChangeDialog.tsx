"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { feedbackApi } from "@/lib/api";
import type { FeedbackStatus } from "@/types";

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "pending", label: "待处理" },
  { value: "processing", label: "处理中" },
  { value: "fixed", label: "已修复" },
  { value: "closed", label: "已关闭" },
];

interface StatusChangeDialogProps {
  feedbackId: string | null;
  currentStatus: FeedbackStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function StatusChangeDialog({
  feedbackId,
  currentStatus,
  open,
  onOpenChange,
  onChanged,
}: StatusChangeDialogProps) {
  const [newStatus, setNewStatus] = useState<FeedbackStatus | "">("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async () => {
    if (!feedbackId || !newStatus || !reason.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await feedbackApi.updateStatus(feedbackId, { status: newStatus as FeedbackStatus, reason: reason.trim() });
      onChanged();
      onOpenChange(false);
      setNewStatus("");
      setReason("");
    } catch (err) {
      setError((err as Error)?.message || "状态变更失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>变更反馈状态</DialogTitle>
          <DialogDescription>当前状态：{currentStatus}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>目标状态</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as FeedbackStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="选择目标状态" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} disabled={opt.value === currentStatus}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">变更原因</Label>
            <Textarea
              id="reason"
              placeholder="请输入变更原因（10-200字符）"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleChange} disabled={loading || !newStatus || !reason.trim()}>
            {loading ? "处理中..." : "确认变更"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

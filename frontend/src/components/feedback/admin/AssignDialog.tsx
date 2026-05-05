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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { feedbackApi } from "@/lib/api";

interface AssignDialogProps {
  feedbackId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

export function AssignDialog({ feedbackId, open, onOpenChange, onAssigned }: AssignDialogProps) {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!feedbackId || !userId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await feedbackApi.adminAssign(feedbackId, userId.trim());
      onAssigned();
      onOpenChange(false);
      setUserId("");
    } catch (err) {
      setError("分配失败，请检查用户ID是否正确");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分配处理人</DialogTitle>
          <DialogDescription>输入用户ID来分配处理人</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="assignee">用户ID</Label>
          <Input
            id="assignee"
            placeholder="输入用户ID..."
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleAssign} disabled={loading || !userId.trim()}>
            {loading ? "分配中..." : "确认分配"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

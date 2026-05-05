"use client";

import { useState, useEffect } from "react";
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
import type { FeedbackListItem } from "@/types";

interface DuplicateDialogProps {
  feedbackId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function DuplicateDialog({ feedbackId, open, onOpenChange, onChanged }: DuplicateDialogProps) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<FeedbackListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await feedbackApi.adminList({ keyword, page_size: 10 });
        setResults(res.items.filter((item) => item.id !== feedbackId));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, feedbackId]);

  const handleConfirm = async () => {
    if (!feedbackId || !selectedId) return;
    setLoading(true);
    try {
      await feedbackApi.updateStatus(feedbackId, { status: "duplicate", reason: "标记为重复反馈", duplicate_of: selectedId });
      onChanged();
      onOpenChange(false);
      setKeyword("");
      setSelectedId(null);
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const selectedTitle = results.find((r) => r.id === selectedId)?.title;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>标记为重复反馈</DialogTitle>
          <DialogDescription>搜索并选择原反馈</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">搜索原反馈</Label>
            <Input
              id="search"
              placeholder="输入反馈编号或标题..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {searching && <p className="text-sm text-muted-foreground">搜索中...</p>}

          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedId === item.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="font-mono text-xs">{item.feedback_no}</span>
                  <span className="ml-2">{item.title}</span>
                </button>
              ))}
            </div>
          )}

          {selectedId && selectedTitle && (
            <p className="text-sm text-muted-foreground">
              将关联到：<span className="font-medium">{selectedTitle}</span>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleConfirm} disabled={loading || !selectedId}>
            {loading ? "处理中..." : "确认标记"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

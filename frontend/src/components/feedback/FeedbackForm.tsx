"use client";

import { useState, useCallback } from "react";
import { Bug, Lightbulb, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { PrivacyInfo } from "./PrivacyInfo";
import { feedbackApi } from "@/lib/api";
import type { FeedbackType, CreateFeedbackData } from "@/types";

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: React.ReactNode }[] = [
  { value: "bug", label: "Bug", icon: <Bug className="h-4 w-4" /> },
  { value: "feature_request", label: "功能建议", icon: <Lightbulb className="h-4 w-4" /> },
  { value: "other", label: "其他", icon: <HelpCircle className="h-4 w-4" /> },
];

interface FeedbackFormProps {
  onSuccess: (feedbackId: string, feedbackNo: string) => void;
  onError: (message: string) => void;
}

export function FeedbackForm({ onSuccess, onError }: FeedbackFormProps) {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [contact, setContact] = useState(user?.email || "");
  const [systemInfo, setSystemInfo] = useState<Record<string, string> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!type) newErrors.type = "请选择反馈类型";
    if (!title || title.length < 5) newErrors.title = "标题至少需要5个字符";
    if (title.length > 100) newErrors.title = "标题不能超过100个字符";
    if (!description || description.length < 10) newErrors.description = "描述至少需要10个字符";
    if (description.length > 2000) newErrors.description = "描述不能超过2000个字符";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [type, title, description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      const data: CreateFeedbackData = {
        type,
        title: title.trim(),
        description: description.trim(),
        steps_to_reproduce: stepsToReproduce.trim() || undefined,
        expected_behavior: expectedBehavior.trim() || undefined,
        actual_behavior: actualBehavior.trim() || undefined,
        contact: contact.trim() || undefined,
        ...(systemInfo || {}),
      };

      const result = await feedbackApi.create(data);
      onSuccess(result.id, result.feedback_no);
    } catch (err) {
      const message = (err as Error)?.message || "提交失败，请稍后重试";
      if (message.includes("过于频繁")) {
        onError("提交过于频繁，请稍后再试");
      } else {
        onError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!user && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
          未登录用户提交反馈后无法追踪进度，建议先登录
        </div>
      )}

      <div className="space-y-2">
        <Label>反馈类型</Label>
        <div className="flex gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={type === opt.value ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-1.5"
              onClick={() => setType(opt.value)}
            >
              {opt.icon}
              {opt.label}
            </Button>
          ))}
        </div>
        {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">
          标题 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="请简要描述您的问题或建议"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
        />
        <div className="flex justify-between">
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          <p className="text-xs text-muted-foreground ml-auto">{title.length}/100</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          详细描述 <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="请详细描述您遇到的问题或建议..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
        />
        <div className="flex justify-between">
          {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          <p className="text-xs text-muted-foreground ml-auto">{description.length}/2000</p>
        </div>
      </div>

      {type === "bug" && (
        <div className="space-y-2">
          <Label htmlFor="steps">复现步骤</Label>
          <Textarea
            id="steps"
            placeholder="请描述复现问题的步骤..."
            value={stepsToReproduce}
            onChange={(e) => setStepsToReproduce(e.target.value)}
            maxLength={2000}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{stepsToReproduce.length}/2000</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="expected">期望行为</Label>
        <Textarea
          id="expected"
          placeholder="您期望的正确行为是？"
          value={expectedBehavior}
          onChange={(e) => setExpectedBehavior(e.target.value)}
          maxLength={1000}
          rows={2}
        />
        <p className="text-xs text-muted-foreground text-right">{expectedBehavior.length}/1000</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="actual">实际行为</Label>
        <Textarea
          id="actual"
          placeholder="实际出现的错误行为是？"
          value={actualBehavior}
          onChange={(e) => setActualBehavior(e.target.value)}
          maxLength={1000}
          rows={2}
        />
        <p className="text-xs text-muted-foreground text-right">{actualBehavior.length}/1000</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact">联系方式（选填）</Label>
        <Input
          id="contact"
          placeholder="邮箱或手机号，便于我们与您联系"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </div>

      <PrivacyInfo onInfoChange={(info) => setSystemInfo(info as unknown as Record<string, string>)} />

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "提交中..." : "提交反馈"}
      </Button>
    </form>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FeedbackStatusBadge, FeedbackTypeBadge } from "./FeedbackStatusBadge";
import { FeedbackTimeline } from "./FeedbackTimeline";
import { FeedbackReplyBox } from "./FeedbackReplyBox";
import { FeedbackStatusActions } from "./FeedbackStatusActions";
import { feedbackApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Feedback } from "@/types";
import Link from "next/link";

interface FeedbackDetailProps {
  feedbackId: string;
}

export function FeedbackDetail({ feedbackId }: FeedbackDetailProps) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemInfoExpanded, setSystemInfoExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackApi.get(feedbackId);
      setFeedback(data);
    } catch (err) {
      const message = (err as any)?.response?.data?.message || (err as Error)?.message;
      if (message?.includes("不存在")) {
        setError("反馈不存在");
      } else if (message?.includes("无权访问")) {
        setError("无权访问该反馈");
      } else {
        setError("加载失败，请重试");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, [feedbackId]);

  const isOwner = feedback?.submitter_name === user?.username || feedback?.submitter_name === user?.email;

  const handleSendReply = async (content: string) => {
    await feedbackApi.addReply(feedbackId, { content });
    await loadFeedback();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleClose = async () => {
    await feedbackApi.close(feedbackId);
    await loadFeedback();
  };

  const handleReopen = async () => {
    await feedbackApi.reopen(feedbackId);
    await loadFeedback();
  };

  const handleConfirmFixed = async () => {
    await feedbackApi.updateStatus(feedbackId, { status: "closed", reason: "用户确认已修复" });
    await loadFeedback();
  };

  const handleRejectFixed = async () => {
    await feedbackApi.updateStatus(feedbackId, { status: "processing", reason: "用户验证未通过" });
    await loadFeedback();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/feedback">返回列表</Link>
        </Button>
      </div>
    );
  }

  if (!feedback) return null;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/feedback" className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
      </Button>

      <div>
        <p className="text-sm text-muted-foreground font-mono mb-1">
          {feedback.feedback_no}
        </p>
        <h1 className="text-2xl font-bold mb-2">{feedback.title}</h1>
        <div className="flex items-center gap-2 mb-1">
          <FeedbackTypeBadge type={feedback.type} />
          <FeedbackStatusBadge status={feedback.status} />
          <span className="text-sm text-muted-foreground">
            提交于 {formatTime(feedback.created_at)}
          </span>
        </div>
        {feedback.submitter_name && (
          <p className="text-sm text-muted-foreground">
            提交人：{feedback.submitter_name}
          </p>
        )}
        {feedback.duplicate_of && feedback.duplicate_title && (
          <p className="text-sm text-muted-foreground mt-1">
            关联原反馈：
            <Link
              href={`/feedback/${feedback.duplicate_of}`}
              className="text-primary hover:underline"
            >
              {feedback.duplicate_title}
            </Link>
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">详细描述</h3>
          <p className="text-sm whitespace-pre-wrap">{feedback.description}</p>
        </div>

        {feedback.steps_to_reproduce && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">复现步骤</h3>
            <p className="text-sm whitespace-pre-wrap">{feedback.steps_to_reproduce}</p>
          </div>
        )}

        {feedback.expected_behavior && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">期望行为</h3>
            <p className="text-sm whitespace-pre-wrap">{feedback.expected_behavior}</p>
          </div>
        )}

        {feedback.actual_behavior && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">实际行为</h3>
            <p className="text-sm whitespace-pre-wrap">{feedback.actual_behavior}</p>
          </div>
        )}

        <div className="rounded-lg border">
          <Button
            type="button"
            variant="ghost"
            className="w-full flex items-center justify-between px-3 py-2 h-auto text-sm"
            onClick={() => setSystemInfoExpanded(!systemInfoExpanded)}
          >
            <span className="text-muted-foreground">系统信息</span>
            {systemInfoExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          {systemInfoExpanded && (
            <div className="px-3 pb-3 text-xs text-muted-foreground space-y-1">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                {feedback.page_url && <><span className="font-medium">页面URL：</span><span className="truncate">{feedback.page_url}</span></>}
                {feedback.browser_info && <><span className="font-medium">浏览器：</span><span className="truncate">{feedback.browser_info}</span></>}
                {feedback.browser_language && <><span className="font-medium">浏览器语言：</span><span>{feedback.browser_language}</span></>}
                {feedback.screen_resolution && <><span className="font-medium">屏幕分辨率：</span><span>{feedback.screen_resolution}</span></>}
                {feedback.operating_system && <><span className="font-medium">操作系统：</span><span>{feedback.operating_system}</span></>}
                {feedback.system_version && <><span className="font-medium">系统版本：</span><span>{feedback.system_version}</span></>}
              </div>
            </div>
          )}
        </div>
      </div>

      <FeedbackStatusActions
        status={feedback.status}
        isOwner={isOwner}
        isAdmin={false}
        closedAt={feedback.updated_at}
        onClose={handleClose}
        onReopen={handleReopen}
        onConfirmFixed={handleConfirmFixed}
        onRejectFixed={handleRejectFixed}
      />

      <Separator />

      <div>
        <h3 className="font-medium mb-4">处理进度</h3>
        <FeedbackTimeline items={feedback.timeline || []} />
      </div>

      {feedback.replies && feedback.replies.length > 0 && (
        <div className="space-y-3">
          {feedback.replies.map((reply) => (
            <div
              key={reply.id}
              className={`rounded-lg border p-3 ${
                reply.is_admin_reply
                  ? "bg-primary/5 border-primary/20"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {reply.author_name || (reply.is_admin_reply ? "管理员" : "用户")}
                </span>
                {reply.is_admin_reply && (
                  <span className="text-xs text-primary">管理员</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatTime(reply.created_at)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      <Separator />

      <FeedbackReplyBox onSend={handleSendReply} />

      <div ref={bottomRef} />
    </div>
  );
}

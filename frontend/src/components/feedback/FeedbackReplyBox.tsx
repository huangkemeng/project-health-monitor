"use client";

import { useState, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackReplyBoxProps {
  onSend: (content: string) => Promise<void>;
}

export function FeedbackReplyBox({ onSend }: FeedbackReplyBoxProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setContent("");
      textareaRef.current?.focus();
    } catch {
      // Error is handled by parent
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        ref={textareaRef}
        placeholder="输入回复内容..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={sending}
      />
      <div className="flex justify-end">
        <Button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          size="sm"
        >
          {sending ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              发送中...
            </>
          ) : (
            <>
              <Send className="mr-1 h-4 w-4" />
              发送
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

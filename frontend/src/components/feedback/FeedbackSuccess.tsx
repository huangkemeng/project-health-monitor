"use client";

import { useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface FeedbackSuccessProps {
  feedbackId: string;
  feedbackNo: string;
  onClose: () => void;
}

export function FeedbackSuccess({ feedbackId, feedbackNo, onClose }: FeedbackSuccessProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
      <h3 className="text-xl font-semibold mb-2">反馈已提交</h3>
      <p className="text-2xl font-bold text-primary mb-2">{feedbackNo}</p>
      <p className="text-muted-foreground mb-6">感谢您的反馈，我们会尽快处理</p>
      <div className="flex gap-3">
        <Button
          variant="default"
          onClick={() => {
            router.push(`/feedback/${feedbackId}`);
            onClose();
          }}
        >
          查看我的反馈
        </Button>
        <Button variant="outline" onClick={onClose}>
          继续浏览
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackForm } from "./FeedbackForm";
import { FeedbackSuccess } from "./FeedbackSuccess";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "form" | "success";

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [step, setStep] = useState<Step>("form");
  const [successData, setSuccessData] = useState<{ id: string; feedbackNo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = (feedbackId: string, feedbackNo: string) => {
    setSuccessData({ id: feedbackId, feedbackNo });
    setStep("success");
  };

  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setStep("form");
        setSuccessData(null);
        setError(null);
      }, 200);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "问题反馈" : "反馈已提交"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "请详细描述您遇到的问题或建议，我们会尽快处理"
              : "感谢您的反馈"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === "form" && (
          <FeedbackForm onSuccess={handleSuccess} onError={handleError} />
        )}

        {step === "success" && successData && (
          <FeedbackSuccess
            feedbackId={successData.id}
            feedbackNo={successData.feedbackNo}
            onClose={() => handleClose(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

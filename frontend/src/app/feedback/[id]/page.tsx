"use client";

import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { FeedbackDetail } from "@/components/feedback/FeedbackDetail";

export default function FeedbackDetailPage() {
  const params = useParams();
  const feedbackId = params.id as string;

  return (
    <MainLayout>
      <FeedbackDetail feedbackId={feedbackId} />
    </MainLayout>
  );
}

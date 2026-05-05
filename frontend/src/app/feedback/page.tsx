"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { FeedbackList } from "@/components/feedback/FeedbackList";
import { FeedbackFilter } from "@/components/feedback/FeedbackFilter";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { feedbackApi } from "@/lib/api";
import type { FeedbackListItem } from "@/types";

export default function FeedbackListPage() {
  const [items, setItems] = useState<FeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    keyword: "",
  });

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: 20 };
      if (filters.status !== "all") params.status = filters.status;
      if (filters.type !== "all") params.type = filters.type;
      if (filters.keyword) params.keyword = filters.keyword;

      const result = await feedbackApi.list(params);
      setItems(result.items);
      setTotalPages(result.pagination.total_pages);
    } catch (err) {
      console.error("Failed to load feedbacks:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">我的反馈</h1>
            <p className="text-muted-foreground text-sm mt-1">
              查看和管理您提交的反馈记录
            </p>
          </div>
        </div>

        <FeedbackFilter values={filters} onChange={handleFilterChange} />

        <FeedbackList
          items={items}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onNewFeedback={() => setDialogOpen(true)}
        />
      </div>

      <FeedbackDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </MainLayout>
  );
}

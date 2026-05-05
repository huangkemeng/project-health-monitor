"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { FeedbackAdminStats } from "@/components/feedback/admin/FeedbackAdminStats";
import { FeedbackAdminTable } from "@/components/feedback/admin/FeedbackAdminTable";
import { FeedbackAdminFilter } from "@/components/feedback/admin/FeedbackAdminFilter";
import { BatchActionBar } from "@/components/feedback/admin/BatchActionBar";
import { StatusChangeDialog } from "@/components/feedback/admin/StatusChangeDialog";
import { AssignDialog } from "@/components/feedback/admin/AssignDialog";
import { DuplicateDialog } from "@/components/feedback/admin/DuplicateDialog";
import { feedbackApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { FeedbackListItem, FeedbackStatus } from "@/types";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "admin@example.com").split(",").map((e) => e.trim()).filter(Boolean);

export default function FeedbackAdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email) : false;

  const [items, setItems] = useState<FeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({ status: "all", type: "all", keyword: "" });

  const [assignDialog, setAssignDialog] = useState<{ open: boolean; feedbackId: string | null }>({ open: false, feedbackId: null });
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; feedbackId: string | null; currentStatus: FeedbackStatus | null }>({ open: false, feedbackId: null, currentStatus: null });
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; feedbackId: string | null }>({ open: false, feedbackId: null });

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: 20 };
      if (filters.status !== "all") params.status = filters.status;
      if (filters.type !== "all") params.type = filters.type;
      if (filters.keyword) params.keyword = filters.keyword;

      const result = await feedbackApi.adminList(params);
      setItems(result.items);
      setTotalPages(result.pagination.total_pages);
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed to load admin feedbacks:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (isAdmin) loadFeedbacks();
  }, [loadFeedbacks, isAdmin]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleCloseFeedback = async (id: string) => {
    try {
      await feedbackApi.adminBatch({ ids: [id], action: "close" });
      loadFeedbacks();
    } catch (err) {
      console.error("Failed to close feedback:", err);
    }
  };

  const handleProcessFeedback = async (id: string) => {
    try {
      await feedbackApi.adminBatch({ ids: [id], action: "mark_processing" });
      loadFeedbacks();
    } catch (err) {
      console.error("Failed to process feedback:", err);
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">反馈管理</h1>
          <p className="text-muted-foreground">无权访问此页面</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">反馈管理</h1>
        </div>

        <FeedbackAdminStats />

        <FeedbackAdminFilter values={filters} onChange={handleFilterChange} />

        {selectedIds.length > 0 && (
          <BatchActionBar
            selectedIds={selectedIds}
            onClear={() => setSelectedIds([])}
            onDone={loadFeedbacks}
          />
        )}

        <FeedbackAdminTable
          items={items}
          loading={loading}
          page={page}
          totalPages={totalPages}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onPageChange={setPage}
          onAssign={(id) => setAssignDialog({ open: true, feedbackId: id })}
          onChangeStatus={(id, currentStatus) => setStatusDialog({ open: true, feedbackId: id, currentStatus })}
          onMarkDuplicate={(id) => setDuplicateDialog({ open: true, feedbackId: id })}
          onClose={handleCloseFeedback}
          onProcess={handleProcessFeedback}
        />
      </div>

      <StatusChangeDialog
        feedbackId={statusDialog.feedbackId}
        currentStatus={statusDialog.currentStatus}
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog({ ...statusDialog, open })}
        onChanged={loadFeedbacks}
      />

      <AssignDialog
        feedbackId={assignDialog.feedbackId}
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog({ ...assignDialog, open })}
        onAssigned={loadFeedbacks}
      />

      <DuplicateDialog
        feedbackId={duplicateDialog.feedbackId}
        open={duplicateDialog.open}
        onOpenChange={(open) => setDuplicateDialog({ ...duplicateDialog, open })}
        onChanged={loadFeedbacks}
      />
    </MainLayout>
  );
}

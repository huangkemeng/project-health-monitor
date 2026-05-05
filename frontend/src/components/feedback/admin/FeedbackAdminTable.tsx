"use client";

import React from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeedbackStatusBadge, FeedbackTypeBadge } from "../FeedbackStatusBadge";
import type { FeedbackListItem, FeedbackStatus } from "@/types";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

interface FeedbackAdminTableProps {
  items: FeedbackListItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
  onPageChange: (page: number) => void;
  onAssign: (id: string) => void;
  onChangeStatus: (id: string, currentStatus: FeedbackStatus) => void;
  onMarkDuplicate: (id: string) => void;
  onClose: (id: string) => void;
  onProcess: (id: string) => void;
}

export function FeedbackAdminTable({
  items,
  loading,
  page,
  totalPages,
  selectedIds,
  onSelectChange,
  onPageChange,
  onAssign,
  onChangeStatus,
  onMarkDuplicate,
  onClose,
  onProcess,
}: FeedbackAdminTableProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const checkboxRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (checkboxRef.current) {
      const indeterminate = selectedIds.length > 0 && !allSelected;
      (checkboxRef.current as any).indeterminate = indeterminate;
    }
  }, [selectedIds, allSelected]);

  const toggleAll = () => {
    if (allSelected) {
      onSelectChange([]);
    } else {
      onSelectChange(items.map((item) => item.id));
    }
  };

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectChange([...selectedIds, id]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无反馈记录
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} ref={checkboxRef} />
            </TableHead>
            <TableHead>编号</TableHead>
            <TableHead>标题</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>提交人</TableHead>
            <TableHead>提交时间</TableHead>
            <TableHead className="w-24">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                />
              </TableCell>
              <TableCell className="font-mono text-xs">
                <Link href={`/feedback/${item.id}`} className="hover:text-primary">
                  {item.feedback_no}
                </Link>
              </TableCell>
              <TableCell className="max-w-48">
                <Link href={`/feedback/${item.id}`} className="hover:text-primary block truncate">
                  {item.title}
                </Link>
              </TableCell>
              <TableCell>
                <FeedbackTypeBadge type={item.type} />
              </TableCell>
              <TableCell>
                <FeedbackStatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-sm">{item.submitter_name || "-"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(item.created_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">操作</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {item.status === "pending" && (
                      <>
                        <DropdownMenuItem onClick={() => onProcess(item.id)}>
                          开始处理
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMarkDuplicate(item.id)}>
                          标记重复
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onClose(item.id)}>
                          关闭
                        </DropdownMenuItem>
                      </>
                    )}
                    {item.status === "processing" && (
                      <>
                        <DropdownMenuItem onClick={() => onChangeStatus(item.id, item.status)}>
                          标记已修复
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onClose(item.id)}>
                          关闭
                        </DropdownMenuItem>
                      </>
                    )}
                    {item.status === "fixed" && (
                      <DropdownMenuItem onClick={() => onClose(item.id)}>
                        关闭
                      </DropdownMenuItem>
                    )}
                    {item.status === "duplicate" && (
                      <DropdownMenuItem onClick={() => onClose(item.id)}>
                        关闭
                      </DropdownMenuItem>
                    )}
                    {(item.status === "pending" || item.status === "processing") && (
                      <DropdownMenuItem onClick={() => onAssign(item.id)}>
                        分配处理人
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  Edit,
  Trash2,
  Activity,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { monitorsApi } from "@/lib/api";
import { Monitor, MonitorStatus, HealthStatus } from "@/types";
import { formatRelativeTime, cn } from "@/lib/utils";

interface Filters {
  status: string;
  health_status: string;
  keyword: string;
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const config = {
    normal: { label: "正常", variant: "success" as const, icon: CheckCircle },
    warning: { label: "警告", variant: "warning" as const, icon: AlertTriangle },
    critical: { label: "严重", variant: "destructive" as const, icon: AlertCircle },
  };

  const { label, variant, icon: Icon } = config[status] || config.normal;

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function MonitorCard({
  monitor,
  onPause,
  onResume,
  onDelete,
}: {
  monitor: Monitor;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="group hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold truncate">{monitor.name}</h3>
              {monitor.status === "paused" && (
                <Badge variant="secondary">已暂停</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mb-4">
              {monitor.url}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <StatusBadge status={monitor.health_status} />
              {monitor.response_time && (
                <span className="text-muted-foreground">
                  {monitor.response_time}ms
                </span>
              )}
              <span className="text-muted-foreground">
                {monitor.last_check_at
                  ? formatRelativeTime(monitor.last_check_at)
                  : "从未检查"}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/monitors/${monitor.id}`}>
                  <Activity className="h-4 w-4 mr-2" />
                  查看详情
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/monitors/${monitor.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {monitor.status === "active" ? (
                <DropdownMenuItem onClick={() => onPause(monitor.id)}>
                  <Pause className="h-4 w-4 mr-2" />
                  暂停监控
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onResume(monitor.id)}>
                  <Play className="h-4 w-4 mr-2" />
                  恢复监控
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(monitor.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MonitorsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    status: "",
    health_status: "",
    keyword: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 12,
    total: 0,
    total_pages: 0,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Destructure filters to avoid object reference changes triggering unnecessary re-renders
  const { status, health_status, keyword } = filters;
  const { page, page_size } = pagination;

  const fetchMonitors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await monitorsApi.list({
        page: page,
        page_size: page_size,
        status: status,
        health_status: health_status,
        keyword: keyword,
      });
      setMonitors(response.items);
      setPagination(response.pagination);
    } catch (err) {
      toast({
        title: "获取监控列表失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [status, health_status, keyword, page, page_size, toast]);

  // Only fetch when specific dependencies change, not the entire filters object
  useEffect(() => {
    fetchMonitors();
  }, [status, health_status, keyword, page, page_size]);

  const handlePause = async (id: string) => {
    try {
      await monitorsApi.pause(id);
      toast({ title: "监控已暂停", variant: "success" });
      fetchMonitors();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleResume = async (id: string) => {
    try {
      await monitorsApi.resume(id);
      toast({ title: "监控已恢复", variant: "success" });
      fetchMonitors();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await monitorsApi.delete(deleteId);
      toast({ title: "监控已删除", variant: "success" });
      setDeleteId(null);
      fetchMonitors();
    } catch {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">监控项</h1>
            <p className="text-muted-foreground mt-1">
              管理您的所有监控任务
            </p>
          </div>
          <Button asChild>
            <Link href="/monitors/new">
              <Plus className="h-4 w-4 mr-2" />
              新建监控
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索监控项..."
                  value={filters.keyword}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, keyword: e.target.value }))
                  }
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value === "all" ? "" : value }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">运行中</SelectItem>
                    <SelectItem value="paused">已暂停</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.health_status || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, health_status: value === "all" ? "" : value }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="健康状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部健康</SelectItem>
                    <SelectItem value="normal">正常</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="critical">严重</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monitors Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : monitors.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无监控项</h3>
              <p className="text-muted-foreground mb-4">
                创建您的第一个监控任务
              </p>
              <Button asChild>
                <Link href="/monitors/new">
                  <Plus className="h-4 w-4 mr-2" />
                  新建监控
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {monitors.map((monitor) => (
                <MonitorCard
                  key={monitor.id}
                  monitor={monitor}
                  onPause={handlePause}
                  onResume={handleResume}
                  onDelete={setDeleteId}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {pagination.page} 页，共 {pagination.total_pages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={pagination.page === pagination.total_pages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将永久删除该监控项及其所有历史数据，无法恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}

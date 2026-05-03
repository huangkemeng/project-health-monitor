"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  History,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { historyApi, monitorsApi } from "@/lib/api";
import { CheckLog, Monitor } from "@/types";
import { formatDateTime, formatResponseTime, cn } from "@/lib/utils";

interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export default function CheckHistoryPage() {
  const searchParams = useSearchParams();
  const monitorIdFromUrl = searchParams.get("monitor_id");
  const { toast } = useToast();

  const [checks, setChecks] = useState<CheckLog[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    monitor_id: monitorIdFromUrl || "",
    status: "",
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  });

  useEffect(() => {
    const fetchMonitors = async () => {
      try {
        const response = await monitorsApi.list({ page_size: 100 });
        setMonitors(response.items);
      } catch (error) {
        console.error("Failed to fetch monitors:", error);
      }
    };
    fetchMonitors();
  }, []);

  const fetchChecks = async () => {
    try {
      setLoading(true);
      const response = await historyApi.getChecks({
        monitor_id: filters.monitor_id || undefined,
        status: filters.status || undefined,
        page: pagination.page,
        page_size: pagination.page_size,
      });
      setChecks(response.items);
      setPagination(response.pagination);
    } catch (error) {
      toast({
        title: "获取探测历史失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecks();
  }, [filters.monitor_id, filters.status, pagination.page]);

  const getMonitorName = (monitorId: string) => {
    const monitor = monitors.find((m) => m.id === monitorId);
    return monitor?.name || monitorId.slice(0, 8);
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchChecks();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">历史记录</h1>
            <p className="text-muted-foreground mt-1">查看监控探测和告警历史</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex gap-6">
            <Link
              href="/history/checks"
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors",
                "border-primary text-foreground"
              )}
            >
              <Activity className="h-4 w-4" />
              探测记录
            </Link>
            <Link
              href="/history/alerts"
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors",
                "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Bell className="h-4 w-4" />
              告警记录
            </Link>
          </nav>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select
                  value={filters.monitor_id || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, monitor_id: value === "all" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择监控项" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部监控项</SelectItem>
                    {monitors.map((monitor) => (
                      <SelectItem key={monitor.id} value={monitor.id}>
                        {monitor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-40">
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value === "all" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="success">成功</SelectItem>
                    <SelectItem value="failure">失败</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                查询
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              探测记录
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>监控项</TableHead>
                    <TableHead>分组</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>HTTP 状态码</TableHead>
                    <TableHead>响应时间</TableHead>
                    <TableHead>错误信息</TableHead>
                    <TableHead>检查时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : checks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>暂无探测记录</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    checks.map((check) => (
                      <TableRow key={check.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {check.monitor_name || getMonitorName(check.monitor_id)}
                        </TableCell>
                        <TableCell>
                          {check.group_name ? (
                            <Badge variant="outline" className="text-xs">
                              {check.group_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={check.status === "success" ? "success" : "destructive"}
                            className="gap-1"
                          >
                            {check.status === "success" ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {check.status === "success" ? "成功" : "失败"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {check.http_code ? (
                            <span
                              className={cn(
                                "font-mono",
                                check.http_code >= 200 && check.http_code < 300
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              )}
                            >
                              {check.http_code}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {check.response_time ? (
                            <span className="font-mono">
                              {formatResponseTime(check.response_time)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {check.error_msg ? (
                            <span
                              className="text-destructive text-sm max-w-xs truncate block"
                              title={check.error_msg}
                            >
                              {check.error_msg}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(check.checked_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page === 1 || loading}
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
                  disabled={pagination.page === pagination.total_pages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

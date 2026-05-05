"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  FolderOpen,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  FolderInput,
  X,
  RefreshCw,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProject } from "@/hooks/useProject";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { monitorsApi, groupsApi } from "@/lib/api";
import { Monitor, MonitorStatus, HealthStatus, MonitorGroup } from "@/types";
import { formatRelativeTime, cn } from "@/lib/utils";
import { MoveMonitorsDialog } from "./MoveMonitorsDialog";

interface Filters {
  status: string;
  health_status: string;
  keyword: string;
  group_id: string;
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

function GroupBadge({ name, color }: { name: string; color?: string | null }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color || '#6B7280' }}
      />
      <span className="text-xs text-muted-foreground">{name}</span>
    </div>
  );
}

interface MonitorCardProps {
  monitor: Monitor;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onCheck: (id: string) => void;
  checking?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  canEdit?: boolean;
}

function MonitorCard({
  monitor,
  onPause,
  onResume,
  onDelete,
  onCheck,
  checking,
  selectable,
  selected,
  onSelect,
  canEdit = true,
}: MonitorCardProps) {
  return (
    <Card className={cn(
      "group hover:shadow-md transition-all",
      selected && "ring-2 ring-primary"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {selectable && onSelect && (
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onSelect(monitor.id)}
                  className="mr-1"
                />
              )}
              <h3 className="font-semibold truncate">{monitor.name}</h3>
              {monitor.status === "paused" && (
                <Badge variant="secondary">已暂停</Badge>
              )}
              {monitor.owner && (
                <Badge variant="outline" className="text-xs">
                  来自: {monitor.owner.username || monitor.owner.email}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mb-2">
              {monitor.url}
            </p>
            {monitor.group_name && (
              <div className="mb-3">
                <GroupBadge name={monitor.group_name} color={monitor.group_color} />
              </div>
            )}
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
              {canEdit && (
                <DropdownMenuItem asChild>
                  <Link href={`/monitors/${monitor.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    编辑
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onCheck(monitor.id)}
                disabled={checking}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", checking && "animate-spin")} />
                {checking ? "检查中..." : "立即检查"}
              </DropdownMenuItem>
              {canEdit && (
                <>
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
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MonitorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { canEdit } = useProject();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [groups, setGroups] = useState<MonitorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    status: "",
    health_status: "",
    keyword: "",
    group_id: searchParams.get("group_id") || "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 12,
    total: 0,
    total_pages: 0,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // Batch operation states
  const [batchMode, setBatchMode] = useState(false);
  const [selectedMonitors, setSelectedMonitors] = useState<Set<string>>(new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

  // Destructure filters to avoid object reference changes triggering unnecessary re-renders
  const { status, health_status, keyword, group_id } = filters;
  const { page, page_size } = pagination;

  const fetchGroups = useCallback(async () => {
    try {
      setGroupsLoading(true);
      const response = await groupsApi.list();
      setGroups(response.items);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const fetchMonitors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await monitorsApi.list({
        page: page,
        page_size: page_size,
        status: status,
        health_status: health_status,
        keyword: keyword,
        group_id: group_id,
      });
      setMonitors(response.items);
      setPagination(response.pagination);
      // Clear selection when data changes
      setSelectedMonitors(new Set());
    } catch (err) {
      console.error("Failed to fetch monitors:", err);
    } finally {
      setLoading(false);
    }
  }, [status, health_status, keyword, group_id, page, page_size]);

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Only fetch when specific dependencies change, not the entire filters object
  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

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

  const handleCheck = async (id: string) => {
    try {
      setCheckingId(id);
      const result = await monitorsApi.check(id);

      if (result.result.status === 'success') {
        toast({
          title: "检查完成",
          description: `响应时间: ${result.result.response_time}ms`,
          variant: "success"
        });
      } else {
        toast({
          title: "检查失败",
          description: result.result.error_msg || '请求失败',
          variant: "destructive"
        });
      }
      fetchMonitors();
    } catch {
      toast({ title: "检查失败", variant: "destructive" });
    } finally {
      setCheckingId(null);
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

  // Batch operations
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedMonitors);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMonitors(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMonitors.size === monitors.length) {
      setSelectedMonitors(new Set());
    } else {
      setSelectedMonitors(new Set(monitors.map(m => m.id)));
    }
  };

  const handleBatchPause = async () => {
    try {
      const promises = Array.from(selectedMonitors).map(id => monitorsApi.pause(id));
      await Promise.all(promises);
      toast({ title: "批量暂停成功", variant: "success" });
      fetchMonitors();
      setSelectedMonitors(new Set());
    } catch {
      toast({ title: "批量暂停失败", variant: "destructive" });
    }
  };

  const handleBatchResume = async () => {
    try {
      const promises = Array.from(selectedMonitors).map(id => monitorsApi.resume(id));
      await Promise.all(promises);
      toast({ title: "批量恢复成功", variant: "success" });
      fetchMonitors();
      setSelectedMonitors(new Set());
    } catch {
      toast({ title: "批量恢复失败", variant: "destructive" });
    }
  };

  const selectedGroup = groups.find(g => g.id === group_id);

  return (
    <MainLayout>
      <div className="flex gap-6">
        {/* Sidebar - Groups */}
        <div className="w-64 shrink-0 hidden lg:block">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">分组</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                  <Link href="/groups">
                    <LayoutGrid className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {groupsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, group_id: "" }))}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                      !group_id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      <span>全部监控</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {groups.reduce((sum, g) => sum + g.monitor_count, 0)}
                    </span>
                  </button>
                  
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setFilters(prev => ({ ...prev, group_id: group.id }))}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                        group_id === group.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="truncate">{group.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {group.monitor_count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {selectedGroup ? selectedGroup.name : "监控项"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {selectedGroup 
                    ? selectedGroup.description || `${selectedGroup.monitor_count} 个监控项`
                    : "管理您的所有监控任务"
                  }
                </p>
              </div>
              <div className="flex gap-2">
                {!batchMode ? (
                  <>
                    {canEdit && (
                      <Button variant="outline" onClick={() => setBatchMode(true)}>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        批量操作
                      </Button>
                    )}
                    {canEdit && (
                      <Button asChild>
                        <Link href="/monitors/new">
                          <Plus className="h-4 w-4 mr-2" />
                          新建监控
                        </Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <Button variant="outline" onClick={() => {
                    setBatchMode(false);
                    setSelectedMonitors(new Set());
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    取消
                  </Button>
                )}
              </div>
            </div>

            {/* Batch Operation Bar */}
            {batchMode && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedMonitors.size === monitors.length && monitors.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm font-medium">
                        已选择 {selectedMonitors.size} 个
                      </span>
                    </div>
                    <div className="flex-1" />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={selectedMonitors.size === 0}
                        onClick={handleBatchPause}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        暂停
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={selectedMonitors.size === 0}
                        onClick={handleBatchResume}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        恢复
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={selectedMonitors.size === 0}
                        onClick={() => setMoveDialogOpen(true)}
                      >
                        <FolderInput className="h-4 w-4 mr-2" />
                        移动到分组
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                    {/* Mobile Group Select */}
                    <div className="lg:hidden">
                      <Select
                        value={filters.group_id || "all"}
                        onValueChange={(value) =>
                          setFilters((prev) => ({ ...prev, group_id: value === "all" ? "" : value }))
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="分组" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部分组</SelectItem>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: group.color }}
                                />
                                {group.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : monitors.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {selectedGroup ? "该分组暂无监控项" : "暂无监控项"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedGroup ? "将监控项移动到这个分组" : "创建您的第一个监控任务"}
                  </p>
                  {canEdit && (
                    <Button asChild>
                      <Link href="/monitors/new">
                        <Plus className="h-4 w-4 mr-2" />
                        新建监控
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {monitors.map((monitor) => (
                    <MonitorCard
                      key={monitor.id}
                      monitor={monitor}
                      onPause={handlePause}
                      onResume={handleResume}
                      onDelete={setDeleteId}
                      onCheck={handleCheck}
                      checking={checkingId === monitor.id}
                      selectable={batchMode}
                      selected={selectedMonitors.has(monitor.id)}
                      onSelect={handleToggleSelect}
                      canEdit={canEdit}
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
          </div>
        </div>
      </div>

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

      {/* Move Monitors Dialog */}
      <MoveMonitorsDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        monitors={monitors.filter(m => selectedMonitors.has(m.id))}
        currentGroupId={group_id}
        onSuccess={() => {
          fetchMonitors();
          setSelectedMonitors(new Set());
        }}
      />
    </MainLayout>
  );
}

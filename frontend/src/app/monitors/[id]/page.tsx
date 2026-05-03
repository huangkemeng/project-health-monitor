"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Play,
  Pause,
  Trash2,
  Activity,
  Clock,
  Globe,
  Settings,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  History,
  TrendingUp,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import { useToast } from "@/hooks/use-toast";
import { monitorsApi } from "@/lib/api";
import { Monitor, HealthStatus } from "@/types";
import { formatDateTime, formatRelativeTime, cn } from "@/lib/utils";

function StatusBadge({ status, health }: { status: string; health: HealthStatus }) {
  const healthConfig = {
    normal: { label: "正常", variant: "success" as const, icon: CheckCircle, color: "text-emerald-600" },
    warning: { label: "警告", variant: "warning" as const, icon: AlertTriangle, color: "text-amber-600" },
    critical: { label: "严重", variant: "destructive" as const, icon: AlertCircle, color: "text-red-600" },
  };

  const config = healthConfig[health] || healthConfig.normal;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      {status === "paused" && (
        <Badge variant="secondary">已暂停</Badge>
      )}
    </div>
  );
}

function StatItem({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-2 rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function MonitorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchMonitor = async () => {
      try {
        const data = await monitorsApi.get(params.id);
        setMonitor(data);
      } catch (error) {
        toast({
          title: "获取监控详情失败",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchMonitor();
  }, [params.id, toast]);

  const handlePause = async () => {
    try {
      await monitorsApi.pause(params.id);
      const data = await monitorsApi.get(params.id);
      setMonitor(data);
      toast({ title: "监控已暂停", variant: "success" });
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleResume = async () => {
    try {
      await monitorsApi.resume(params.id);
      const data = await monitorsApi.get(params.id);
      setMonitor(data);
      toast({ title: "监控已恢复", variant: "success" });
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await monitorsApi.delete(params.id);
      toast({ title: "监控已删除", variant: "success" });
      router.push("/monitors");
    } catch {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  if (!monitor) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto text-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">监控项不存在</h3>
          <Button asChild variant="outline">
            <Link href="/monitors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回列表
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const totalChecks = monitor.total_checks || 0;
  const successChecks = monitor.success_checks || 0;
  const failedChecks = monitor.failed_checks || 0;
  const criticalThreshold = monitor.critical_threshold || monitor.warning_threshold * 2 || 5000;
  
  const successRate = totalChecks > 0
    ? ((successChecks / totalChecks) * 100).toFixed(1)
    : "0";

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/monitors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{monitor.name}</h1>
              <p className="text-muted-foreground text-sm">{monitor.url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {monitor.status === "active" ? (
              <Button variant="outline" onClick={handlePause}>
                <Pause className="h-4 w-4 mr-2" />
                暂停
              </Button>
            ) : (
              <Button onClick={handleResume}>
                <Play className="h-4 w-4 mr-2" />
                恢复
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/monitors/${params.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-full",
                  monitor.health_status === "normal" && "bg-emerald-100",
                  monitor.health_status === "warning" && "bg-amber-100",
                  monitor.health_status === "critical" && "bg-red-100"
                )}>
                  <Activity className={cn(
                    "h-6 w-6",
                    monitor.health_status === "normal" && "text-emerald-600",
                    monitor.health_status === "warning" && "text-amber-600",
                    monitor.health_status === "critical" && "text-red-600"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">当前状态</p>
                  <StatusBadge status={monitor.status} health={monitor.health_status} />
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-muted-foreground">最后检查</p>
                  <p className="font-medium">
                    {monitor.last_check_at
                      ? formatRelativeTime(monitor.last_check_at)
                      : "从未"}
                  </p>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="text-right">
                  <p className="text-muted-foreground">响应时间</p>
                  <p className="font-medium">
                    {monitor.last_response_time
                      ? `${monitor.last_response_time}ms`
                      : "--"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatItem
            label="成功率"
            value={`${successRate}%`}
            icon={TrendingUp}
          />
          <StatItem
            label="总检查次数"
            value={totalChecks.toString()}
            icon={History}
          />
          <StatItem
            label="成功次数"
            value={successChecks.toString()}
            icon={CheckCircle}
          />
          <StatItem
            label="失败次数"
            value={failedChecks.toString()}
            icon={AlertCircle}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                基本配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">请求方法</p>
                  <p className="font-medium">{monitor.method}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">期望状态码</p>
                  <p className="font-medium">{monitor.expected_status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">探测间隔</p>
                  <p className="font-medium">{monitor.interval} 秒</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">超时时间</p>
                  <p className="font-medium">{monitor.timeout} 秒</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">重试次数</p>
                  <p className="font-medium">{monitor.retry_times}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">连续失败</p>
                  <p className="font-medium">{monitor.consecutive_failures}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">目标 URL</p>
                <p className="font-medium break-all">{monitor.url}</p>
              </div>
            </CardContent>
          </Card>

          {/* Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                告警阈值
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">警告阈值</span>
                  <span className="font-medium">{monitor.warning_threshold}ms</span>
                </div>
                <Progress value={Math.min((monitor.last_response_time || 0) / monitor.warning_threshold * 100, 100)} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">严重阈值</span>
                  <span className="font-medium">{criticalThreshold}ms</span>
                </div>
                <Progress value={Math.min((monitor.last_response_time || 0) / criticalThreshold * 100, 100)} className="h-2" />
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Webhook 通知</p>
                <p className="font-medium">{monitor.webhook_name || "未配置"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Link */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">检查历史</h3>
                  <p className="text-sm text-muted-foreground">查看该监控项的所有检查记录</p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href={`/history/checks?monitor_id=${params.id}`}>
                  查看历史
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将永久删除监控项 "{monitor.name}" 及其所有历史数据，无法恢复。
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

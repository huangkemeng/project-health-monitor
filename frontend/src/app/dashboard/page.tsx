"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi } from "@/lib/api";
import { DashboardData, DashboardMonitorItem, Alert } from "@/types";
import { formatRelativeTime, cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  trend?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

function StatCard({ title, value, description, icon, trend, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "bg-card",
    success: "bg-emerald-50/50 border-emerald-200",
    warning: "bg-amber-50/50 border-amber-200",
    danger: "bg-red-50/50 border-red-200",
  };

  return (
    <Card className={cn("transition-all hover:shadow-md", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2 rounded-lg",
          variant === "success" && "bg-emerald-100 text-emerald-600",
          variant === "warning" && "bg-amber-100 text-amber-600",
          variant === "danger" && "bg-red-100 text-red-600",
          variant === "default" && "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {trend && (
          <div className="flex items-center mt-2 text-xs text-emerald-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: string }) {
  const styles = {
    normal: "bg-emerald-500 status-dot-normal",
    warning: "bg-amber-500 status-dot-warning",
    critical: "bg-red-500 status-dot-critical",
  };

  return (
    <span
      className={cn(
        "inline-flex h-2.5 w-2.5 rounded-full",
        styles[status as keyof typeof styles] || "bg-gray-400"
      )}
    />
  );
}

function MonitorList({ monitors, loading }: { monitors: DashboardMonitorItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (monitors.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">暂无监控项</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/monitors/new">
            <Plus className="h-4 w-4 mr-2" />
            创建监控
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {monitors.map((monitor) => (
        <Link
          key={monitor.id}
          href={`/monitors/${monitor.id}`}
          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <StatusDot status={monitor.health_status} />
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">
                {monitor.name}
              </p>
              <p className="text-sm text-muted-foreground">{monitor.url}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {monitor.response_time && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{monitor.response_time}ms</p>
                <p className="text-xs text-muted-foreground">响应时间</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {monitor.last_check_at
                  ? formatRelativeTime(monitor.last_check_at)
                  : "从未检查"}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function AlertList({ alerts, loading }: { alerts: Alert[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
        <p className="text-muted-foreground">暂无告警</p>
        <p className="text-sm text-muted-foreground mt-1">所有监控项运行正常</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "p-4 rounded-lg border",
            alert.level === "critical"
              ? "bg-red-50/50 border-red-200"
              : "bg-amber-50/50 border-amber-200"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {alert.level === "critical" ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span className="font-medium">{alert.monitor_name}</span>
            </div>
            <Badge
              variant={alert.level === "critical" ? "destructive" : "warning"}
              className="text-xs"
            >
              {alert.level === "critical" ? "严重" : "警告"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{alert.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatRelativeTime(alert.created_at)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await dashboardApi.get();
      setData(response);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  }, []);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    try {
      await fetchData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []); // Only run once on mount

  // Auto refresh every 60 seconds (increased from 30s to reduce server load)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Map backend data to frontend format
  const summary = data?.summary;
  const stats = data?.stats || {
    total_monitors: summary?.total || 0,
    active_monitors: (summary?.total || 0) - (summary?.paused || 0),
    warning_monitors: summary?.warning || 0,
    critical_monitors: summary?.critical || 0,
    total_checks_24h: 0,
    success_rate: 0,
  };

  const monitors = data?.items || [];
  const alerts = data?.recent_alerts || [];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
            <p className="text-muted-foreground mt-1">
              实时监控您的服务健康状态
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              刷新
            </Button>
            <Button asChild size="sm">
              <Link href="/monitors/new">
                <Plus className="h-4 w-4 mr-2" />
                新建监控
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="总监控项"
            value={stats.total_monitors}
            description={`${stats.active_monitors} 个运行中`}
            icon={<Activity className="h-4 w-4" />}
            variant="default"
          />
          <StatCard
            title="正常"
            value={stats.active_monitors - stats.warning_monitors - stats.critical_monitors}
            description="运行状态良好"
            icon={<CheckCircle className="h-4 w-4" />}
            variant="success"
          />
          <StatCard
            title="警告"
            value={stats.warning_monitors}
            description="需要关注"
            icon={<AlertTriangle className="h-4 w-4" />}
            variant="warning"
          />
          <StatCard
            title="严重"
            value={stats.critical_monitors}
            description="需要立即处理"
            icon={<AlertCircle className="h-4 w-4" />}
            variant="danger"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Monitor Status */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>监控状态</CardTitle>
                <CardDescription>最近更新的监控项</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/monitors">
                  查看全部
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <MonitorList monitors={monitors} loading={loading} />
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>最近告警</CardTitle>
              <CardDescription>需要关注的异常</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertList alerts={alerts} loading={loading} />
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle>性能概览</CardTitle>
            <CardDescription>过去 24 小时的监控统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">成功率</span>
                  <span className="text-sm text-muted-foreground">
                    {(stats.success_rate || 0).toFixed(1)}%
                  </span>
                </div>
                <Progress value={stats.success_rate || 0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">总检查次数</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.total_checks_24h.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  过去 24 小时
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">活跃监控</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.active_monitors} / {stats.total_monitors}
                  </span>
                </div>
                <Progress
                  value={stats.total_monitors > 0 ? (stats.active_monitors / stats.total_monitors) * 100 : 0}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

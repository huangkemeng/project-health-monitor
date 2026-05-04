'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { groupsApi } from '@/lib/api';
import { MonitorGroup } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-handler';
import {
  FolderOpen,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Monitor,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  LayoutDashboard,
  BarChart3,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreateGroupDialog } from './CreateGroupDialog';
import { EditGroupDialog } from './EditGroupDialog';

// Statistics Card Component
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <p className={`text-xs mt-1 ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Health Status Bar Component
function HealthStatusBar({
  normal,
  warning,
  critical,
  total,
}: {
  normal: number;
  warning: number;
  critical: number;
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>无监控项</span>
        </div>
        <div className="h-2 bg-muted rounded-full" />
      </div>
    );
  }

  const normalPercent = (normal / total) * 100;
  const warningPercent = (warning / total) * 100;
  const criticalPercent = (critical / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-emerald-600">{normal} 正常</span>
        <span className="text-amber-600">{warning} 警告</span>
        <span className="text-red-600">{critical} 严重</span>
      </div>
      <div className="h-2 flex rounded-full overflow-hidden">
        <div
          className="bg-emerald-500"
          style={{ width: `${normalPercent}%` }}
        />
        <div
          className="bg-amber-500"
          style={{ width: `${warningPercent}%` }}
        />
        <div
          className="bg-red-500"
          style={{ width: `${criticalPercent}%` }}
        />
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [groups, setGroups] = useState<MonitorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<MonitorGroup | null>(null);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await groupsApi.list();
      setGroups(response.items);
    } catch (err) {
      toast({
        title: '获取分组失败',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    fetchGroups();
    toast({
      title: '创建成功',
      description: '分组已创建',
      variant: 'success',
    });
  };

  const handleEditClick = (group: MonitorGroup) => {
    setSelectedGroup(group);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedGroup(null);
    fetchGroups();
    toast({
      title: '更新成功',
      description: '分组已更新',
      variant: 'success',
    });
  };

  const handleDeleteClick = (group: MonitorGroup) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedGroup) return;

    try {
      await groupsApi.delete(selectedGroup.id);
      toast({
        title: '删除成功',
        description: '分组已删除，监控项已移至默认分组',
        variant: 'success',
      });
      fetchGroups();
    } catch (err) {
      toast({
        title: '删除失败',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
    }
  };

  // Calculate overall statistics
  const totalMonitors = groups.reduce((sum, g) => sum + g.monitor_count, 0);
  const totalNormal = groups.reduce((sum, g) => sum + g.health_summary.normal, 0);
  const totalWarning = groups.reduce((sum, g) => sum + g.health_summary.warning, 0);
  const totalCritical = groups.reduce((sum, g) => sum + g.health_summary.critical, 0);
  const healthyGroups = groups.filter(
    g => g.monitor_count > 0 && g.health_summary.critical === 0 && g.health_summary.warning === 0
  ).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">分组管理</h1>
            <p className="text-muted-foreground mt-1">
              管理监控项分组，查看各组健康状况
            </p>
          </div>
          {/* 只有项目所有者可以创建分组 */}
          {groups.some(g => g.is_own_project) && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建分组
            </Button>
          )}
        </div>

        {/* Statistics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="总分组数"
            value={groups.length}
            description={`${groups.filter(g => g.is_default).length} 个默认分组`}
            icon={FolderOpen}
          />
          <StatCard
            title="监控项总数"
            value={totalMonitors}
            description="跨所有分组"
            icon={Monitor}
          />
          <StatCard
            title="健康分组"
            value={healthyGroups}
            description={`${groups.filter(g => g.monitor_count > 0).length} 个分组有监控项`}
            icon={CheckCircle}
            trend={`${Math.round((healthyGroups / Math.max(groups.filter(g => g.monitor_count > 0).length, 1)) * 100)}% 健康率`}
            trendUp={true}
          />
          <StatCard
            title="需要关注"
            value={totalWarning + totalCritical}
            description={`${totalWarning} 警告 · ${totalCritical} 严重`}
            icon={totalCritical > 0 ? XCircle : AlertTriangle}
            trend={totalCritical > 0 ? '存在严重问题' : totalWarning > 0 ? '存在警告' : '一切正常'}
            trendUp={totalCritical === 0 && totalWarning === 0}
          />
        </div>

        {/* Overall Health Status */}
        {totalMonitors > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                整体健康状态
              </CardTitle>
              <CardDescription>
                所有分组合并的健康状态分布
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <HealthStatusBar
                  normal={totalNormal}
                  warning={totalWarning}
                  critical={totalCritical}
                  total={totalMonitors}
                />
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-600">{totalNormal}</p>
                    <p className="text-sm text-emerald-700">正常</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">{totalWarning}</p>
                    <p className="text-sm text-amber-700">警告</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{totalCritical}</p>
                    <p className="text-sm text-red-700">严重</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Groups List */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            分组列表
          </h2>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-48">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-8 bg-muted rounded w-2/3" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无分组</h3>
                <p className="text-muted-foreground mb-4">
                  创建您的第一个监控分组
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  新建分组
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="group hover:shadow-md transition-all"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${group.color}20` }}
                        >
                          <FolderOpen
                            className="h-5 w-5"
                            style={{ color: group.color }}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold">{group.name}</h3>
                          {group.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              默认
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* 只有所有者或编辑者可以编辑/删除分组，且不能操作默认分组 */}
                      {!group.is_default && (group.is_own_project || group.role === 'editor') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditClick(group)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            {/* 只有所有者可以删除分组 */}
                            {group.is_own_project && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(group)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {group.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {group.description}
                      </p>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">监控项</span>
                        <span className="font-medium">{group.monitor_count}</span>
                      </div>

                      {group.monitor_count > 0 && (
                        <HealthStatusBar
                          normal={group.health_summary.normal}
                          warning={group.health_summary.warning}
                          critical={group.health_summary.critical}
                          total={group.monitor_count}
                        />
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <Link
                        href={`/monitors?group_id=${group.id}`}
                        className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                      >
                        查看监控项
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Dialog */}
      {selectedGroup && (
        <EditGroupDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          group={selectedGroup}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除分组</AlertDialogTitle>
            <AlertDialogDescription>
              删除后，该分组中的监控项将自动移动到默认分组。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedGroup(null)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

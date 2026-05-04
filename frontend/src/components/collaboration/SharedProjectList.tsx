'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, XCircle, User, Shield, Eye, RefreshCw } from 'lucide-react';
import { collaborationApi } from '@/lib/api';
import { SharedProject, CollaboratorRole } from '@/types';

export function SharedProjectList() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<SharedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);

  // 加载项目的回调函数
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const sharedData = await collaborationApi.listSharedProjects();
      setProjects(sharedData || []);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载共享项目列表',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []); // 不依赖 toast，避免无限循环

  // 只在组件挂载时加载一次
  useEffect(() => {
    loadProjects();
  }, []);

  const handleReject = async (project: SharedProject) => {
    if (!confirm(`确定要拒绝 ${project.owner_username} 的共享项目吗？`)) {
      return;
    }

    try {
      setRejecting(project.owner_id);
      await collaborationApi.rejectProject(project.owner_id);
      toast({
        title: '已拒绝',
        description: `已拒绝 ${project.owner_username} 的项目共享`,
      });
      loadProjects();
    } catch (error: any) {
      toast({
        title: '操作失败',
        description: error.message || '无法拒绝项目',
        variant: 'destructive',
      });
    } finally {
      setRejecting(null);
    }
  };

  const getRoleBadge = (role: CollaboratorRole | 'owner') => {
    switch (role) {
      case 'owner':
        return (
          <Badge className="bg-purple-500">
            <Shield className="mr-1 h-3 w-3" />
            所有者
          </Badge>
        );
      case 'editor':
        return (
          <Badge className="bg-blue-500">
            <User className="mr-1 h-3 w-3" />
            编辑者
          </Badge>
        );
      case 'viewer':
        return (
          <Badge variant="secondary">
            <Eye className="mr-1 h-3 w-3" />
            查看者
          </Badge>
        );
      default:
        return null;
    }
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return '所有分组';
    if (groupId === 'ungrouped') return '未分组';
    return '指定分组';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>共享项目</CardTitle>
          <CardDescription>管理您被邀请的共享项目</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>共享项目</CardTitle>
          <CardDescription>管理您被邀请的共享项目</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={loadProjects} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>暂无共享项目</p>
            <p className="text-sm">当其他用户邀请您协作时，项目将显示在这里</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目所有者</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>您的权限</TableHead>
                <TableHead>可访问分组</TableHead>
                <TableHead>加入时间</TableHead>
                <TableHead className="w-[120px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.owner_id}>
                  <TableCell className="font-medium">{project.owner_username}</TableCell>
                  <TableCell>{project.owner_email}</TableCell>
                  <TableCell>{getRoleBadge(project.role)}</TableCell>
                  <TableCell>{getGroupName(project.group_id)}</TableCell>
                  <TableCell>
                    {new Date(project.joined_at).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReject(project)}
                      disabled={rejecting === project.owner_id}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      拒绝
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

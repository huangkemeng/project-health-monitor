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

interface SharedProjectListProps {
  onSwitchProject?: (project: SharedProject) => void;
}

export function SharedProjectList({ onSwitchProject }: SharedProjectListProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<SharedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await collaborationApi.listSharedProjects();
      setProjects(data);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载共享项目列表',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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

  const handleSwitch = (project: SharedProject) => {
    if (onSwitchProject) {
      onSwitchProject(project);
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
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getGroupDisplay = (groupName: string | null) => {
    if (!groupName) return <span className="text-muted-foreground">所有分组</span>;
    return groupName;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>共享项目</CardTitle>
          <CardDescription>他人与您共享的监控项目</CardDescription>
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
          <CardDescription>他人与您共享的监控项目</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={loadProjects} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
                <TableHead>我的权限</TableHead>
                <TableHead>可访问分组</TableHead>
                <TableHead>加入时间</TableHead>
                <TableHead className="w-[200px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.owner_id}>
                  <TableCell className="font-medium">
                    {project.owner_username}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.owner_email}
                  </TableCell>
                  <TableCell>{getRoleBadge(project.role)}</TableCell>
                  <TableCell>{getGroupDisplay(project.group_name)}</TableCell>
                  <TableCell>
                    {new Date(project.joined_at).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSwitch(project)}
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        查看项目
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(project)}
                        disabled={rejecting === project.owner_id}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {rejecting === project.owner_id ? '处理中...' : '拒绝'}
                      </Button>
                    </div>
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

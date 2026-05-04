'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, ChevronDown, FolderOpen, User, Users } from 'lucide-react';
import { collaborationApi } from '@/lib/api';
import { SharedProject, CollaboratorRole } from '@/types';

export function ProjectSwitcher() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<SharedProject[]>([]);
  const [currentProject, setCurrentProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // 加载项目的回调函数
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await collaborationApi.listProjects();
      setProjects(data.projects);

      // Find current project
      const current = data.projects.find(
        (p) => p.owner_id === data.current_project.owner_id
      );
      if (current) {
        setCurrentProject(current);
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载项目列表',
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

  const handleSwitchProject = async (project: SharedProject) => {
    if (project.owner_id === currentProject?.owner_id) {
      return;
    }

    try {
      setSwitching(true);
      await collaborationApi.switchProject(project.owner_id);
      setCurrentProject(project);
      toast({
        title: '切换成功',
        description: project.is_own_project
          ? '已切换到您的项目'
          : `已切换到 ${project.owner_username} 的项目`,
      });
      // Reload page to refresh data
      window.location.reload();
    } catch (error: any) {
      toast({
        title: '切换失败',
        description: error.message || '无法切换项目',
        variant: 'destructive',
      });
    } finally {
      setSwitching(false);
    }
  };

  const getRoleBadge = (role: CollaboratorRole | 'owner') => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-purple-500 text-[10px]">所有者</Badge>;
      case 'editor':
        return <Badge className="bg-blue-500 text-[10px]">编辑者</Badge>;
      case 'viewer':
        return <Badge variant="secondary" className="text-[10px]">查看者</Badge>;
      default:
        return null;
    }
  };

  const getProjectIcon = (project: SharedProject) => {
    if (project.is_own_project) {
      return <User className="mr-2 h-4 w-4 text-primary" />;
    }
    return <Users className="mr-2 h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Building2 className="mr-2 h-4 w-4" />
        加载中...
      </Button>
    );
  }

  // If no shared projects, show simple indicator
  if (projects.length <= 1) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <FolderOpen className="mr-2 h-4 w-4" />
        我的项目
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          {currentProject?.is_own_project ? (
            <User className="h-4 w-4" />
          ) : (
            <Users className="h-4 w-4" />
          )}
          <span className="max-w-[120px] truncate">
            {currentProject?.is_own_project
              ? '我的项目'
              : currentProject?.owner_username}
          </span>
          {getRoleBadge(currentProject?.role || 'owner')}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>切换项目</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.owner_id}
            onClick={() => handleSwitchProject(project)}
            disabled={switching || project.owner_id === currentProject?.owner_id}
            className="flex items-center justify-between"
          >
            <div className="flex items-center flex-1 min-w-0">
              {getProjectIcon(project)}
              <div className="flex flex-col min-w-0">
                <span className="truncate font-medium">
                  {project.is_own_project
                    ? '我的项目'
                    : project.owner_username}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {project.owner_email}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              {getRoleBadge(project.role)}
              {project.owner_id === currentProject?.owner_id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

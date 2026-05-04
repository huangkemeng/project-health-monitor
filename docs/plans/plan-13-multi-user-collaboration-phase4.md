# Plan-13: 多人协作功能 - Phase 4: 前端UI开发

> **计划版本**: v1.0  
> **创建日期**: 2026-05-04  
> **对应PRD**: [多人协作管理项目监测 - 增强需求文档](../multi-user-collaboration-prd.md)  
> **前置计划**: [Plan-12: 权限中间件与数据隔离](./plan-12-multi-user-collaboration-phase3.md)

---

## 1. 阶段目标

本阶段实现多人协作功能的前端UI，包括协作者管理界面、共享项目列表、项目切换等功能。

### 1.1 核心交付物

| 交付物 | 说明 |
|-------|------|
| 协作者管理页面 | 邀请、列表、修改、移除协作者 |
| 共享项目页面 | 查看与我共享的项目列表 |
| 项目切换组件 | 切换查看不同项目的监控 |
| 权限控制UI | 根据权限显示/隐藏操作按钮 |
| API客户端更新 | 新增协作相关API调用 |

### 1.2 页面结构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         前端页面结构                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  设置页面新增标签页                                                           │
│  ├── 监控设置 (原有)                                                         │
│  ├── Webhook设置 (原有)                                                      │
│  ├── 分组管理 (原有)                                                         │
│  └── 成员管理 (新增) ◀── 协作者管理页面                                       │
│       ├── 协作者列表                                                         │
│       ├── 邀请成员按钮/弹窗                                                   │
│       └── 权限编辑/移除操作                                                   │
│                                                                              │
│  新增页面                                                                    │
│  ├── /shared-projects ◀── 与我共享的项目                                     │
│  │   └── 项目卡片列表 + 拒绝按钮                                              │
│  │                                                                          │
│  └── 项目切换功能                                                            │
│       ├── Header下拉菜单 ◀── 切换当前项目                                     │
│       └── 显示当前项目所有者信息                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 实现任务清单

### 任务 1: 更新API客户端

**文件**: `frontend/src/lib/api.ts` (修改)

#### 3.1.1 添加协作相关API
```typescript
import type { 
  ProjectCollaboratorResponse, 
  SharedProject,
  CollaboratorRole 
} from '@/types';

// ============ 协作者管理 API ============

export async function getCollaborators(): Promise<ProjectCollaboratorResponse[]> {
  const response = await api.get('/collaborators');
  return response.data;
}

export async function inviteCollaborator(
  email: string,
  role: CollaboratorRole,
  groupId: string | null
): Promise<ProjectCollaboratorResponse> {
  const response = await api.post('/collaborators', { email, role, groupId });
  return response.data;
}

export async function updateCollaborator(
  id: string,
  updates: { role?: CollaboratorRole; groupId?: string | null }
): Promise<void> {
  await api.put(`/collaborators/${id}`, updates);
}

export async function removeCollaborator(id: string): Promise<void> {
  await api.delete(`/collaborators/${id}`);
}

// ============ 共享项目 API ============

export async function getSharedProjects(): Promise<SharedProject[]> {
  const response = await api.get('/shared-projects');
  return response.data;
}

export async function rejectProject(ownerId: string): Promise<void> {
  await api.post(`/shared-projects/${ownerId}/reject`);
}

// ============ 项目切换 API ============

export async function getProjectMonitors(ownerId: string): Promise<Monitor[]> {
  const response = await api.get(`/projects/${ownerId}/monitors`);
  return response.data;
}

export async function getProjectGroups(ownerId: string): Promise<Group[]> {
  const response = await api.get(`/projects/${ownerId}/groups`);
  return response.data;
}
```

**验收标准**:
- [ ] 所有API函数已添加
- [ ] 类型定义正确
- [ ] 错误处理完善

---

### 任务 2: 更新类型定义

**文件**: `frontend/src/types/index.ts` (修改)

```typescript
// ============ 协作相关类型 ============

export type CollaboratorRole = 'viewer' | 'editor';
export type CollaboratorStatus = 'active' | 'rejected';

export interface ProjectCollaborator {
  id: string;
  collaborator_email: string;
  collaborator_username?: string;
  group_id: string | null;
  group_name?: string | null;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  created_at: string;
}

export interface SharedProject {
  owner_id: string;
  owner_username: string;
  owner_email: string;
  role: CollaboratorRole;
  group_id: string | null;
  group_name: string | null;
  joined_at: string;
}

export interface ProjectContext {
  ownerId: string;
  ownerName: string;
  isOwner: boolean;
  role: CollaboratorRole | null;
}
```

**验收标准**:
- [ ] 类型定义完整
- [ ] 与后端API返回类型一致

---

### 任务 3: 创建项目上下文Store

**文件**: `frontend/src/store/project-context.ts` (新建)

使用Zustand创建项目上下文状态管理：

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectContext, CollaboratorRole } from '@/types';

interface ProjectContextState {
  // 当前项目上下文
  currentContext: ProjectContext;
  
  // 可切换的项目列表（我的项目 + 共享项目）
  availableProjects: ProjectContext[];
  
  // Actions
  setCurrentContext: (context: ProjectContext) => void;
  setAvailableProjects: (projects: ProjectContext[]) => void;
  switchProject: (ownerId: string) => void;
  resetToOwnProject: (userId: string, username: string) => void;
}

export const useProjectContext = create<ProjectContextState>()(
  persist(
    (set, get) => ({
      currentContext: {
        ownerId: '',
        ownerName: '',
        isOwner: true,
        role: null,
      },
      availableProjects: [],
      
      setCurrentContext: (context) => set({ currentContext: context }),
      
      setAvailableProjects: (projects) => set({ availableProjects: projects }),
      
      switchProject: (ownerId) => {
        const project = get().availableProjects.find(p => p.ownerId === ownerId);
        if (project) {
          set({ currentContext: project });
        }
      },
      
      resetToOwnProject: (userId, username) => {
        set({
          currentContext: {
            ownerId: userId,
            ownerName: username,
            isOwner: true,
            role: null,
          },
        });
      },
    }),
    {
      name: 'project-context-storage',
    }
  )
);
```

**验收标准**:
- [ ] Store状态正确
- [ ] 持久化配置正确
- [ ] 切换项目功能正常

---

### 任务 4: 创建邀请协作者弹窗

**文件**: `frontend/src/app/settings/InviteCollaboratorDialog.tsx` (新建)

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { inviteCollaborator } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Group } from '@/types';

const inviteSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  role: z.enum(['viewer', 'editor']),
  groupId: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteCollaboratorDialogProps {
  groups: Group[];
  onSuccess: () => void;
  children: React.ReactNode;
}

export function InviteCollaboratorDialog({
  groups,
  onSuccess,
  children,
}: InviteCollaboratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'viewer',
    },
  });
  
  const selectedRole = watch('role');
  
  const onSubmit = async (data: InviteFormData) => {
    setIsLoading(true);
    try {
      await inviteCollaborator(
        data.email,
        data.role,
        data.groupId || null
      );
      toast({
        title: '邀请成功',
        description: `已向 ${data.email} 发送邀请`,
      });
      reset();
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: '邀请失败',
        description: error.response?.data?.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>邀请成员</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">邮箱地址</label>
            <Input
              {...register('email')}
              placeholder="collaborator@example.com"
              error={errors.email?.message}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">权限级别</label>
            <Select
              value={selectedRole}
              onValueChange={(value: 'viewer' | 'editor') => setValue('role', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">只读 (Viewer)</SelectItem>
                <SelectItem value="editor">编辑 (Editor)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedRole === 'viewer' 
                ? '只读用户：可查看监控项、历史记录、告警，可手动运行检查'
                : '编辑用户：可创建、修改、删除监控项，配置Webhook，管理告警'}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium">可访问分组</label>
            <Select
              onValueChange={(value) => setValue('groupId', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="全部分组" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分组</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '邀请中...' : '邀请'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**验收标准**:
- [ ] 表单验证正确
- [ ] 邮箱格式校验
- [ ] 权限说明清晰
- [ ] 分组选择可选

---

### 任务 5: 创建协作者管理页面

**文件**: `frontend/src/app/settings/CollaboratorsTab.tsx` (新建)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserPlus, Trash2, Edit } from 'lucide-react';
import { getCollaborators, removeCollaborator, updateCollaborator } from '@/lib/api';
import { getGroups } from '@/lib/api';
import { InviteCollaboratorDialog } from './InviteCollaboratorDialog';
import { EditCollaboratorDialog } from './EditCollaboratorDialog';
import { useToast } from '@/hooks/use-toast';
import type { ProjectCollaborator, Group } from '@/types';

export function CollaboratorsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCollaborator, setEditingCollaborator] = useState<ProjectCollaborator | null>(null);
  
  const fetchData = async () => {
    try {
      const [collabs, grps] = await Promise.all([
        getCollaborators(),
        getGroups(),
      ]);
      setCollaborators(collabs);
      setGroups(grps);
    } catch (error) {
      toast({
        title: '获取数据失败',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const handleRemove = async (id: string) => {
    if (!confirm('确定要移除该协作者吗？')) return;
    
    try {
      await removeCollaborator(id);
      toast({ title: '移除成功' });
      fetchData();
    } catch (error) {
      toast({ title: '移除失败', variant: 'destructive' });
    }
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'editor':
        return <Badge className="bg-blue-100 text-blue-800">编辑</Badge>;
      case 'viewer':
        return <Badge variant="secondary">只读</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };
  
  const getGroupName = (groupId: string | null) => {
    if (groupId === null) return '全部分组';
    const group = groups.find(g => g.id === groupId);
    return group?.name || '未知分组';
  };
  
  if (isLoading) {
    return <div>加载中...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">成员管理</h3>
          <p className="text-sm text-gray-500">
            邀请团队成员共同管理项目监控，分配不同的权限级别和分组访问范围
          </p>
        </div>
        <InviteCollaboratorDialog groups={groups} onSuccess={fetchData}>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            邀请成员
          </Button>
        </InviteCollaboratorDialog>
      </div>
      
      {collaborators.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">暂无协作者</p>
          <p className="text-sm text-gray-400 mt-1">
            点击"邀请成员"按钮添加团队成员
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>邮箱/用户名</TableHead>
              <TableHead>权限级别</TableHead>
              <TableHead>可访问分组</TableHead>
              <TableHead>加入时间</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collaborators.map((collab) => (
              <TableRow key={collab.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{collab.collaborator_email}</div>
                    {collab.collaborator_username && (
                      <div className="text-sm text-gray-500">
                        @{collab.collaborator_username}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(collab.role)}</TableCell>
                <TableCell>{getGroupName(collab.group_id)}</TableCell>
                <TableCell>
                  {new Date(collab.created_at).toLocaleDateString('zh-CN')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingCollaborator(collab)}>
                        <Edit className="w-4 h-4 mr-2" />
                        修改权限
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleRemove(collab.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        移除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      {editingCollaborator && (
        <EditCollaboratorDialog
          collaborator={editingCollaborator}
          groups={groups}
          open={!!editingCollaborator}
          onOpenChange={(open) => !open && setEditingCollaborator(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
```

**验收标准**:
- [ ] 列表显示正确
- [ ] 权限徽章区分明显
- [ ] 操作菜单功能正常
- [ ] 空状态提示友好

---

### 任务 6: 更新设置页面

**文件**: `frontend/src/app/settings/page.tsx` (修改)

在设置页面添加"成员管理"标签页：

```typescript
import { CollaboratorsTab } from './CollaboratorsTab';

// 在Tabs组件中添加
<TabsContent value="collaborators" className="space-y-4">
  <CollaboratorsTab />
</TabsContent>

// 在TabsList中添加
<TabsTrigger value="collaborators">成员管理</TabsTrigger>
```

**验收标准**:
- [ ] 成员管理标签页显示正常
- [ ] 切换标签页无问题

---

### 任务 7: 创建共享项目页面

**文件**: `frontend/src/app/shared-projects/page.tsx` (新建)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, X, Eye, Edit3 } from 'lucide-react';
import { getSharedProjects, rejectProject } from '@/lib/api';
import { useProjectContext } from '@/store/project-context';
import { useToast } from '@/hooks/use-toast';
import type { SharedProject } from '@/types';

export default function SharedProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setCurrentContext, setAvailableProjects } = useProjectContext();
  const [projects, setProjects] = useState<SharedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchProjects = async () => {
    try {
      const data = await getSharedProjects();
      setProjects(data);
      
      // 更新可用项目列表
      setAvailableProjects([
        // 当前用户自己的项目
        {
          ownerId: 'current-user-id', // 从auth获取
          ownerName: '我的项目',
          isOwner: true,
          role: null,
        },
        // 共享项目
        ...data.map(p => ({
          ownerId: p.owner_id,
          ownerName: p.owner_username,
          isOwner: false,
          role: p.role,
        })),
      ]);
    } catch (error) {
      toast({
        title: '获取共享项目失败',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchProjects();
  }, []);
  
  const handleViewProject = (project: SharedProject) => {
    setCurrentContext({
      ownerId: project.owner_id,
      ownerName: project.owner_username,
      isOwner: false,
      role: project.role,
    });
    router.push('/dashboard');
  };
  
  const handleReject = async (ownerId: string) => {
    if (!confirm('确定要拒绝该项目吗？拒绝后您将不再能看到此项目的监控数据。')) return;
    
    try {
      await rejectProject(ownerId);
      toast({ title: '已拒绝该项目' });
      fetchProjects();
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'editor':
        return <Badge className="bg-blue-100 text-blue-800"><Edit3 className="w-3 h-3 mr-1" />编辑</Badge>;
      case 'viewer':
        return <Badge variant="secondary"><Eye className="w-3 h-3 mr-1" />只读</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };
  
  if (isLoading) {
    return <div className="p-8">加载中...</div>;
  }
  
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">与我共享的项目</h1>
        <p className="text-gray-500 mt-1">
          其他用户邀请您协作管理的项目，您可以查看或编辑（取决于您的权限）
        </p>
      </div>
      
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无共享项目</p>
            <p className="text-sm text-gray-400 mt-1">
              当其他用户邀请您协作时，项目将显示在这里
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.owner_id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{project.owner_username} 的项目</CardTitle>
                    <CardDescription>{project.owner_email}</CardDescription>
                  </div>
                  {getRoleBadge(project.role)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <p>可访问分组: {project.group_name || '全部分组'}</p>
                    <p>加入时间: {new Date(project.joined_at).toLocaleDateString('zh-CN')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(project.owner_id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      这不是我的项目
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleViewProject(project)}
                    >
                      <FolderOpen className="w-4 h-4 mr-1" />
                      查看项目
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**验收标准**:
- [ ] 共享项目列表显示正确
- [ ] 权限徽章清晰
- [ ] 查看项目按钮可切换上下文
- [ ] 拒绝项目功能正常

---

### 任务 8: 更新Header组件

**文件**: `frontend/src/components/layout/Header.tsx` (修改)

添加项目切换下拉菜单：

```typescript
import { useProjectContext } from '@/store/project-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, User, Users } from 'lucide-react';

export function Header() {
  const { user } = useAuth();
  const { currentContext, availableProjects, switchProject } = useProjectContext();
  const router = useRouter();
  
  // ... 其他代码
  
  return (
    <header className="h-[60px] border-b bg-white flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center">
        <Link href="/dashboard" className="text-xl font-bold">
          健康监控
        </Link>
      </div>
      
      {/* 项目切换 */}
      {availableProjects.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">当前项目:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {currentContext.isOwner ? (
                  <><User className="w-4 h-4 mr-1" /> 我的项目</>
                ) : (
                  <><Users className="w-4 h-4 mr-1" /> {currentContext.ownerName}</>
                )}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableProjects.map((project) => (
                <DropdownMenuItem
                  key={project.ownerId}
                  onClick={() => switchProject(project.ownerId)}
                >
                  {project.isOwner ? '我的项目' : project.ownerName}
                  {project.role && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({project.role === 'editor' ? '编辑' : '只读'})
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/shared-projects')}>
                管理共享项目
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
      {/* 用户菜单 */}
      {/* ... */}
    </header>
  );
}
```

**验收标准**:
- [ ] 项目切换下拉菜单显示正确
- [ ] 切换项目后页面数据更新
- [ ] 显示当前权限级别

---

### 任务 9: 更新监控项页面权限控制

**文件**: `frontend/src/app/monitors/page.tsx` (修改)

根据权限显示/隐藏操作按钮：

```typescript
import { useProjectContext } from '@/store/project-context';

export default function MonitorsPage() {
  const { currentContext } = useProjectContext();
  const canEdit = currentContext.isOwner || currentContext.role === 'editor';
  
  return (
    <div>
      {/* ... */}
      
      {/* 只有可编辑用户显示创建按钮 */}
      {canEdit && (
        <Link href="/monitors/new">
          <Button>新建监控项</Button>
        </Link>
      )}
      
      {/* 监控项列表 */}
      {monitors.map(monitor => (
        <MonitorCard
          key={monitor.id}
          monitor={monitor}
          canEdit={canEdit}
          // ...
        />
      ))}
    </div>
  );
}
```

**验收标准**:
- [ ] 只读用户看不到创建按钮
- [ ] 只读用户看不到编辑/删除按钮
- [ ] 编辑用户可以进行修改操作

---

## 3. 验证方式

### 3.1 功能测试清单

| 功能 | 测试步骤 | 预期结果 |
|-----|---------|---------|
| 邀请协作者 | 填写邮箱、选择权限、点击邀请 | 邀请成功，列表刷新 |
| 修改权限 | 点击修改、更改权限、保存 | 权限更新成功 |
| 移除协作者 | 点击移除、确认 | 协作者被移除 |
| 查看共享项目 | 访问/shared-projects | 显示所有共享项目 |
| 拒绝项目 | 点击"这不是我的项目" | 项目从列表消失 |
| 切换项目 | 点击Header下拉、选择项目 | 页面数据切换 |
| 权限控制 | 以只读用户登录 | 看不到编辑按钮 |

### 3.2 E2E测试

```typescript
// tests/collaboration.e2e.test.ts
describe('Collaboration Flow', () => {
  it('should invite a collaborator', async () => {
    // 登录为所有者
    // 访问设置-成员管理
    // 邀请协作者
    // 验证邀请成功
  });
  
  it('should view shared projects as collaborator', async () => {
    // 登录为协作者
    // 访问共享项目页面
    // 验证能看到共享项目
  });
  
  it('should switch between projects', async () => {
    // 登录为协作者
    // 使用Header下拉切换项目
    // 验证页面数据更新
  });
});
```

---

## 4. 依赖与前置条件

| 依赖项 | 状态 | 说明 |
|-------|:----:|------|
| Plan-12完成 | ⏳ | 权限中间件已完成 |
| shadcn/ui组件 | ✅ | 已安装 |
| zustand | ✅ | 已安装 |
| react-hook-form | ✅ | 已安装 |

---

## 5. 注意事项

1. **状态同步**: 切换项目后需要重新获取数据
2. **权限缓存**: 考虑缓存权限信息避免频繁请求
3. **错误处理**: 权限不足时显示友好的错误提示
4. **响应式设计**: 确保移动端体验良好

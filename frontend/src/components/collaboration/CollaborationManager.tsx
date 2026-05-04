'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Plus, Trash2, UserCog, Mail } from 'lucide-react';
import { collaborationApi, groupsApi } from '@/lib/api';
import { Collaborator, CollaboratorRole, MonitorGroup } from '@/types';

export function CollaborationManager() {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [groups, setGroups] = useState<MonitorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('viewer');
  const [inviteGroupIds, setInviteGroupIds] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);

  // Edit form state
  const [editRole, setEditRole] = useState<CollaboratorRole>('viewer');
  const [editGroupIds, setEditGroupIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  // 加载数据的回调函数
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [collaboratorsData, groupsData] = await Promise.all([
        collaborationApi.listCollaborators(),
        groupsApi.list(),
      ]);
      // 协作者API直接返回数组
      setCollaborators(collaboratorsData || []);
      // 分组API返回 { items: [], total: number }
      setGroups(groupsData?.items || []);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载协作者列表',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []); // 不依赖 toast，避免无限循环

  // 只在组件挂载时加载一次
  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: '请输入邮箱',
        variant: 'destructive',
      });
      return;
    }

    try {
      setInviting(true);
      await collaborationApi.inviteCollaborator({
        email: inviteEmail.trim(),
        role: inviteRole,
        groupIds: inviteGroupIds.length > 0 ? inviteGroupIds : null,
      });

      toast({
        title: '邀请成功',
        description: `已向 ${inviteEmail} 发送邀请`,
      });

      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('viewer');
      setInviteGroupIds([]);
      loadData();
    } catch (error: any) {
      toast({
        title: '邀请失败',
        description: error.message || '无法发送邀请',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCollaborator) return;

    try {
      setUpdating(true);
      await collaborationApi.updateCollaborator(selectedCollaborator.id, {
        role: editRole,
        groupIds: editGroupIds.length > 0 ? editGroupIds : null,
      });

      toast({
        title: '更新成功',
        description: '协作者权限已更新',
      });

      setEditDialogOpen(false);
      setSelectedCollaborator(null);
      loadData();
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '无法更新权限',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async (collaborator: Collaborator) => {
    if (!confirm(`确定要撤销对 ${collaborator.collaborator_email} 的邀请吗？`)) {
      return;
    }

    try {
      await collaborationApi.removeCollaborator(collaborator.id);
      toast({
        title: '撤销成功',
        description: '邀请已被撤销',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: '撤销失败',
        description: error.message || '无法撤销邀请',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setEditRole(collaborator.role);
    // 从 groups 数组中提取 group_id
    const groupIds = collaborator.groups?.map(g => g.group_id) || [];
    setEditGroupIds(groupIds);
    setEditDialogOpen(true);
  };

  const getRoleBadge = (role: CollaboratorRole) => {
    switch (role) {
      case 'editor':
        return <Badge className="bg-blue-500">编辑者</Badge>;
      case 'viewer':
        return <Badge variant="secondary">查看者</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getGroupNames = (collaboratorGroups: { group_id: string; group_name: string }[]) => {
    if (!collaboratorGroups || collaboratorGroups.length === 0) {
      return <span className="text-muted-foreground">所有分组</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {collaboratorGroups.map((g) => (
          <Badge key={g.group_id} variant="outline" className="text-xs">
            {g.group_name}
          </Badge>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>项目协作</CardTitle>
          <CardDescription>管理项目协作者和权限</CardDescription>
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
          <CardTitle>项目协作</CardTitle>
          <CardDescription>管理项目协作者和权限</CardDescription>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              邀请协作者
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>邀请协作者</DialogTitle>
              <DialogDescription>
                邀请其他用户协作管理您的监控项目
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">邮箱地址</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="collaborator@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">权限级别</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as CollaboratorRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">查看者 - 只能查看监控状态</SelectItem>
                    <SelectItem value="editor">编辑者 - 可以管理监控项</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>可访问分组</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="invite-all"
                      checked={inviteGroupIds.length === 0}
                      onCheckedChange={() => setInviteGroupIds([])}
                    />
                    <Label htmlFor="invite-all" className="text-sm font-normal cursor-pointer">
                      所有分组
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="invite-ungrouped"
                      checked={inviteGroupIds.includes('ungrouped')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setInviteGroupIds(prev => [...prev.filter(id => id !== 'ungrouped'), 'ungrouped']);
                        } else {
                          setInviteGroupIds(prev => prev.filter(id => id !== 'ungrouped'));
                        }
                      }}
                    />
                    <Label htmlFor="invite-ungrouped" className="text-sm font-normal cursor-pointer">
                      未分组
                    </Label>
                  </div>
                  {groups.filter(g => !g.is_default).map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`invite-${group.id}`}
                        checked={inviteGroupIds.includes(group.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setInviteGroupIds(prev => [...prev.filter(id => id !== group.id), group.id]);
                          } else {
                            setInviteGroupIds(prev => prev.filter(id => id !== group.id));
                          }
                        }}
                      />
                      <Label htmlFor={`invite-${group.id}`} className="text-sm font-normal cursor-pointer">
                        {group.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  不选择任何分组 = 所有分组，可多选
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleInvite} disabled={inviting}>
                {inviting ? '发送中...' : '发送邀请'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {collaborators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>暂无协作者</p>
            <p className="text-sm">点击上方按钮邀请团队成员</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邮箱</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>权限</TableHead>
                <TableHead>可访问分组</TableHead>
                <TableHead>加入时间</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborators.map((collaborator) => (
                <TableRow key={collaborator.id}>
                  <TableCell>{collaborator.collaborator_email}</TableCell>
                  <TableCell>
                    {collaborator.collaborator_username || (
                      <span className="text-muted-foreground">未注册</span>
                    )}
                  </TableCell>
                  <TableCell>{getRoleBadge(collaborator.role)}</TableCell>
                  <TableCell>{getGroupNames(collaborator.groups)}</TableCell>
                  <TableCell>
                    {new Date(collaborator.created_at).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(collaborator)}>
                          <UserCog className="mr-2 h-4 w-4" />
                          修改权限
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemove(collaborator)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          撤销邀请
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>修改权限</DialogTitle>
            <DialogDescription>
              修改 {selectedCollaborator?.collaborator_email} 的权限设置
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-role">权限级别</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as CollaboratorRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">查看者 - 只能查看监控状态</SelectItem>
                  <SelectItem value="editor">编辑者 - 可以管理监控项</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>可访问分组</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-all"
                    checked={editGroupIds.length === 0}
                    onCheckedChange={() => setEditGroupIds([])}
                  />
                  <Label htmlFor="edit-all" className="text-sm font-normal cursor-pointer">
                    所有分组
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-ungrouped"
                    checked={editGroupIds.includes('ungrouped')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEditGroupIds(prev => [...prev.filter(id => id !== 'ungrouped'), 'ungrouped']);
                      } else {
                        setEditGroupIds(prev => prev.filter(id => id !== 'ungrouped'));
                      }
                    }}
                  />
                  <Label htmlFor="edit-ungrouped" className="text-sm font-normal cursor-pointer">
                    未分组
                  </Label>
                </div>
                {groups.filter(g => !g.is_default).map((group) => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${group.id}`}
                      checked={editGroupIds.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditGroupIds(prev => [...prev.filter(id => id !== group.id), group.id]);
                        } else {
                          setEditGroupIds(prev => prev.filter(id => id !== group.id));
                        }
                      }}
                    />
                    <Label htmlFor={`edit-${group.id}`} className="text-sm font-normal cursor-pointer">
                      {group.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                不选择任何分组 = 所有分组，可多选
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

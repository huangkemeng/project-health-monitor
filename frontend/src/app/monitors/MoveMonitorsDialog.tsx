'use client';

import { useState, useEffect } from 'react';
import { groupsApi, monitorsApi } from '@/lib/api';
import { MonitorGroup, Monitor } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-handler';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, FolderOpen, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MoveMonitorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitors: Monitor[];
  currentGroupId?: string;
  onSuccess: () => void;
}

export function MoveMonitorsDialog({
  open,
  onOpenChange,
  monitors,
  currentGroupId,
  onSuccess,
}: MoveMonitorsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<MonitorGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedMonitors, setSelectedMonitors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchGroups();
      // Pre-select all monitors by default
      setSelectedMonitors(new Set(monitors.map(m => m.id)));
    }
  }, [open, monitors]);

  const fetchGroups = async () => {
    try {
      setGroupsLoading(true);
      const response = await groupsApi.list();
      setGroups(response.items);
    } catch (err) {
      toast({
        title: '获取分组失败',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleToggleMonitor = (monitorId: string) => {
    const newSelected = new Set(selectedMonitors);
    if (newSelected.has(monitorId)) {
      newSelected.delete(monitorId);
    } else {
      newSelected.add(monitorId);
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

  const handleSubmit = async () => {
    if (!selectedGroupId) {
      toast({
        title: '请选择目标分组',
        variant: 'destructive',
      });
      return;
    }

    if (selectedMonitors.size === 0) {
      toast({
        title: '请至少选择一个监控项',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await groupsApi.moveMonitors(selectedGroupId, Array.from(selectedMonitors));
      toast({
        title: '移动成功',
        description: `已成功移动 ${selectedMonitors.size} 个监控项`,
        variant: 'success',
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: '移动失败',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setSelectedGroupId('');
      setSelectedMonitors(new Set());
    }
  };

  const availableGroups = groups.filter(g => g.id !== currentGroupId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            批量移动监控项
          </DialogTitle>
          <DialogDescription>
            将选中的监控项移动到其他分组
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Target Group Selection */}
          <div className="space-y-2">
            <Label>目标分组</Label>
            {groupsLoading ? (
              <div className="h-10 bg-muted rounded animate-pulse" />
            ) : (
              <Select
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择目标分组" />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                        <span className="text-xs text-muted-foreground">
                          ({group.monitor_count} 个监控)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Monitors Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>选择监控项</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-auto py-1 px-2"
              >
                {selectedMonitors.size === monitors.length ? '取消全选' : '全选'}
              </Button>
            </div>
            
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-2">
                {monitors.map((monitor) => (
                  <div
                    key={monitor.id}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => handleToggleMonitor(monitor.id)}
                  >
                    <Checkbox
                      checked={selectedMonitors.has(monitor.id)}
                      onCheckedChange={() => handleToggleMonitor(monitor.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{monitor.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{monitor.url}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <p className="text-xs text-muted-foreground">
              已选择 {selectedMonitors.size} / {monitors.length} 个监控项
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button 
            type="submit" 
            disabled={loading || !selectedGroupId || selectedMonitors.size === 0}
            onClick={handleSubmit}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <ArrowRight className="h-4 w-4 mr-2" />
            移动到分组
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

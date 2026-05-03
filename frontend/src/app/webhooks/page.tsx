"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Edit,
  Trash2,
  Send,
  Star,
  Webhook,
  AlertTriangle,
  MoreHorizontal,
  CheckCircle,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { webhooksApi } from "@/lib/api";
import { Webhook as WebhookType } from "@/types";

function WebhookCard({
  webhook,
  onTest,
  onDelete,
}: {
  webhook: WebhookType;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="group hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Webhook className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{webhook.name}</h3>
                {webhook.is_default && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    默认
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate max-w-md">
                {webhook.webhook_url}
              </p>
              {webhook.at_users && (
                <p className="text-xs text-muted-foreground mt-1">
                  @成员: {webhook.at_users}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTest(webhook.id)}>
                <Send className="h-4 w-4 mr-2" />
                发送测试
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/webhooks/${webhook.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(webhook.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WebhooksPage() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await webhooksApi.list();
      setWebhooks(response.items);
    } catch (error) {
      toast({
        title: "获取 Webhook 列表失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleTest = async (id: string) => {
    try {
      await webhooksApi.test(id);
      toast({
        title: "测试消息已发送",
        description: "请检查您的 Webhook 渠道",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "测试失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await webhooksApi.delete(deleteId);
      toast({ title: "Webhook 已删除", variant: "success" });
      setDeleteId(null);
      fetchWebhooks();
    } catch {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Webhook 配置</h1>
            <p className="text-muted-foreground mt-1">
              管理告警通知的 Webhook 渠道
            </p>
          </div>
          <Button asChild>
            <Link href="/webhooks/new">
              <Plus className="h-4 w-4 mr-2" />
              新建 Webhook
            </Link>
          </Button>
        </div>

        {/* Webhooks Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : webhooks.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无 Webhook 配置</h3>
              <p className="text-muted-foreground mb-4">
                创建 Webhook 以接收告警通知
              </p>
              <Button asChild>
                <Link href="/webhooks/new">
                  <Plus className="h-4 w-4 mr-2" />
                  创建 Webhook
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {webhooks.map((webhook) => (
              <WebhookCard
                key={webhook.id}
                webhook={webhook}
                onTest={handleTest}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将永久删除该 Webhook 配置，无法恢复。
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

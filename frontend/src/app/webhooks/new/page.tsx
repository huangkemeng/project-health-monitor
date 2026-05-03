"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Webhook, Bell, Settings } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-handler";
import { webhooksApi } from "@/lib/api";

export default function NewWebhookPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    webhook_url: "",
    at_users: "",
    is_default: false,
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate webhook URL
    if (!formData.webhook_url.startsWith("https://qyapi.weixin.qq.com/cgi-bin/webhook/send")) {
      setError("Webhook URL 必须是企业微信机器人地址");
      setLoading(false);
      return;
    }

    try {
      await webhooksApi.create(formData);
      toast({ title: "Webhook 创建成功", variant: "success" });
      router.push("/webhooks");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/webhooks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">新建 Webhook</h1>
            <p className="text-muted-foreground text-sm">创建企业微信机器人 Webhook 用于接收告警通知</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                基本信息
              </CardTitle>
              <CardDescription>配置 Webhook 的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  required
                  maxLength={50}
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="例如：后端告警群"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_url">
                  Webhook URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="webhook_url"
                  type="url"
                  required
                  value={formData.webhook_url}
                  onChange={(e) => updateField("webhook_url", e.target.value)}
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                />
                <p className="text-xs text-muted-foreground">
                  企业微信机器人 Webhook 地址，从企业微信群机器人设置中获取
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知设置
              </CardTitle>
              <CardDescription>配置告警通知的相关设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="at_users">@成员UserID</Label>
                <Input
                  id="at_users"
                  value={formData.at_users}
                  onChange={(e) => updateField("at_users", e.target.value)}
                  placeholder="zhangsan,lisi,wangwu"
                />
                <p className="text-xs text-muted-foreground">
                  多个UserID用逗号分隔，告警时会@这些成员。UserID是企业微信成员的唯一标识
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                高级设置
              </CardTitle>
              <CardDescription>配置 Webhook 的高级选项</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_default" className="text-base">
                    设为默认 Webhook
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    设置为默认后，新创建的监控项将自动使用此 Webhook 接收告警
                  </p>
                </div>
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => updateField("is_default", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/webhooks">取消</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "创建中..." : "创建"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}

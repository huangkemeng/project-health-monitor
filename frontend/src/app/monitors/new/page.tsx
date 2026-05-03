"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Plus, Globe, Clock, Bell, Settings } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { monitorsApi, webhooksApi } from "@/lib/api";
import { Webhook, HttpMethod } from "@/types";

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

export default function NewMonitorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const [formData, setFormData] = useState({
    name: "",
    url: "",
    method: "GET" as HttpMethod,
    headers: "{}",
    body: "",
    interval: 60,
    timeout: 10,
    expected_status: 200,
    retry_times: 3,
    warning_threshold: 3000,
    critical_threshold: 5000,
    webhook_id: "",
  });

  useEffect(() => {
    const fetchWebhooks = async () => {
      try {
        const response = await webhooksApi.list();
        setWebhooks(response.items);
        const defaultWebhook = response.items.find((w) => w.is_default);
        if (defaultWebhook) {
          setFormData((prev) => ({ ...prev, webhook_id: defaultWebhook.id }));
        }
      } catch (error) {
        console.error("Failed to fetch webhooks:", error);
      }
    };
    fetchWebhooks();
  }, []);

  const isSafeUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Simple URL format validation only - actual reachability is tested by backend
  const validateUrlFormat = (): { success: boolean; message: string } => {
    if (!isSafeUrl(formData.url)) {
      return { success: false, message: "URL 格式不正确，仅支持 http:// 或 https:// 协议" };
    }
    return { success: true, message: "URL 格式正确" };
  };

  const safeJsonParse = (json: string, defaultValue: Record<string, string>): Record<string, string> => {
    try {
      return JSON.parse(json) as Record<string, string>;
    } catch {
      return defaultValue;
    }
  };

  const submitForm = async () => {
    setLoading(true);
    setError(null);

    try {
      let headers = {};
      try {
        headers = JSON.parse(formData.headers);
      } catch {
        setError("Headers 必须是有效的 JSON 格式");
        setLoading(false);
        return;
      }

      await monitorsApi.create({
        name: formData.name,
        url: formData.url,
        method: formData.method,
        headers,
        body: formData.body || undefined,
        interval: formData.interval,
        timeout: formData.timeout,
        expected_status: formData.expected_status,
        retry_times: formData.retry_times,
        warning_threshold: formData.warning_threshold,
        critical_threshold: formData.critical_threshold,
        webhook_id: formData.webhook_id || undefined,
      });

      toast({ title: "监控项创建成功", variant: "success" });
      router.push("/monitors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only validate URL format, actual reachability is tested by backend
    const validationResult = validateUrlFormat();
    if (!validationResult.success) {
      setError(validationResult.message);
      return;
    }

    await submitForm();
  };

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/monitors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">新建监控项</h1>
            <p className="text-muted-foreground text-sm">创建一个新的 URL 监控任务</p>
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
                <Globe className="h-5 w-5" />
                基本信息
              </CardTitle>
              <CardDescription>配置监控目标的基本信息</CardDescription>
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
                  placeholder="例如：用户服务 API"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">
                  URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="url"
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => updateField("url", e.target.value)}
                  placeholder="https://api.example.com/health"
                />
                <p className="text-xs text-muted-foreground">后端将自动检测 URL 是否可达</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="method">HTTP 方法</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(value) => updateField("method", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected_status">期望状态码</Label>
                  <Input
                    id="expected_status"
                    type="number"
                    min={100}
                    max={599}
                    value={formData.expected_status}
                    onChange={(e) => updateField("expected_status", parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                请求设置
              </CardTitle>
              <CardDescription>配置 HTTP 请求的详细信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headers">请求头 (JSON 格式)</Label>
                <Textarea
                  id="headers"
                  className="font-mono text-sm"
                  rows={3}
                  value={formData.headers}
                  onChange={(e) => updateField("headers", e.target.value)}
                  placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                />
              </div>

              {formData.method !== "GET" && formData.method !== "HEAD" && (
                <div className="space-y-2">
                  <Label htmlFor="body">请求体</Label>
                  <Textarea
                    id="body"
                    className="font-mono text-sm"
                    rows={4}
                    value={formData.body}
                    onChange={(e) => updateField("body", e.target.value)}
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monitoring Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                监控设置
              </CardTitle>
              <CardDescription>配置监控的频率和阈值</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interval">探测间隔 (秒)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min={30}
                    max={3600}
                    value={formData.interval}
                    onChange={(e) => updateField("interval", parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout">超时时间 (秒)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={1}
                    max={60}
                    value={formData.timeout}
                    onChange={(e) => updateField("timeout", parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retry_times">连续失败次数 (触发告警)</Label>
                  <Input
                    id="retry_times"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.retry_times}
                    onChange={(e) => updateField("retry_times", parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook_id">告警 Webhook</Label>
                  <Select
                    value={formData.webhook_id || "none"}
                    onValueChange={(value) => updateField("webhook_id", value === "none" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="不发送告警" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不发送告警</SelectItem>
                      {webhooks.map((webhook) => (
                        <SelectItem key={webhook.id} value={webhook.id}>
                          {webhook.name} {webhook.is_default && "(默认)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                告警阈值
              </CardTitle>
              <CardDescription>设置响应时间告警阈值</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="warning_threshold">警告阈值 (ms)</Label>
                  <Input
                    id="warning_threshold"
                    type="number"
                    min={100}
                    max={60000}
                    value={formData.warning_threshold}
                    onChange={(e) => updateField("warning_threshold", parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="critical_threshold">严重阈值 (ms)</Label>
                  <Input
                    id="critical_threshold"
                    type="number"
                    min={100}
                    max={60000}
                    value={formData.critical_threshold}
                    onChange={(e) => updateField("critical_threshold", parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/monitors">取消</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>创建中...</>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  创建监控项
                </>
              )}
            </Button>
          </div>
        </form>

      </div>
    </MainLayout>
  );
}

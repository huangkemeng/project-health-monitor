'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MainLayout } from '@/components/layout/MainLayout';
import { monitorsApi, webhooksApi } from '@/lib/api';
import { Monitor, Webhook, HttpMethod } from '@/types';
import { ArrowLeft, Loader2, Save, Globe, Settings, Clock, Bell, Webhook as WebhookIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const editMonitorSchema = z.object({
  name: z.string().min(1, '请输入监控名称').max(50, '名称最多50个字符'),
  url: z.string().min(1, '请输入URL').url('请输入有效的URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']),
  headers: z.string().optional(),
  body: z.string().optional(),
  interval: z.number().min(30).max(3600),
  timeout: z.number().min(1).max(60),
  expected_status: z.number().min(100).max(599),
  retry_times: z.number().min(1).max(10),
  warning_threshold: z.number().min(100).max(60000),
  webhook_id: z.string().optional(),
});

type EditMonitorForm = z.infer<typeof editMonitorSchema>;

export default function EditMonitorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditMonitorForm>({
    resolver: zodResolver(editMonitorSchema),
    defaultValues: {
      method: 'GET',
      interval: 60,
      timeout: 10,
      expected_status: 200,
      retry_times: 5,
      warning_threshold: 3000,
    },
  });

  const method = watch('method');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [monitorData, webhooksData] = await Promise.all([
          monitorsApi.get(params.id),
          webhooksApi.list(),
        ]);
        setMonitor(monitorData);
        setWebhooks(webhooksData.items);
        
        // Set form values
        setValue('name', monitorData.name);
        setValue('url', monitorData.url);
        setValue('method', monitorData.method);
        setValue('headers', JSON.stringify(monitorData.headers || {}, null, 2));
        setValue('body', monitorData.body || '');
        setValue('interval', monitorData.interval);
        setValue('timeout', monitorData.timeout);
        setValue('expected_status', monitorData.expected_status);
        setValue('retry_times', monitorData.retry_times);
        setValue('warning_threshold', monitorData.warning_threshold);
        setValue('webhook_id', monitorData.webhook_id || '');
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({
          title: '获取数据失败',
          description: '无法加载监控项数据',
          variant: 'destructive',
        });
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [params.id, setValue, toast]);

  const onSubmit = async (data: EditMonitorForm) => {
    setLoading(true);

    try {
      let headers = {};
      try {
        if (data.headers) {
          headers = JSON.parse(data.headers);
        }
      } catch {
        toast({
          title: '格式错误',
          description: 'Headers 必须是有效的 JSON 格式',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      await monitorsApi.update(params.id, {
        name: data.name,
        url: data.url,
        method: data.method,
        headers,
        body: data.body || undefined,
        interval: data.interval,
        timeout: data.timeout,
        expected_status: data.expected_status,
        retry_times: data.retry_times,
        warning_threshold: data.warning_threshold,
        webhook_id: data.webhook_id || undefined,
      });

      toast({
        title: '保存成功',
        description: '监控项已更新',
        variant: 'success',
      });
      router.push(`/monitors/${params.id}`);
    } catch (err) {
      toast({
        title: '保存失败',
        description: err instanceof Error ? err.message : '更新失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!monitor) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">监控项不存在</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/monitors/${params.id}`} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回详情
            </Link>
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                基本信息
              </CardTitle>
              <CardDescription>配置监控项的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="例如：API健康检查"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">
                  URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="url"
                  type="url"
                  {...register('url')}
                  placeholder="https://api.example.com/health"
                  className={errors.url ? 'border-destructive' : ''}
                />
                {errors.url && (
                  <p className="text-sm text-destructive">{errors.url.message}</p>
                )}
                <p className="text-xs text-muted-foreground">后端将自动检测 URL 是否可达</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="method">HTTP 方法</Label>
                  <Select
                    value={method}
                    onValueChange={(value) => setValue('method', value as HttpMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
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
                    {...register('expected_status', { valueAsNumber: true })}
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
                  {...register('headers')}
                  placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                />
              </div>

              {method !== 'GET' && method !== 'HEAD' && (
                <div className="space-y-2">
                  <Label htmlFor="body">请求体</Label>
                  <Textarea
                    id="body"
                    className="font-mono text-sm"
                    rows={4}
                    {...register('body')}
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
                    {...register('interval', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout">超时时间 (秒)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={1}
                    max={60}
                    {...register('timeout', { valueAsNumber: true })}
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
                    {...register('retry_times', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook_id">告警 Webhook</Label>
                  <Select
                    value={watch('webhook_id') || 'none'}
                    onValueChange={(value) => setValue('webhook_id', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="不发送告警" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不发送告警</SelectItem>
                      {webhooks.map((webhook) => (
                        <SelectItem key={webhook.id} value={webhook.id}>
                          {webhook.name} {webhook.is_default && '(默认)'}
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
              <div className="space-y-2">
                <Label htmlFor="warning_threshold">响应时间警告阈值 (ms)</Label>
                <Input
                  id="warning_threshold"
                  type="number"
                  min={100}
                  max={60000}
                  {...register('warning_threshold', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  当响应时间超过此阈值时将触发警告
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href={`/monitors/${params.id}`}>取消</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}

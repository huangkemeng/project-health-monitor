"use client";

import { useState } from "react";
import { User, Lock, Mail, Calendar, Save, Shield, Palette, Monitor, Layout } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-handler";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { themeStyle, setThemeStyle } = useTheme();
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: "error", text: "两次输入的新密码不一致" });
      setLoading(false);
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage({ type: "error", text: "新密码长度至少为8位" });
      setLoading(false);
      return;
    }

    try {
      await authApi.changePassword(passwordData);
      toast({ title: "密码修改成功", variant: "success" });
      setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">个人设置</h1>
          <p className="text-muted-foreground mt-1">管理您的账户信息和安全设置</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              个人信息
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-2">
              <Lock className="h-4 w-4" />
              修改密码
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              外观
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  个人信息
                </CardTitle>
                <CardDescription>查看您的账户基本信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {user?.username ? getInitials(user.username) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{user?.username}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <Separator />

                {/* Info Fields */}
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      用户名
                    </Label>
                    <Input
                      id="username"
                      disabled
                      value={user?.username || ""}
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      邮箱
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      disabled
                      value={user?.email || ""}
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="created_at" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      注册时间
                    </Label>
                    <Input
                      id="created_at"
                      disabled
                      value={user?.created_at ? formatDateTime(user.created_at) : ""}
                      className="bg-muted"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  修改密码
                </CardTitle>
                <CardDescription>更新您的账户密码以确保安全</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {message && (
                    <Alert variant={message.type === "error" ? "destructive" : "default"}>
                      <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="old_password">原密码</Label>
                    <Input
                      id="old_password"
                      type="password"
                      required
                      value={passwordData.old_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, old_password: e.target.value })
                      }
                      placeholder="请输入当前密码"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password">新密码</Label>
                    <Input
                      id="new_password"
                      type="password"
                      required
                      value={passwordData.new_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, new_password: e.target.value })
                      }
                      placeholder="8-32字符，包含字母和数字"
                    />
                    <p className="text-xs text-muted-foreground">
                      密码长度至少8位，建议包含大小写字母和数字
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">确认新密码</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      required
                      value={passwordData.confirm_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirm_password: e.target.value })
                      }
                      placeholder="再次输入新密码"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        "保存中..."
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          修改密码
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  外观设置
                </CardTitle>
                <CardDescription>自定义界面主题风格</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>主题风格</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Classic Theme Option */}
                    <button
                      onClick={() => setThemeStyle('classic')}
                      className={cn(
                        "relative flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                        themeStyle === 'classic'
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                          <Layout className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">经典圆润</div>
                          <div className="text-xs text-muted-foreground">柔和圆角，传统风格</div>
                        </div>
                      </div>
                      <div className="w-full h-16 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border flex items-center justify-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20" />
                        <div className="w-16 h-6 rounded-full bg-secondary" />
                        <div className="w-6 h-6 rounded-md bg-accent" />
                      </div>
                      {themeStyle === 'classic' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Linear Theme Option */}
                    <button
                      onClick={() => setThemeStyle('linear')}
                      className={cn(
                        "relative flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                        themeStyle === 'linear'
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-gray-500/20 to-slate-500/20">
                          <Monitor className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">线条现代</div>
                          <div className="text-xs text-muted-foreground">简洁线条，现代风格</div>
                        </div>
                      </div>
                      <div className="w-full h-16 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 border flex items-center justify-center gap-2">
                        <div className="w-8 h-8 rounded-sm bg-primary/20" />
                        <div className="w-16 h-6 rounded-sm bg-secondary" />
                        <div className="w-6 h-6 rounded-sm bg-accent" />
                      </div>
                      {themeStyle === 'linear' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Palette className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">主题预览</p>
                      <p className="text-xs text-muted-foreground">
                        当前使用的是 <span className="font-medium text-foreground">{themeStyle === 'classic' ? '经典圆润' : '线条现代'}</span> 风格。
                        更改会立即生效并保存在本地。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

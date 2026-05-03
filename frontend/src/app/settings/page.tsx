"use client";

import { useState } from "react";
import { User, Lock, Mail, Calendar, Save, Shield } from "lucide-react";
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

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
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
      const errorMsg = err instanceof Error ? err.message : "密码修改失败";
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
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              个人信息
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-2">
              <Lock className="h-4 w-4" />
              修改密码
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
        </Tabs>
      </div>
    </MainLayout>
  );
}

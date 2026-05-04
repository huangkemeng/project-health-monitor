'use client';

import { AlertCircle, Eye, UserCog, Shield } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CollaboratorRole } from '@/types';

interface PermissionAlertProps {
  role: CollaboratorRole | 'owner';
  isSharedProject?: boolean;
  ownerName?: string;
}

export function PermissionAlert({ role, isSharedProject, ownerName }: PermissionAlertProps) {
  if (!isSharedProject) {
    return (
      <Alert className="mb-4">
        <Shield className="h-4 w-4" />
        <AlertTitle>所有者权限</AlertTitle>
        <AlertDescription>
          您当前正在管理自己的项目，拥有所有操作权限。
        </AlertDescription>
      </Alert>
    );
  }

  const getRoleInfo = () => {
    switch (role) {
      case 'editor':
        return {
          icon: <UserCog className="h-4 w-4" />,
          title: '编辑者权限',
          description: `您正在协作管理 ${ownerName} 的项目。您可以查看、创建和修改监控项。`,
          badge: <Badge className="bg-blue-500">编辑者</Badge>,
        };
      case 'viewer':
        return {
          icon: <Eye className="h-4 w-4" />,
          title: '查看者权限',
          description: `您正在查看 ${ownerName} 的项目。您只能查看监控状态，无法进行修改操作。`,
          badge: <Badge variant="secondary">查看者</Badge>,
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          title: '受限访问',
          description: '您的访问权限受限，请联系项目所有者。',
          badge: <Badge variant="outline">受限</Badge>,
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <Alert className="mb-4" variant={role === 'viewer' ? 'default' : 'default'}>
      {roleInfo.icon}
      <div className="flex items-center gap-2">
        <AlertTitle>{roleInfo.title}</AlertTitle>
        {roleInfo.badge}
      </div>
      <AlertDescription className="mt-1">
        {roleInfo.description}
      </AlertDescription>
    </Alert>
  );
}

interface PermissionGuardProps {
  role: CollaboratorRole | 'owner';
  requiredRole: 'editor' | 'owner';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  role,
  requiredRole,
  children,
  fallback,
}: PermissionGuardProps) {
  const hasPermission = () => {
    if (role === 'owner') return true;
    if (requiredRole === 'owner') return false;
    if (requiredRole === 'editor' && role === 'editor') return true;
    return false;
  };

  if (hasPermission()) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
}

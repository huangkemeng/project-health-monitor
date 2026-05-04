'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { CollaborationManager } from '@/components/collaboration/CollaborationManager';
import { SharedProjectList } from '@/components/collaboration/SharedProjectList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Users, FolderOpen } from 'lucide-react';

export default function CollaborationPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('collaborators');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">项目协作</h1>
          <p className="text-muted-foreground mt-1">
            管理协作者和查看共享项目
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="collaborators" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              我的协作者
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              共享给我的
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collaborators" className="space-y-6">
            <CollaborationManager />
          </TabsContent>

          <TabsContent value="shared" className="space-y-6">
            <SharedProjectList />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

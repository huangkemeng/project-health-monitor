'use client';

import { useState, useEffect, useCallback } from 'react';
import { collaborationApi } from '@/lib/api';
import { ProjectContext } from '@/types';

export function useProject() {
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 用于强制重新获取的计数器
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      // 从 localStorage 获取当前项目 owner_id
      const ownerId = localStorage.getItem('project_context_owner_id');
      console.log('useProject - ownerId from localStorage:', ownerId);
      const response = await collaborationApi.getCurrentProject(ownerId || undefined);
      console.log('useProject - API response:', response);
      setProject(response.project);
      setError(null);
    } catch (err: any) {
      console.error('useProject - Error:', err);
      setError(err.message || '获取项目信息失败');
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // 监听 localStorage 变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'project_context_owner_id') {
        console.log('useProject - localStorage changed:', e.newValue);
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 检查是否有编辑权限
  const canEdit = project?.role === 'owner' || project?.role === 'editor';
  
  // 检查是否有管理权限
  const canManage = project?.role === 'owner';

  return {
    project,
    loading,
    error,
    canEdit,
    canManage,
    isOwner: project?.is_own_project ?? true,
    refresh: fetchProject,
  };
}

"use client";

import { useRouter } from "next/navigation";
import { Bell, Info, MessageCircle, UserCheck, RefreshCw, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedbackNotification } from "@/types";

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 2) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

const typeIcons: Record<string, React.ReactNode> = {
  status_change: <Info className="h-4 w-4 text-blue-500" />,
  reply: <MessageCircle className="h-4 w-4 text-gray-500" />,
  admin_reply: <UserCheck className="h-4 w-4 text-green-500" />,
  system: <Bell className="h-4 w-4 text-orange-500" />,
};

interface FeedbackNotificationListProps {
  notifications: FeedbackNotification[];
  loading: boolean;
  unreadCount: number;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}

export function FeedbackNotificationList({
  notifications,
  loading,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  onClose,
}: FeedbackNotificationListProps) {
  const router = useRouter();

  const handleNotificationClick = async (notification: FeedbackNotification) => {
    if (!notification.is_read) {
      await onMarkAsRead(notification.id);
    }
    router.push(`/feedback/${notification.feedback_id}`);
    onClose();
  };

  return (
    <div className="w-80">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-medium text-sm">通知</h3>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onMarkAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              全部已读
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-80">
        {loading && notifications.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2" />
            <p className="text-sm">暂无通知</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-accent transition-colors ${
                  !notification.is_read ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="mt-0.5 shrink-0">
                  {typeIcons[notification.type] || <Bell className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{notification.title}</p>
                  {notification.content && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {notification.content}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(notification.created_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

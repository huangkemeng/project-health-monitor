"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, Menu, User, LogOut, Settings, History, Webhook, Users, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { FeedbackNotificationBadge } from "@/components/feedback/notification/FeedbackNotificationBadge";
import { FeedbackNotificationList } from "@/components/feedback/notification/FeedbackNotificationList";
import { useFeedbackNotifications } from "@/hooks/useFeedbackNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HeaderProps {
  onMenuClick?: () => void;
}

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: Activity },
  { href: "/monitors", label: "监控项", icon: Bell },
  { href: "/history", label: "历史记录", icon: History },
  { href: "/webhooks", label: "Webhook", icon: Webhook },
];

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const {
    unreadCount,
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useFeedbackNotifications();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="mr-3 md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        <Link href="/dashboard" className="mr-8 flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="hidden font-bold text-lg sm:inline-block">
            Health Monitor
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-1">
          <Popover open={notificationOpen} onOpenChange={(open) => { setNotificationOpen(open); if (open) fetchNotifications(); }}>
            <PopoverTrigger asChild>
              <FeedbackNotificationBadge unreadCount={unreadCount} onClick={() => setNotificationOpen(true)} />
            </PopoverTrigger>
            <PopoverContent className="p-0 w-80" align="end" sideOffset={8}>
              <FeedbackNotificationList
                notifications={notifications}
                loading={loading}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onRefresh={refresh}
                onClose={() => setNotificationOpen(false)}
              />
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.username?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/collaboration" className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  项目协作
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setFeedbackOpen(true); }}>
                <MessageCircle className="mr-2 h-4 w-4" />
                问题反馈
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  设置
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </header>
  );
}

"use client";

import { forwardRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedbackNotificationBadgeProps {
  unreadCount: number;
  onClick: () => void;
}

export const FeedbackNotificationBadge = forwardRef<HTMLButtonElement, FeedbackNotificationBadgeProps>(
  function FeedbackNotificationBadge({ unreadCount, onClick }, ref) {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className="relative"
        onClick={onClick}
        aria-label={`通知${unreadCount > 0 ? `，${unreadCount}条未读` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    );
  }
);

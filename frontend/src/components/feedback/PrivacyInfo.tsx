"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SystemInfo {
  page_url: string;
  browser_info: string;
  browser_language: string;
  screen_resolution: string;
  operating_system: string;
}

interface PrivacyInfoProps {
  onInfoChange?: (info: SystemInfo) => void;
}

function detectOS(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iOS")) return "iOS";
  return "Unknown";
}

export function PrivacyInfo({ onInfoChange }: PrivacyInfoProps) {
  const [expanded, setExpanded] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    page_url: "",
    browser_info: "",
    browser_language: "",
    screen_resolution: "",
    operating_system: "",
  });
  const onInfoChangeRef = useRef(onInfoChange);
  onInfoChangeRef.current = onInfoChange;

  useEffect(() => {
    const info: SystemInfo = {
      page_url: window.location.href,
      browser_info: navigator.userAgent,
      browser_language: navigator.language,
      screen_resolution: `${screen.width} × ${screen.height}`,
      operating_system: detectOS(navigator.userAgent),
    };
    setSystemInfo(info);
    onInfoChangeRef.current?.(info);
  }, []);

  return (
    <div className="rounded-lg border bg-muted/50">
      <Button
        type="button"
        variant="ghost"
        className="w-full flex items-center justify-between px-3 py-2 h-auto text-sm text-muted-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          系统已自动捕获以下信息
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
      {expanded && (
        <div className="px-3 pb-3 text-xs text-muted-foreground space-y-1">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <span className="font-medium">页面URL：</span>
            <span className="truncate">{systemInfo.page_url}</span>
            <span className="font-medium">浏览器：</span>
            <span className="truncate">{systemInfo.browser_info}</span>
            <span className="font-medium">浏览器语言：</span>
            <span>{systemInfo.browser_language}</span>
            <span className="font-medium">屏幕分辨率：</span>
            <span>{systemInfo.screen_resolution}</span>
            <span className="font-medium">操作系统：</span>
            <span>{systemInfo.operating_system}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            以上信息仅用于问题定位，不会用于其他用途
          </p>
        </div>
      )}
    </div>
  );
}

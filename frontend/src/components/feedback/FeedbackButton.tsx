"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "./FeedbackDialog";
import { usePathname } from "next/navigation";

const EXCLUDED_PATHS = ["/login", "/register"];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (EXCLUDED_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        size="icon"
        aria-label="问题反馈"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

"use client";

import { useToastContext, ToastProps } from "@/components/ui/toast";
import {
  ToastItem,
  ToastClose,
  ToastDescription,
  ToastTitle,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToastContext();

  return (
    <>
      {toasts.map((toast: ToastProps) => {
        const { id, title, description, variant } = toast;
        return (
          <ToastItem key={id} variant={variant}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            <ToastClose />
          </ToastItem>
        );
      })}
    </>
  );
}

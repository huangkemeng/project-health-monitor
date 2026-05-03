import { useToastContext, type ToastProps } from "@/components/ui/toast"

export function useToast() {
  const { addToast } = useToastContext()

  const toast = (props: Omit<ToastProps, "id">) => {
    addToast(props)
  }

  return { toast }
}

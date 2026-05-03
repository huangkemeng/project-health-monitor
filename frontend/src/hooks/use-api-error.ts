import { useToast } from "./use-toast";
import { getErrorTitle, getErrorDescription, getErrorVariant, isAuthError } from "@/lib/error-handler";
import { useRouter } from "next/navigation";

export function useApiError() {
  const { toast } = useToast();
  const router = useRouter();

  const handleError = (error: unknown, customTitle?: string) => {
    // Check if it's an auth error
    if (isAuthError(error)) {
      toast({
        title: "登录已过期",
        description: "您的登录已过期，请重新登录",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    // Show error toast with appropriate styling
    toast({
      title: customTitle || getErrorTitle(error),
      description: getErrorDescription(error),
      variant: getErrorVariant(error),
    });
  };

  const handleSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "success",
    });
  };

  return { handleError, handleSuccess };
}

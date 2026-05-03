import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/toast";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Health Monitor - 项目健康监控平台",
  description: "简单、可靠、实时的项目健康监控平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <ToastProvider>
          <AuthProvider>
            {children}
            <GlobalErrorHandler />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

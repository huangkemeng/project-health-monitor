"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect, useState } from "react";

export interface AdminFilterValues {
  status: string;
  type: string;
  keyword: string;
}

interface FeedbackAdminFilterProps {
  values: AdminFilterValues;
  onChange: (values: AdminFilterValues) => void;
}

export function FeedbackAdminFilter({ values, onChange }: FeedbackAdminFilterProps) {
  const [keyword, setKeyword] = useState(values.keyword);
  const debouncedKeyword = useDebounce(keyword, 300);

  useEffect(() => {
    if (debouncedKeyword !== values.keyword) {
      onChange({ ...values, keyword: debouncedKeyword });
    }
  }, [debouncedKeyword]);

  const handleReset = () => {
    setKeyword("");
    onChange({ status: "all", type: "all", keyword: "" });
  };

  const hasFilters = values.status !== "all" || values.type !== "all" || values.keyword !== "";

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select
        value={values.status}
        onValueChange={(v) => onChange({ ...values, status: v })}
      >
        <SelectTrigger className="w-full sm:w-32">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          <SelectItem value="pending">待处理</SelectItem>
          <SelectItem value="processing">处理中</SelectItem>
          <SelectItem value="fixed">已修复</SelectItem>
          <SelectItem value="closed">已关闭</SelectItem>
          <SelectItem value="duplicate">重复反馈</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={values.type}
        onValueChange={(v) => onChange({ ...values, type: v })}
      >
        <SelectTrigger className="w-full sm:w-32">
          <SelectValue placeholder="全部类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部类型</SelectItem>
          <SelectItem value="bug">Bug</SelectItem>
          <SelectItem value="feature_request">功能建议</SelectItem>
          <SelectItem value="other">其他</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索标题或编号..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="pl-8"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={handleReset} title="重置筛选">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

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
import type { FeedbackStatus, FeedbackType } from "@/types";

export interface FilterValues {
  status: string;
  type: string;
  keyword: string;
}

const statusOptions = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待处理" },
  { value: "processing", label: "处理中" },
  { value: "fixed", label: "已修复" },
  { value: "closed", label: "已关闭" },
  { value: "duplicate", label: "重复反馈" },
];

const typeOptions = [
  { value: "all", label: "全部类型" },
  { value: "bug", label: "Bug" },
  { value: "feature_request", label: "功能建议" },
  { value: "other", label: "其他" },
];

interface FeedbackFilterProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}

export function FeedbackFilter({ values, onChange }: FeedbackFilterProps) {
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
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
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
          {typeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
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

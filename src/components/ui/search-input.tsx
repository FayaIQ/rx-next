import type { KeyboardEventHandler } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "بحث...",
  className,
  onKeyDown,
}: Props) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-rx-muted"
        strokeWidth={2}
      />
      <Input
        className="pr-10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

import { Input } from "@/core/ui/input";
import { Search, X } from "lucide-react";

/** The search field the kabinet list pages share, as the App Store draws it. */
export const ListSearch = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => (
  <div className="relative">
    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 rounded-full pl-10 pr-10 text-sm"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label="Clear search"
      >
        <X className="size-4" />
      </button>
    )}
  </div>
);

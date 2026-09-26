import { cn } from "@/core/util/utils";
import { Store } from "lucide-react";
import { useState } from "react";

/** A merchant's logo, or a store glyph when it has none (or it fails to load). */
export const MerchantLogo = ({
  merchant,
  className,
}: {
  merchant: { name: string; logoUrl?: string | null };
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted", className)}>
      {merchant.logoUrl && !failed ? (
        <img src={merchant.logoUrl} alt="" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      ) : (
        <Store className="h-1/2 w-1/2 text-muted-foreground" aria-label={merchant.name} />
      )}
    </span>
  );
};

import { toast } from "@/core/notify";
import { copyText } from "@/core/tabs/sharing/universalLink";
import { Button, type ButtonProps } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const FLASH_MS = 1500;

/**
 * Put text on the clipboard and say so where it was asked for: `copied` is
 * true for a moment afterwards, for the button to show a check. No toast on
 * success — the button is the confirmation. Only a failure toasts, since the
 * button cannot show that.
 */
export const useCopyToClipboard = () => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string) => {
    const ok = await copyText(text);
    if (!ok) {
      toast.error("Could not copy to the clipboard");
      return false;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), FLASH_MS);
    return true;
  }, []);

  return { copy, copied };
};

/**
 * An icon button that copies `value`; the icon flips to a check for a moment.
 * With children, they are the label and the icon sits before them.
 */
export const CopyButton = ({
  value,
  title = "Copy",
  className,
  children,
  variant = "ghost",
  size,
  ...props
}: Omit<ButtonProps, "value" | "onClick"> & { value: string | (() => string | Promise<string>); title?: string }) => {
  const { copy, copied } = useCopyToClipboard();
  const Icon = copied ? Check : Copy;
  return (
    <Button
      type="button"
      variant={variant}
      size={size ?? (children ? "sm" : "icon")}
      className={cn(!children && "size-6 shrink-0 text-muted-foreground", className)}
      title={copied ? "Copied" : title}
      aria-label={title}
      onClick={async () => void copy(typeof value === "function" ? await value() : value)}
      {...props}
    >
      <Icon className="size-3.5" />
      {children}
    </Button>
  );
};

import { copyText } from "@/core/tabs/sharing/universalLink";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import type { LucideIcon } from "lucide-react";
import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";

export type StatusTone = "neutral" | "warning" | "destructive";

export type StatusDetail = {
  label: string;
  value: ReactNode;
  /** Render the value in a monospace font (ids, paths, error messages). */
  mono?: boolean;
};

export type StatusPageProps = {
  /** The big numeral behind the content and the "Error 403" eyebrow. */
  code?: string | number;
  /** The small label above the title; defaults to `Error {code}`. */
  eyebrow?: ReactNode;
  icon: LucideIcon;
  /** Spin the icon: something is still being tried. */
  spin?: boolean;
  title: ReactNode;
  description?: ReactNode;
  tone?: StatusTone;
  /** Short "what you can try" bullets. */
  hints?: ReactNode[];
  /** Buttons under the description. */
  actions?: ReactNode;
  /** Key/value facts about the failure (path, id, account, …). */
  details?: StatusDetail[];
  /** Raw technical payload (stack, GraphQL errors), in a collapsible block. */
  technical?: string | null;
  /** Something of the page's own between the description and the actions. */
  children?: ReactNode;
  /** Still working on it: announced as busy. */
  busy?: boolean;
  /**
   * `embedded` fills the pane it is in (a tab, one half of a split). `page`
   * fills the window, for the boundary outside the shell. `compact` is a slim
   * inline card for a part of a page.
   */
  variant?: "embedded" | "page" | "compact";
  className?: string;
};

const toneStyles: Record<StatusTone, { tile: string; watermark: string }> = {
  neutral: {
    tile: "bg-primary/10 text-primary",
    watermark: "text-primary/[0.06] dark:text-primary/10",
  },
  warning: {
    tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    watermark: "text-amber-500/[0.07] dark:text-amber-400/10",
  },
  destructive: {
    tile: "bg-destructive/10 text-destructive",
    watermark: "text-destructive/[0.06] dark:text-destructive/10",
  },
};

const detailText = (value: ReactNode): string => {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "[element]";
};

/** What "Copy details" puts on the clipboard: the page, as text. */
export const statusCopyText = ({
  title,
  details,
  technical,
}: Pick<StatusPageProps, "title" | "details" | "technical">): string =>
  [
    typeof title === "string" ? title : undefined,
    ...(details ?? []).map((detail) => `${detail.label}: ${detailText(detail.value)}`),
    `Time: ${new Date().toISOString()}`,
    technical ? `\n${technical}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

const CopyDetailsButton = ({ text }: { text: () => string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={async () => {
        if (!(await copyText(text()))) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy details"}
    </Button>
  );
};

/**
 * The one look of every "you are not seeing the page" screen: not found, not
 * permitted, access denied, service unreachable, crashed.
 *
 * It knows no router, no store and no service, so it renders anywhere,
 * including the boundary outside the shell; the pages next to it gather the
 * context (who is signed in, which path, which service) and hand it in.
 */
export const StatusPage = ({
  code,
  eyebrow,
  icon: Icon,
  spin,
  title,
  description,
  tone = "neutral",
  hints,
  actions,
  details,
  technical,
  children,
  busy,
  variant = "embedded",
  className,
}: StatusPageProps) => {
  const styles = toneStyles[tone];
  const hasDetails = !!details && details.length > 0;

  if (variant === "compact") {
    return (
      <div
        role="alert"
        className={cn("flex w-full items-start gap-3 rounded-lg border bg-card/60 p-4 text-sm", className)}
      >
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", styles.tile)}>
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-medium leading-tight">{title}</div>
          {description ? <div className="text-muted-foreground">{description}</div> : null}
          {hasDetails ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              {details.map((detail) => (
                <div key={detail.label} className="contents">
                  <dt className="text-muted-foreground">{detail.label}</dt>
                  <dd className={cn("truncate", detail.mono && "font-mono")}>{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {actions ? <div className="flex flex-wrap gap-2 pt-2">{actions}</div> : null}
        </div>
      </div>
    );
  }

  const label = eyebrow ?? (code != null ? `Error ${code}` : null);

  return (
    <div
      role={busy === undefined ? undefined : "status"}
      aria-live={busy === undefined ? undefined : "polite"}
      aria-busy={busy}
      data-testid="status-page"
      // Centred while it fits; once the content outgrows the pane it scrolls
      // from the top instead of being cut off at both ends (`my-auto` on the
      // column, rather than `justify-center` here).
      className={cn(
        "@container relative flex w-full flex-col items-center overflow-x-hidden overflow-y-auto px-4",
        variant === "page" ? "h-screen bg-background text-foreground" : "h-full",
        className,
      )}
    >
      {code != null ? (
        <div
          aria-hidden="true"
          // Sized by the pane, not the window: a split view is half as wide.
          className={cn(
            "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center font-black leading-none tracking-tighter",
            "text-[min(38cqw,22rem)]",
            styles.watermark,
          )}
        >
          {code}
        </div>
      ) : null}

      <div className="relative my-auto flex w-full max-w-xl flex-col items-center gap-6 py-10 text-center">
        <div className={cn("flex size-16 items-center justify-center rounded-2xl", styles.tile)}>
          <Icon className={cn("size-8", spin && "animate-spin motion-reduce:animate-none")} aria-hidden />
        </div>

        <div className="space-y-2">
          {label ? (
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
          ) : null}
          <h1 className="text-balance text-2xl font-semibold tracking-tight @lg:text-3xl">{title}</h1>
          {description ? (
            <div className="text-balance text-sm leading-relaxed text-muted-foreground">{description}</div>
          ) : null}
        </div>

        {children}

        {actions ? <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}

        {hints && hints.length > 0 ? (
          <div className="w-full rounded-lg border bg-card/60 p-4 text-left text-sm backdrop-blur-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What you can try
            </div>
            <ul className="space-y-1.5">
              {hints.map((hint, index) => (
                <li key={index} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span className="min-w-0 [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs">
                    {hint}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasDetails || technical ? (
          <div className="w-full rounded-lg border bg-card/60 text-left text-sm backdrop-blur-sm">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</div>
              <CopyDetailsButton text={() => statusCopyText({ title, details, technical })} />
            </div>
            {hasDetails ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-4 py-3">
                {details.map((detail) => (
                  <div key={detail.label} className="contents">
                    <dt className="whitespace-nowrap text-muted-foreground">{detail.label}</dt>
                    <dd className={cn("min-w-0 break-all", detail.mono && "font-mono text-xs leading-5")}>
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {technical ? (
              <details className={cn(hasDetails && "border-t")}>
                <summary className="cursor-pointer select-none px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Technical details
                </summary>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border-t bg-muted/40 px-4 py-3 font-mono text-xs leading-5">
                  {technical}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StatusPage;

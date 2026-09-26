import { cn } from "@/core/util/utils";
import { formatMoney, toNumber } from "../format";

/**
 * An amount in its currency. Signed amounts (transactions) show their sign and
 * colour money in green; money out stays the foreground colour so a statement
 * does not read as a wall of red.
 */
export const Money = ({
  amount,
  currency,
  signed = false,
  className,
}: {
  amount: string | number | null | undefined;
  currency: string;
  signed?: boolean;
  className?: string;
}) => {
  const value = toNumber(amount);
  return (
    <span
      className={cn(
        "tabular-nums whitespace-nowrap",
        signed && value > 0 && "text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      {formatMoney(amount, currency, { signed })}
    </span>
  );
};

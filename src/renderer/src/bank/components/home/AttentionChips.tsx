import { Link } from "react-router-dom";

type Chip = { to: string; text: string; urgent?: boolean };

/**
 * What wants a look, as chips under the numbers; each goes where it is fixed.
 * Renders nothing when all is well.
 */
export const AttentionChips = ({
  uncategorized = 0,
  discover = 0,
  reauth = 0,
}: {
  uncategorized?: number;
  discover?: number;
  reauth?: number;
}) => {
  const chips: Chip[] = [
    reauth > 0 && {
      to: "/bank/connections",
      text: `${reauth} ${reauth === 1 ? "bank needs" : "banks need"} a new login`,
      urgent: true,
    },
    uncategorized > 0 && {
      to: "/bank/transactions?uncategorized=1",
      text: `${uncategorized} uncategorized this month · review`,
    },
    discover > 0 && {
      to: "/bank/merchants/discover",
      text: `${discover} recurring ${discover === 1 ? "counterparty" : "counterparties"} without a merchant`,
    },
  ].filter((chip): chip is Chip => !!chip);

  if (chips.length === 0) return null;
  return (
    <div className="-mt-4 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.to}
          to={chip.to}
          className={
            chip.urgent
              ? "rounded-full border border-destructive/40 px-3 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10"
              : "rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          }
        >
          {chip.text}
        </Link>
      ))}
    </div>
  );
};

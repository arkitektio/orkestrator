import { AddressFragment } from "../api/graphql";
import { addressLabel } from "../format";

/** A list of addresses as names, each with its address on hover. */
export const Addresses = ({ label, list }: { label: string; list: AddressFragment[] }) => {
  if (list.length === 0) return null;
  return (
    <div className="flex min-w-0 gap-1 text-xs text-muted-foreground">
      <span className="shrink-0">{label}</span>
      <span className="truncate">
        {list.map((a, i) => (
          <span key={a.address + i} title={a.address}>
            {i > 0 && ", "}
            {addressLabel(a)}
          </span>
        ))}
      </span>
    </div>
  );
};

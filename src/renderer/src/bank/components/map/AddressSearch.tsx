import { Input } from "@/core/ui/input";
import { useDebounce } from "@uidotdev/usehooks";
import { MapPin, Search } from "lucide-react";
import { useState } from "react";
import { GeocodeSearchQuery, useGeocodeSearchQuery } from "../../api/graphql";

export type GeocodeResult = GeocodeSearchQuery["geocodeSearch"][number];

/**
 * Look an address or place name up on OpenStreetMap (through the bank
 * service) and pick one of the matches.
 */
export const AddressSearch = ({
  onPick,
  initial = "",
  placeholder = "Search an address or place…",
}: {
  onPick: (result: GeocodeResult) => void;
  initial?: string;
  placeholder?: string;
}) => {
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const query = useDebounce(text.trim(), 400);
  const { data, loading } = useGeocodeSearchQuery({
    variables: { query },
    skip: !open || query.length < 3,
  });
  const results = data?.geocodeSearch ?? [];

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={text}
        placeholder={placeholder}
        className="pl-8"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          // Enter picks the first match instead of submitting the dialog.
          if (e.key === "Enter") {
            e.preventDefault();
            if (results[0]) {
              onPick(results[0]);
              setOpen(false);
            }
          }
        }}
      />
      {open && query.length >= 3 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {results.length === 0 ? (
            <p className="p-2 text-xs text-muted-foreground">{loading ? "Searching…" : "Nothing found"}</p>
          ) : (
            results.map((result) => (
              <button
                key={result.osmId ?? result.label}
                type="button"
                className="flex w-full items-start gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(result);
                  setOpen(false);
                }}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{result.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

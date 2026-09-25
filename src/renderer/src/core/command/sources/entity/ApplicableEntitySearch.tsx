import { moduleSearches } from "@/core/modules/registries";
import { useModuleHostVersion } from "@/core/modules/host/host";
import type { PassDownProps } from "@/core/smart/extensions/types";
import { useDebounce } from "@uidotdev/usehooks";

import { MIN_TERM_LENGTH } from "./shared";

/**
 * Things, found in the backends.
 *
 * Rendered LAST in the palette on purpose: it is the only asynchronous source,
 * and results arriving a moment later must not shove the synchronous rows down
 * from under the user's cursor.
 *
 * Each module (its `search` builtin) is wrapped in its own guard FROM THE OUTSIDE — convention #1 in
 * CLAUDE.md, and load-bearing rather than decorative here. A deployment may ship
 * without any given module, and `useGlobalSearchQuery` fires on mount against an
 * Apollo client that only exists once that service is ready; guarding inside the
 * component would be too late, because the hook would already have run.
 */
export const ApplicableEntitySearch = ({ filter, onDone }: PassDownProps) => {
  // A SECOND debounce, on top of the palette's own 100ms. That one is tuned for
  // local filtering; without this, every keystroke-pause would fan out into one
  // network request per module. Do not "simplify" the two into one.
  const term = useDebounce(filter?.trim() ?? "", 250);
  useModuleHostVersion();

  // One or two characters match most of a database and help nobody.
  if (term.length < MIN_TERM_LENGTH) {
    return null;
  }

  const done = () => onDone?.({ kind: "local" });

  // Every module's `search` builtin, each inside its module's guard.
  return (
    <>
      {moduleSearches().map(({ namespace, Guard, Search }) => (
        <Guard key={namespace}>
          <Search term={term} onDone={done} />
        </Guard>
      ))}
    </>
  );
};

export default ApplicableEntitySearch;

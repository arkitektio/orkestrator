import { RoleGuard } from "@/core/connection/roles";
import { reportErrorAs } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { X } from "lucide-react";
import { ShortcutBindingFragment, useUnbindShortcutMutation } from "../api/graphql";
import { REKUEST_ADMIN } from "../roles";

const Unbind = ({ binding }: { binding: ShortcutBindingFragment }) => {
  const [unbind, { loading }] = useUnbindShortcutMutation({
    update: (cache) => {
      cache.evict({ id: cache.identify({ __typename: "ShortcutBinding", id: binding.id }) });
      cache.gc();
    },
  });
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      disabled={loading}
      aria-label="Remove this pin"
      onClick={() =>
        void unbind({ variables: { id: binding.id } }).catch(reportErrorAs("Couldn't unpin the shortcut"))
      }
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );
};

/** One dimension a rule sets, labelled; the ones it leaves open are not drawn. */
const Where = ({ label, value }: { label: string; value: string }) => (
  <Badge variant="outline" className="gap-1 font-normal" title={value}>
    <span className="text-muted-foreground">{label}</span>
    <span className="max-w-48 truncate">{value}</span>
  </Badge>
);

/** Who an admin pinned this shortcut for, and where; nothing when nobody. */
export const ShortcutBindings = ({ bindings }: { bindings: ShortcutBindingFragment[] }) => {
  if (bindings.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-medium text-muted-foreground">Pinned for</h3>
      <ul className="flex flex-col gap-1">
        {bindings.map((binding) => (
          <li key={binding.id} className="flex items-center gap-2 text-sm">
            {binding.user ? (
              <StructureDisplay identifier="@lok/user" id={binding.user.sub} variant="chip" />
            ) : (
              <span>Every member</span>
            )}
            {binding.app ? <Where label="app" value={binding.app} /> : null}
            {binding.client ? <Where label="client" value={binding.client} /> : null}
            {binding.device ? (
              <StructureDisplay
                identifier="@lok/device"
                id={binding.device}
                by="nodeId"
                variant="chip"
                fallback={<Where label="device" value={binding.device} />}
              />
            ) : null}
            {!binding.app && !binding.client && !binding.device ? (
              <span className="text-xs text-muted-foreground">everywhere</span>
            ) : null}
            <RoleGuard require={REKUEST_ADMIN}>
              <Unbind binding={binding} />
            </RoleGuard>
          </li>
        ))}
      </ul>
    </div>
  );
};

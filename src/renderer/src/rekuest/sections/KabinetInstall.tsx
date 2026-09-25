import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Object } from "@/types";
import { buildAssignInput } from "../assign";
import {
  DemandKind,
  type ListImplementationFragment,
  PortKind,
  useImplementationsQuery,
} from "../api/graphql";
import { useImplementationAction } from "../hooks/useImplementationAction";
import { useLiveTask } from "../hooks/useTasks";

/**
 * Installing a kabinet flavour or release is running one of rekuest's
 * installers: an implementation that takes the flavour (or release) and
 * returns a `@kabinet/pod`. These are rekuest's sections on kabinet's cards and
 * menus; kabinet only names the place.
 */
type SectionProps = { identifier: string; object: Object };

const InstallItem = ({
  implementation,
  identifier,
  id,
}: {
  implementation: ListImplementationFragment;
  identifier: string;
  id: string;
}) => {
  const { assign, implementation: detail } = useImplementationAction({ id: implementation.id });

  const install = async () => {
    const argKey = detail?.action.args.at(0)?.key;
    if (!argKey) return;
    await assign(
      buildAssignInput({
        args: { [argKey]: { object: id, __identifier: identifier } },
      }),
    );
  };

  return (
    <DropdownMenuItem onSelect={install} className="cursor-pointer">
      Install on {implementation.agent.name}
    </DropdownMenuItem>
  );
};

/**
 * The installers for one flavour/release, as dropdown items. Rendered only
 * inside an open `DropdownMenuContent` (Radix unmounts it when closed), so
 * the query fires on open rather than once per card on mount.
 */
const InstallTargets = ({ identifier, id }: { identifier: string; id: string }) => {
  const { data, error } = useImplementationsQuery({
    variables: {
      filters: {
        action: {
          demands: [
            { kind: DemandKind.Args, matches: [{ at: 0, kind: PortKind.Structure, identifier }] },
            { kind: DemandKind.Returns, matches: [{ at: 0, kind: PortKind.Structure, identifier: "@kabinet/pod" }] },
          ],
        },
      },
    },
  });

  return (
    <>
      {data?.implementations.length === 0 && (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          No installers found. Install an engine first.
        </div>
      )}
      {error && <div className="px-2 py-1.5 text-xs text-destructive">Error: {error.message}</div>}
      {data?.implementations.map((implementation) => (
        <InstallItem key={implementation.id} implementation={implementation} identifier={identifier} id={id} />
      ))}
    </>
  );
};

/** In kabinet's own install menus (the app store): the installer items. */
export const KabinetInstallMenu = ({ identifier, object }: SectionProps) => (
  <InstallTargets identifier={identifier} id={object.id} />
);

/**
 * On a flavour/release card: the Install button, and the running install's
 * progress as a fill behind the card's content (the card is `relative
 * isolate`, so `-z-10` sits above its background and below everything else).
 */
export const KabinetInstallCard = ({ identifier, object }: SectionProps) => {
  const { progress } = useLiveTask({ identifier, object: object.id });
  return (
    <>
      {progress ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 bg-[#10b981] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Install
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right">
          <InstallTargets identifier={identifier} id={object.id} />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

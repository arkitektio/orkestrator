import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestAgent, RekuestSpace } from "@/core/linkers";
import { reportErrorAs } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { SpaceDocument, useResetPlacementMutation, useSpaceQuery } from "@/rekuest/api/graphql";
import { RotateCcw } from "lucide-react";
import { REKUEST_HELP } from "../help";

/** Where a pose stands: its translation, in meters. */
const position = (affine: unknown): string => {
  if (!Array.isArray(affine) || affine.length < 3) return "–";
  const cells = affine.slice(0, 3).map((row) => (Array.isArray(row) ? row[3] : undefined));
  return cells.every((cell) => typeof cell === "number")
    ? (cells as number[]).map((cell) => cell.toFixed(3)).join(", ")
    : "–";
};

/**
 * A room: where people left each device. What a 3D view shows is the action's
 * own `<Space room=...>` blok; a device nobody moved stands where that blok
 * says, and does not show here.
 */
export const SpacePage = asDetailQueryRoute(useSpaceQuery, ({ data }) => {
  const room = data.space.reference ?? data.space.name;
  const [reset] = useResetPlacementMutation({
    refetchQueries: [{ query: SpaceDocument, variables: { id: data.space.id } }],
  });

  return (
    <RekuestSpace.ModelPage
      title={data.space.name}
      help={REKUEST_HELP.space}
      object={data.space}
      pageActions={<RekuestSpace.ObjectButton alwaysShow object={data.space} />}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <RekuestSpace.Knowledge object={data?.space} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">
          The room <span className="font-mono text-foreground">{room}</span>: where people left each device, the
          same for everyone. A device nobody moved stands where its action&apos;s 3D view places it.
        </p>
        {data.space.placements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody has moved a device in this room yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Device</th>
                <th className="py-1 font-medium">Placed as</th>
                <th className="py-1 font-medium">Stands at (m)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.space.placements.map((placement) => (
                <tr key={placement.id} className="border-t">
                  <td className="py-1.5">
                    <RekuestAgent.DetailLink object={placement.agent} className="hover:underline">
                      {placement.agent.name}
                    </RekuestAgent.DetailLink>
                  </td>
                  <td className="py-1.5 font-mono text-xs">{placement.role}</td>
                  <td className="py-1.5 font-mono text-xs">{position(placement.affineMatrix)}</td>
                  <td className="py-1.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Forget where it was left: its action's 3D view places it again"
                      onClick={() =>
                        reset({ variables: { input: { room, agent: placement.agent.id } } }).catch(
                          reportErrorAs(`Couldn't reset ${placement.agent.name}`),
                        )
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </RekuestSpace.ModelPage>
  );
});

export default SpacePage;

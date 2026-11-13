import * as React from 'react';
import {useSceneNotice} from '@arkitektio/bsx/renderer/bloks/scene/index';
import {BlokSpaceHostProvider, type BlokPose, type BlokRoom, type BlokSpaceHost} from '@arkitektio/bsx/renderer/bloks/run/index';
import {reportErrorAs} from '@/core/notify';
import {
  ComponentContext,
  SpaceByReferenceDocument,
  useListMaterializedBloksQuery,
  useMaterializedBlokQuery,
  useResetPlacementMutation,
  useSavePlacementMutation,
  useSpaceByReferenceQuery,
  type ListMaterializedBlokFragment,
} from '@/rekuest/api/graphql';
import MaterializedBlokRenderer from '@/rekuest/components/MaterializedBlokRenderer';

/**
 * The rooms an action's `<Space room=...>` blok places its run's dependencies
 * in, as the server keeps them, and each placed agent drawn by its own scene
 * blok.
 *
 * Which devices stand in a room, and where until someone moves them, is the
 * action's blok. Where someone left each one is the room's: one pose per
 * agent, the same for everyone (`spaceByReference`, `savePlacement`).
 */

/** How many 3D views are asked for: past the server's default page. */
const VIEW_LIMIT = 500;

/** A URI-shaped room (`room:helsinki-lab`) is the organization's; a plain key the declaring app's. */
const URI = /^[a-z][a-z0-9+.-]*:/;

/** The reference a blok's `room` is kept under: as written for a URI, else scoped to `app` (`app/<identifier>/<key>`). */
export const roomReference = (room: string, app: string | null | undefined): string =>
  URI.test(room) ? room : `app/${app ?? 'unknown'}/${room}`;

const isPose = (value: unknown): value is BlokPose =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every(row => Array.isArray(row) && row.length === 4 && row.every(cell => typeof cell === 'number'));

const NO_VIEWS: readonly ListMaterializedBlokFragment[] = [];

/** Every 3D view there is: the server narrows by the blok's context. */
const useSceneViews = (): readonly ListMaterializedBlokFragment[] =>
  useListMaterializedBloksQuery({
    variables: {filters: {contexts: [ComponentContext.Scene]}, pagination: {limit: VIEW_LIMIT}},
  }).data?.materializedBloks ?? NO_VIEWS;

/** Whether `view` is one of the agent's own: declared by it, or mapped to it as `self`. */
const isOwnView = (view: ListMaterializedBlokFragment, agentId: string): boolean =>
  view.declaredBy?.id === agentId || view.agentMappings.some(mapping => mapping.key === 'self' && mapping.agent.id === agentId);

/**
 * The 3D view an agent is drawn by: the one named (`<Placed blok=...>`), else
 * its own default scene blok, else any scene blok of its own.
 */
export const agentSceneView = (
  agentId: string,
  views: readonly ListMaterializedBlokFragment[],
  named: string | null,
): ListMaterializedBlokFragment | null => {
  const own = views.filter(view => view.blok.context === ComponentContext.Scene && isOwnView(view, agentId));
  if (named) return own.find(view => view.name === named || view.blok.name === named) ?? null;
  return own.find(view => view.isDefault) ?? own[0] ?? null;
};

const PlacedView = ({id, name}: {id: string; name: string}) => {
  const {data, error} = useMaterializedBlokQuery({variables: {id}});
  useSceneNotice(error ? `${name} could not be loaded` : null, error?.message);
  if (!data?.materializedBlok) return null;
  return <MaterializedBlokRenderer embedded surfaceId={`room-${id}`} materializedBlok={data.materializedBlok} />;
};

/** An agent drawn by its own scene blok, inside the scene that is open. */
const AgentScene = ({agentId, named}: {agentId: string; named: string | null}) => {
  const views = useSceneViews();
  const view = agentSceneView(agentId, views, named);
  useSceneNotice(
    views !== NO_VIEWS && !view ? (named ? `No scene blok "${named}"` : 'A device without a 3D view') : null,
    named ? `The agent ${agentId} declares no scene blok named "${named}".` : `The agent ${agentId} declares no scene blok to draw it with.`,
  );
  return view ? <PlacedView id={view.id} name={view.name || view.blok.name} /> : null;
};

/** The room a `Space` names, as the server keeps it; a viewer who keeps a pose keeps it for everyone. */
const useServerRoom = (reference: string): BlokRoom => {
  const {data} = useSpaceByReferenceQuery({variables: {room: reference}, skip: !reference});
  const refetchQueries = React.useMemo(() => [{query: SpaceByReferenceDocument, variables: {room: reference}}], [reference]);
  const [save] = useSavePlacementMutation({refetchQueries, awaitRefetchQueries: true});
  const [reset] = useResetPlacementMutation({refetchQueries});
  const placements = data?.spaceByReference?.placements;
  const poses = React.useMemo(
    () => new Map((placements ?? []).flatMap(placement => (isPose(placement.affineMatrix) ? [[placement.agent.id, placement.affineMatrix] as const] : []))),
    [placements],
  );
  return React.useMemo<BlokRoom>(
    () => ({
      poseOf: agentId => poses.get(agentId) ?? null,
      save: (agent, dependency, pose) => {
        save({variables: {input: {room: reference, agent: agent.id, role: dependency, affineMatrix: pose}}}).catch(
          reportErrorAs(`Could not keep where ${agent.name} stands`),
        );
      },
      reset: agent => {
        reset({variables: {input: {room: reference, agent: agent.id}}}).catch(reportErrorAs(`Could not reset ${agent.name}`));
      },
    }),
    [poses, reference, reset, save],
  );
};

/** The space host for the bloks of an action declared by `app`: its rooms kept on the server, its agents drawn by their own scene bloks. */
export const useRoomHost = (app: string | null | undefined): BlokSpaceHost =>
  React.useMemo<BlokSpaceHost>(
    () => ({
      useRoom: room => useServerRoom(roomReference(room, app)),
      renderAgent: (agentId, blok) => <AgentScene agentId={agentId} named={blok} />,
    }),
    [app],
  );

/** Provides the rooms of an action declared by `app` to the blok below. */
export const RoomHost = ({app, children}: {app: string | null | undefined; children: React.ReactNode}) => (
  <BlokSpaceHostProvider value={useRoomHost(app)}>{children}</BlokSpaceHostProvider>
);

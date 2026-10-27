import * as React from 'react';
import type * as THREE from 'three';
import * as z from 'zod';
import {
  BlokRuntimeProvider,
  BlokScopeProvider,
  BlokTreeProvider,
  createBlokComponent,
  useBlok,
  useBlokRuntimeStoreApi,
  useBlokScope,
  useBlokTree,
  useEventAction,
  useValue,
} from '../../runtime';
import {actionProp, describedString} from '../shared/schemas';
import {useModel, useSceneNotice, useSceneOverlay, useSceneStoreApi} from './context';
import {useBlokSceneHost} from './host';
import {useBlokTray} from '../run/host';

const nodeProp = describedString('The name of the node in the enclosing model; the whole model when unset.');

/** Under a model, or under an action overlay's `At` (the anchored device's model). */
const IN_MODEL_OR_AT = {context: 'scene', downstreamOf: ['Model', 'Robot', 'Anchor']} as const;
const titleProp = describedString('The heading of the card; it shows the node name when unset.');
const descriptionProp = describedString('A line under the heading of the card.');

/** The clicked spot, kept in the node's own coordinates so the card points at it while the node moves. */
const localPoint = (node: THREE.Object3D, world: THREE.Vector3): THREE.Vector3 => node.worldToLocal(world.clone());

const onClickSchema = z
  .object({
    node: nodeProp,
    onClick: actionProp(
      'Called when the node is clicked (not when a drag of the view ends on it). Arguments may read event.node and event.point ([x, y, z] in meters, where it was hit).',
    ),
    open: describedString('The name of an html blok to show when the node is clicked.'),
    title: titleProp,
    description: descriptionProp,
    mode: z
      .enum(['popout', 'panel'])
      .optional()
      .describe(
        'Where the opened blok shows: "popout" as a card on the clicked spot (the viewer can drag it aside), "panel" beside the scene. Defaults to popout.',
      ),
  })
  .describe(
    'Makes a node and everything beneath it clickable, with a highlight on hover. A click runs an action, opens a blok, or both; a second click closes it, and opening one card closes the others that are not pinned.',
  );

export const OnClickBlok = createBlokComponent(
  {name: 'OnClick', placement: IN_MODEL_OR_AT, schema: onClickSchema},
  ({component}) => {
    const blok = useBlok(component, onClickSchema);
    const model = useModel();
    const host = useBlokSceneHost();
    const name = useValue(blok.node);
    const open = useValue(blok.open);
    const title = useValue(blok.title);
    const description = useValue(blok.description);
    const mode = useValue(blok.mode) ?? 'popout';
    const onClick = useEventAction(blok, 'onClick');
    const node = name ? model.instance.nodes.get(name) : model.instance.root;
    useSceneNotice(name && !node ? 'Unknown node' : null, `The model has no node '${name}'.`);

    const store = useSceneStoreApi();
    // Where the card points while open; null while closed.
    const [opened, setOpened] = React.useState<THREE.Vector3 | null>(null);
    const openedRef = React.useRef(opened);
    React.useEffect(() => {
      openedRef.current = opened;
    }, [opened]);
    React.useEffect(() => {
      if (!node) return;
      return model.addClickable(node, {
        onClick: ({point}) => {
          onClick?.({node: name, point: point.toArray()});
          if (!open) return;
          if (openedRef.current) {
            setOpened(null);
            return;
          }
          // One card at a time: opening this one closes the others, except those pinned.
          store.getState().dismiss();
          setOpened(localPoint(node, point));
        },
      });
    }, [model, name, node, onClick, open, store]);

    const anchor = React.useCallback(() => node ?? null, [node]);
    const close = React.useCallback(() => setOpened(null), []);
    const content = React.useMemo(() => (open ? host.renderBlok(open) : null), [host, open]);
    useSceneOverlay({
      visible: opened !== null && Boolean(open),
      anchor,
      point: mode === 'popout' ? opened : null,
      title: title ?? name,
      description,
      content,
      mode,
      dismissable: true,
      onDismiss: close,
    });
    return null;
  },
);

const popoutSchema = z
  .object({
    node: nodeProp,
    trigger: z
      .enum(['click', 'hover', 'always'])
      .optional()
      .describe('What shows the card: a click on the node, the pointer over it, or always. Defaults to click.'),
    open: z.boolean().optional().describe('Whether the card shows. When bound it decides alone and trigger is ignored.'),
    title: titleProp,
    description: descriptionProp,
  })
  .describe(
    'An HTML card anchored to a node that follows it as it moves; the viewer can drag it aside, and a line keeps pointing at the node. Its children are ordinary html components.',
  );

export const PopoutBlok = createBlokComponent(
  {
    name: 'Popout',
    acceptsChildren: true,
    placement: {...IN_MODEL_OR_AT, childrenContext: 'html'},
    schema: popoutSchema,
  },
  ({component, buildChild}) => {
    const blok = useBlok(component, popoutSchema);
    const model = useModel();
    const name = useValue(blok.node);
    const trigger = useValue(blok.trigger) ?? 'click';
    const controlled = useValue(blok.open);
    const title = useValue(blok.title);
    const description = useValue(blok.description);
    const node = name ? model.instance.nodes.get(name) : model.instance.root;
    useSceneNotice(name && !node ? 'Unknown node' : null, `The model has no node '${name}'.`);
    // Under an `At` whose device the space does not place: nothing to point at,
    // so the card shows in the side tray, as long as it would show at all.
    const tray = useBlokTray();

    const store = useSceneStoreApi();
    const [toggled, setToggled] = React.useState(false);
    // The spot a click opened the card on; the node's origin otherwise.
    const [point, setPoint] = React.useState<THREE.Vector3 | null>(null);
    const [hovered, setHovered] = React.useState(false);
    const interactive = controlled === undefined && trigger !== 'always' && tray === null;
    const openRef = React.useRef(toggled);
    React.useEffect(() => {
      openRef.current = toggled;
    }, [toggled]);
    React.useEffect(() => {
      if (!node || !interactive) return;
      return model.addClickable(node, {
        onClick: ({point: hit}) => {
          if (trigger !== 'click') return;
          if (openRef.current) {
            setToggled(false);
            return;
          }
          // One card at a time: opening this one closes the others, except those pinned.
          store.getState().dismiss();
          setPoint(localPoint(node, hit));
          setToggled(true);
        },
        onHover: setHovered,
      });
    }, [interactive, model, node, store, trigger]);

    const visible =
      controlled ??
      (tray !== null || trigger === 'always' ? true : trigger === 'hover' ? hovered || toggled : toggled);
    const anchor = React.useCallback(() => node ?? null, [node]);
    const close = React.useCallback(() => setToggled(false), []);

    // The card is rendered by the HTML half of the scene, outside the canvas;
    // the scope it was declared in (a foreach item, say) is carried across.
    // So are the blok's runtime and tree: in a scene shared by several bloks
    // that half is outside each of them.
    const scope = useBlokScope();
    const runtime = useBlokRuntimeStoreApi();
    const tree = useBlokTree();
    const content = React.useMemo(
      () => (
        <BlokRuntimeProvider store={runtime}>
          <BlokTreeProvider tree={tree}>
            <BlokScopeProvider aliases={scope.aliases} values={scope.values} basePath={scope.basePath}>
              {(component.children ?? []).map(child => (
                <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
              ))}
            </BlokScopeProvider>
          </BlokTreeProvider>
        </BlokRuntimeProvider>
      ),
      [buildChild, component, runtime, scope, tree],
    );
    useSceneOverlay({
      visible: Boolean(node) && visible,
      anchor,
      point: trigger === 'click' ? point : null,
      title: title ?? name ?? tray ?? undefined,
      description,
      content,
      mode: tray === null ? 'popout' : 'panel',
      dismissable: tray === null && controlled === undefined && trigger === 'click',
      onDismiss: close,
    });
    return null;
  },
);

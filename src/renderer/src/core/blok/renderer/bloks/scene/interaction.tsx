import * as React from 'react';
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

const nodeProp = z.string().describe('The name of the node in the enclosing model.');

const onClickSchema = z
  .object({
    node: nodeProp,
    onClick: actionProp('Called when the node is clicked. Arguments may read event.node.'),
    open: describedString('The name of an html blok to show when the node is clicked.'),
    mode: z
      .enum(['popout', 'panel'])
      .optional()
      .describe('Where the opened blok shows: "popout" as a card on the node, "panel" beside the scene. Defaults to popout.'),
  })
  .describe('Makes a node and everything beneath it clickable, with a highlight on hover. A click runs an action, opens a blok, or both.');

export const OnClickBlok = createBlokComponent(
  {name: 'OnClick', placement: {context: 'scene', downstreamOf: ['Model', 'Robot']}, schema: onClickSchema},
  ({component}) => {
    const blok = useBlok(component, onClickSchema);
    const model = useModel();
    const host = useBlokSceneHost();
    const name = useValue(blok.node);
    const open = useValue(blok.open);
    const mode = useValue(blok.mode) ?? 'popout';
    const onClick = useEventAction(blok, 'onClick');
    const node = name ? model.instance.nodes.get(name) : undefined;
    useSceneNotice(name && !node ? 'Unknown node' : null, `The model has no node '${name}'.`);

    const [opened, setOpened] = React.useState(false);
    React.useEffect(() => {
      if (!node) return;
      return model.addClickable(node, {
        onClick: () => {
          onClick?.({node: name});
          if (open) setOpened(previous => !previous);
        },
      });
    }, [model, name, node, onClick, open]);

    const anchor = React.useCallback(() => node ?? null, [node]);
    const close = React.useCallback(() => setOpened(false), []);
    const content = React.useMemo(() => (open ? host.renderBlok(open) : null), [host, open]);
    useSceneOverlay({
      visible: opened && Boolean(open),
      anchor,
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
  })
  .describe('An HTML card anchored to a node that follows it as it moves. Its children are ordinary html components.');

export const PopoutBlok = createBlokComponent(
  {
    name: 'Popout',
    acceptsChildren: true,
    placement: {context: 'scene', childrenContext: 'html', downstreamOf: ['Model', 'Robot']},
    schema: popoutSchema,
  },
  ({component, buildChild}) => {
    const blok = useBlok(component, popoutSchema);
    const model = useModel();
    const name = useValue(blok.node);
    const trigger = useValue(blok.trigger) ?? 'click';
    const controlled = useValue(blok.open);
    const node = name ? model.instance.nodes.get(name) : undefined;
    useSceneNotice(name && !node ? 'Unknown node' : null, `The model has no node '${name}'.`);

    const store = useSceneStoreApi();
    const [toggled, setToggled] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);
    const interactive = controlled === undefined && trigger !== 'always';
    const openRef = React.useRef(toggled);
    React.useEffect(() => {
      openRef.current = toggled;
    }, [toggled]);
    React.useEffect(() => {
      if (!node || !interactive) return;
      return model.addClickable(node, {
        onClick: () => {
          if (trigger !== 'click') return;
          if (openRef.current) {
            setToggled(false);
            return;
          }
          // One card at a time: opening this one closes the others, except those pinned.
          store.getState().dismiss();
          setToggled(true);
        },
        onHover: setHovered,
      });
    }, [interactive, model, node, store, trigger]);

    const visible =
      controlled ?? (trigger === 'always' ? true : trigger === 'hover' ? hovered || toggled : toggled);
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
      content,
      mode: 'popout',
      dismissable: controlled === undefined && trigger === 'click',
      onDismiss: close,
    });
    return null;
  },
);

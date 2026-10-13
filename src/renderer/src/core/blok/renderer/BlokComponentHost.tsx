import * as React from 'react';
import {defaultBlokCatalog} from './catalog';
import {
  BlokNode,
  BlokPortProvider,
  BlokRuntimeProvider,
  BlokTreeProvider,
  createBlokRuntimeStore,
  normalizeBlokProp,
  preflightBlokDocument,
  splitPathSegments,
  type BlokCatalog,
  type BlokPort,
} from './runtime';

const NODE_ID = 'widget';

/** The root a hosted component reads and writes the hosting value under. */
export const HOSTED_VALUE_ROOT = 'value';

export type BlokComponentHostProps = {
  /** The catalog component to render. */
  component: string;
  /** Its props, as they arrive from the server (camelCase) or as the runtime spells them. */
  props: readonly unknown[];
  /**
   * What the props may read, by root: the hosted `value` and whatever else
   * the host puts beside it (a port's dependencies, by name).
   */
  data: Record<string, unknown>;
  /** A write to the `value` root: the whole new value. The host owns it; nothing is kept here. */
  onValue: (value: unknown) => void;
  /** Rendered instead when this catalog cannot render the component as declared. */
  fallback: React.ReactNode;
  /** The action input the component stands in for, if it does. */
  port?: BlokPort;
  catalog?: BlokCatalog;
};

const hostedDocument = (component: string, props: readonly unknown[]) => [
  {id: NODE_ID, component, props: props.map(normalizeBlokProp)},
];

/**
 * Whether this catalog can render the component as declared: it has it, and
 * accepts these props. Asked by a host that draws something around the
 * component (a form field's label) and must not draw it around a fallback
 * that brings its own.
 */
export const canHostBlokComponent = (
  component: string,
  props: readonly unknown[],
  catalog: BlokCatalog = defaultBlokCatalog,
): boolean => preflightBlokDocument(hostedDocument(component, props), catalog).nodes.has(NODE_ID);

/**
 * One catalog component on its own, outside a blok: what renders a CUSTOM
 * widget in a form.
 *
 * The component gets the runtime a blok's node gets (prop resolution, pure
 * function calls), over a data model the host hands it. The root `value` is
 * the host's: a component that binds to it (`bind="value"`) reads what the
 * host holds and its writes are handed straight back through `onValue`, never
 * kept here, so the host stays the one owner and a later change on its side
 * is not masked by a stale local copy.
 *
 * A component this catalog does not have, or props it refuses, render the
 * `fallback`: a widget declared for a newer catalog must not leave an input
 * that cannot be filled.
 */
export const BlokComponentHost = ({
  component,
  props,
  data,
  onValue,
  fallback,
  port,
  catalog = defaultBlokCatalog,
}: BlokComponentHostProps) => {
  // Keyed by content: both arrive as rebuilt objects on most renders.
  const propsKey = JSON.stringify(props);
  const preflight = React.useMemo(
    () =>
      preflightBlokDocument(hostedDocument(component, JSON.parse(propsKey) as unknown[]), catalog),
    [component, propsKey, catalog],
  );

  const [store] = React.useState(() =>
    createBlokRuntimeStore({
      initialDataModel: data,
      invokeFunction: (name, args, options) => catalog.invokeFunction(name, args, options),
    }),
  );

  const onValueRef = React.useRef(onValue);
  const dataRef = React.useRef(data);
  React.useEffect(() => {
    onValueRef.current = onValue;
    dataRef.current = data;
  });

  React.useEffect(() => {
    store.getState().setInitialDataModel(data);
  }, [store, data]);

  React.useEffect(() => {
    // The hand-over below changes the store, which calls this again.
    let handingOver = false;
    return store.subscribe(state => {
      if (handingOver) return;
      const written = Object.keys(state.runtimePathValues).filter(
        path => splitPathSegments(path)[0] === HOSTED_VALUE_ROOT,
      );
      if (written.length === 0) return;
      const next = (state.dataModel as Record<string, unknown> | undefined)?.[HOSTED_VALUE_ROOT];
      handingOver = true;
      try {
        // Shown at once, then handed over: the host's own update arrives a
        // render later and would otherwise flash the previous value.
        dataRef.current = {...dataRef.current, [HOSTED_VALUE_ROOT]: next};
        written.forEach(path => store.getState().clearRuntimeValue(path));
        store.getState().setInitialDataModel(dataRef.current);
      } finally {
        handingOver = false;
      }
      onValueRef.current(next);
    });
  }, [store]);

  const tree = React.useMemo(
    () => ({catalog, nodes: preflight.nodes, invalidNodes: preflight.invalidNodes}),
    [catalog, preflight],
  );

  if (!preflight.nodes.has(NODE_ID)) {
    return <>{fallback}</>;
  }

  return (
    <BlokPortProvider value={port}>
      <BlokRuntimeProvider store={store}>
        <BlokTreeProvider tree={tree}>
          <BlokNode id={NODE_ID} />
        </BlokTreeProvider>
      </BlokRuntimeProvider>
    </BlokPortProvider>
  );
};

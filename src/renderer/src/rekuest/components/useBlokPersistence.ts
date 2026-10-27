import * as React from 'react';
import {Arkitekt} from '@/core/connection/arkitekt/host';
import {
  componentStateStore,
  openBlokPersistence,
  type BlokComponentStateStore,
  type BlokLocal,
  type BlokPersistScope,
  type BlokPersistence,
} from '@/core/blok/renderer/persist';

/** Whose kept values these are: the hub (its id, else its address) and the user of the active profile. */
const usePersistScope = (): Omit<BlokPersistScope, 'materializedBlok'> | null => {
  const identity = Arkitekt.useActiveProfile()?.identity;
  const hub = identity?.hubId ?? identity?.baseUrl;
  const user = identity?.userId;
  return React.useMemo(() => (hub && user ? {hub, user} : null), [hub, user]);
};

/**
 * The locals this device keeps for a materialization (those declared
 * `Local(persist=True)`): `undefined` while they are read, `null` when there is
 * nothing to keep (the blok persists no local, or nobody is signed in to keep
 * it for). Opened again when the persisted keys, the hub or the user change.
 */
export const useBlokPersistence = (
  materializedBlok: string,
  locals: ReadonlyArray<BlokLocal> | null | undefined,
): BlokPersistence | null | undefined => {
  const scope = usePersistScope();
  const keys = (locals ?? [])
    .filter(local => local.persist)
    .map(local => local.key)
    .join('\u0000');
  const wanted = scope && keys ? `${JSON.stringify([scope.hub, scope.user, materializedBlok])}\u0000${keys}` : null;
  const [opened, setOpened] = React.useState<{for: string; persistence: BlokPersistence} | null>(null);
  // Read when the blok is opened, not followed: new defaults alone open nothing again.
  const declared = React.useRef(locals);
  React.useEffect(() => {
    declared.current = locals;
  });

  React.useEffect(() => {
    if (!wanted || !scope) return;
    let cancelled = false;
    void openBlokPersistence({scope: {...scope, materializedBlok}, locals: declared.current ?? []}).then(persistence => {
      if (!cancelled) setOpened({for: wanted, persistence});
    });
    return () => {
      cancelled = true;
    };
  }, [materializedBlok, scope, wanted]);

  if (!wanted) return null;
  return opened?.for === wanted ? opened.persistence : undefined;
};

/**
 * Where the components of a materialization keep their own state by id
 * (`<Scene id="main" persist>`): per (hub, user, materialized blok, component
 * id) on this device. Null when nobody is signed in to keep it for.
 */
export const useBlokComponentStore = (materializedBlok: string): BlokComponentStateStore | null => {
  const scope = usePersistScope();
  return React.useMemo(() => (scope ? componentStateStore({...scope, materializedBlok}) : null), [materializedBlok, scope]);
};

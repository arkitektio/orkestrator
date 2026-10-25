import * as React from 'react';
import {Arkitekt} from '@/core/connection/arkitekt/host';
import {
  openBlokPersistence,
  type BlokPersistScope,
  type BlokPersistedLocal,
  type BlokPersistence,
} from '@/core/blok/renderer/persist';

/** Whose kept locals these are: the hub (its id, else its address) and the user of the active profile. */
const usePersistScope = (): Omit<BlokPersistScope, 'materializedBlok'> | null => {
  const identity = Arkitekt.useActiveProfile()?.identity;
  const hub = identity?.hubId ?? identity?.baseUrl;
  const user = identity?.userId;
  return React.useMemo(() => (hub && user ? {hub, user} : null), [hub, user]);
};

/**
 * The locals this device keeps for a materialization: `undefined` while they
 * are read, `null` when there is nothing to keep (the blok persists nothing,
 * or nobody is signed in to keep it for). Opened again when the declared keys,
 * the hub or the user change; the demo state is read as the defaults then.
 */
export const useBlokPersistence = (
  materializedBlok: string,
  declared: ReadonlyArray<BlokPersistedLocal> | null | undefined,
  demoState: unknown,
): BlokPersistence | null | undefined => {
  const scope = usePersistScope();
  const keys = (declared ?? []).map(local => local.key).join('\u0000');
  const wanted = scope && keys ? `${JSON.stringify([scope.hub, scope.user, materializedBlok])}\u0000${keys}` : null;
  const [opened, setOpened] = React.useState<{for: string; persistence: BlokPersistence} | null>(null);
  // Read when the blok is opened, not followed: a new demo state alone opens nothing again.
  const defaults = React.useRef(demoState);
  const locals = React.useRef(declared);
  React.useEffect(() => {
    defaults.current = demoState;
    locals.current = declared;
  });

  React.useEffect(() => {
    if (!wanted || !scope) return;
    let cancelled = false;
    void openBlokPersistence({
      scope: {...scope, materializedBlok},
      declared: locals.current ?? [],
      defaults: (defaults.current as Record<string, unknown> | null) ?? {},
    }).then(persistence => {
      if (!cancelled) setOpened({for: wanted, persistence});
    });
    return () => {
      cancelled = true;
    };
  }, [materializedBlok, scope, wanted]);

  if (!wanted) return null;
  return opened?.for === wanted ? opened.persistence : undefined;
};

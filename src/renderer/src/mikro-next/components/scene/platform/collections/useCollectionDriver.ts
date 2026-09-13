import { useEffect, useRef } from "react";

import {
  CollectionDriver,
  type CollectionEnvironment,
  type CollectionInputs,
  type DrivableCollection,
} from "./collectionDriver";

/**
 * Mounts a `CollectionDriver` for the lifetime of `target`, and pushes
 * UI-cadence inputs into it.
 *
 * The target is CALLER-BUILT rather than produced by a factory here: the two
 * formats open differently (fabriks needs a meshopt decoder, konnektion does
 * not), fail with different messages, memoise on different keys, and their
 * grant kinds must stay explicit at the call site (`AccessKind` is a
 * documented silent-failure surface). A factory parameter would drag all of
 * that in here to save one `useMemo`.
 *
 * Returns nothing: neither layer forces a replan of its own. A `detail` change
 * writes the plan config and takes effect at the next camera settle, which is
 * what both did before — handing out the driver to enable an immediate replan
 * would be a behaviour change, not a refactor. VISIBILITY is the exception:
 * the driver replans on the show edge, because a hidden collection plans
 * nothing and would otherwise stay empty/stale until the user panned.
 */
export function useCollectionDriver<M extends DrivableCollection>(
  target: M | null,
  env: CollectionEnvironment,
  inputs: CollectionInputs,
): void {
  const driverRef = useRef<CollectionDriver<M> | null>(null);

  useEffect(() => {
    if (!target) {
      driverRef.current = null;
      return;
    }
    const driver = new CollectionDriver(target, env, inputs);
    driverRef.current = driver;
    return () => {
      driver.dispose();
      driverRef.current = null;
    };
    // Keyed on `target` alone, deliberately. `env` is infrastructure — store
    // handles and `invalidate`, stable for the scene's life — and `inputs`
    // here are only the INITIAL placement and slab; later changes arrive
    // through `update()` below rather than by rebuilding the driver, which
    // would re-`ensureIndex` and refetch every cell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Placement and slab are UI-cadence: they change on a registration edit or a
  // mode/thickness change, never per frame.
  useEffect(() => {
    driverRef.current?.update({ matrix: inputs.matrix });
  }, [inputs.matrix]);

  const slabThickness = inputs.slab?.thickness ?? null;
  useEffect(() => {
    driverRef.current?.update({
      slab: slabThickness === null ? null : { thickness: slabThickness },
    });
  }, [slabThickness]);

  // Visibility: a deliberate toggle, never a render-cadence value. The driver
  // applies it to the manager AND replans on the hidden -> visible edge.
  useEffect(() => {
    driverRef.current?.update({ visible: inputs.visible });
  }, [inputs.visible]);
}

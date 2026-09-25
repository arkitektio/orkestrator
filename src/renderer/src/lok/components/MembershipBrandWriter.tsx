import { Button } from "@/components/ui/button";
import { setBrandRemote } from "@/providers/settings/brandTheme";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UpdateMembershipColorsMutation } from "../api/graphql";
import { useMyContextQuery, useUpdateMembershipColorsMutation } from "../api/graphql";
import { resolveContextBrand } from "../lib/membershipBrand";

/**
 * lok's hook wrapper sets `onError` on every mutation, which flips Apollo's
 * contract: the promise RESOLVES on failure instead of rejecting, and the error
 * is already reported by `onApolloError`. So failure is read off the result —
 * and never re-toasted here, or the user would see the same error twice.
 */
const failed = (
  result: { data?: UpdateMembershipColorsMutation | null; errors?: readonly unknown[] } | null,
) => !result?.data || (result.errors?.length ?? 0) > 0;

/** Long enough that dragging a slider sends one write at the end of the drag
 * rather than one per frame, short enough that a click on a preset settles
 * almost at once. The tint itself does not wait for this — see below. */
const DEBOUNCE_MS = 300;

export type EditedBrand = { hue: number; chroma: number };

export type MembershipBrandWriterProps = {
  /**
   * The brand the user just picked, or null when they have not touched the
   * controls yet.
   *
   * Null is what keeps this component from writing on mount: the customizer is
   * seeded from LOCAL settings, so an unconditional write would push those over
   * whatever the membership already holds — silently overwriting the brand this
   * user chose on another machine.
   */
  brand: EditedBrand | null;
};

/**
 * Persists brand edits to the caller's membership in the active organization.
 *
 * Must be mounted inside `Guard.Lok`: the hooks need lok's Apollo client.
 * Without lok the customizer still works and still writes local settings — the
 * brand simply stays on that machine.
 *
 * `updateMembershipColors` takes no id; it always targets the caller's
 * membership in the organization they are acting in.
 *
 * Two writers touch the remote brand layer, with a clean split: this one owns
 * the IN-FLIGHT edit, `OrganizationBrandSync` owns CONFIRMED server state. The
 * edit has to be applied here and now because the remote layer outranks local
 * settings — leave it to the round trip and the app would ignore the slider
 * until the mutation lands. When it does land, the cache update reaches
 * `ProfileIdentitySync`, which stores it on the profile, and
 * `OrganizationBrandSync` paints the same value from there — so the two converge.
 */
export const MembershipBrandWriter = ({ brand }: MembershipBrandWriterProps) => {
  const { data } = useMyContextQuery({ fetchPolicy: "cache-first" });
  const [updateColors, { loading }] = useUpdateMembershipColorsMutation();
  const [clearing, setClearing] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read through a ref so the debounce effect does not restart — and so lose
  // the user's edit — every time the context query re-renders.
  const confirmed = useRef(resolveContextBrand(data?.mycontext));
  confirmed.current = resolveContextBrand(data?.mycontext);

  useEffect(() => {
    if (!brand) {
      return;
    }

    // Show the choice immediately; the mutation only confirms it.
    setBrandRemote({ hue: brand.hue, chroma: brand.chroma });

    if (pending.current !== null) {
      clearTimeout(pending.current);
    }

    // Deliberately NOT cleared on unmount: navigating away from the settings
    // page mid-debounce should still save the edit, not silently drop it. The
    // timer only touches the Apollo client and the global toaster, both of
    // which outlive this component.
    pending.current = setTimeout(() => {
      pending.current = null;
      updateColors({
        variables: { input: { brandHue: brand.hue, brandChroma: brand.chroma } },
      })
        .then((result) => {
          if (failed(result)) {
            // Put the confirmed colour back — the optimistic one never saved.
            setBrandRemote(confirmed.current);
          }
        })
        .catch(() => setBrandRemote(confirmed.current));
    }, DEBOUNCE_MS);
  }, [brand, updateColors]);

  /**
   * Hand the choice back to the organization.
   *
   * Nulls mean "not overridden" rather than "no colour", so this is the only
   * way back to the organization's default once a member has picked something —
   * without it the write path would be a one-way door.
   */
  const clearOverride = async () => {
    if (pending.current !== null) {
      clearTimeout(pending.current);
      pending.current = null;
    }

    setClearing(true);
    try {
      const result = await updateColors({
        variables: { input: { brandHue: null, brandChroma: null } },
      });
      if (!failed(result)) {
        toast.success("Using your organization's brand colour.");
      }
    } finally {
      setClearing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={clearOverride}
      disabled={loading || clearing}
    >
      Use organization brand
    </Button>
  );
};

export default MembershipBrandWriter;

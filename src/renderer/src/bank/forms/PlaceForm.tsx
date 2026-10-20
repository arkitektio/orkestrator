import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { lazy, Suspense, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/core/notify";
import {
  GetMerchantDocument,
  ListMerchantLocationsDocument,
  MerchantLocationFragment,
  MerchantLocationsGeojsonDocument,
  useCreateMerchantLocationMutation,
  useGeocodeMerchantLocationMutation,
  useGetMerchantLocationQuery,
  useGetMerchantQuery,
  useUpdateMerchantLocationMutation,
} from "../api/graphql";
import { isLocated } from "../components/cards/PlaceCard";
import { AddressSearch, GeocodeResult } from "../components/map/AddressSearch";
import type { Bbox } from "@/core/map/BaseMap";
import type { Point } from "@/core/map/PointPicker";
import { asBankError } from "../errors";

// maplibre loads with the map, not with the dialog registry.
const PointPicker = lazy(() => import("@/core/map/PointPicker"));

type Values = {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  region: string;
  storeCode: string;
  notes: string;
};

const REFETCH = [GetMerchantDocument, ListMerchantLocationsDocument, MerchantLocationsGeojsonDocument];

const orNull = (value: string) => value.trim() || null;

const pointOf = (place?: MerchantLocationFragment): Point | null =>
  place && isLocated(place) ? { latitude: Number(place.latitude), longitude: Number(place.longitude) } : null;

/** The merchant's other located places, to frame the map before a pin is set. */
const useAround = (merchant: string | undefined, except?: string): Bbox | null => {
  const { data } = useGetMerchantQuery({ variables: { id: merchant! }, skip: !merchant });
  return useMemo(() => {
    const points = (data?.merchant.locations ?? []).filter((l) => l.id !== except && isLocated(l));
    if (points.length === 0) return null;
    const lngs = points.map((l) => Number(l.longitude));
    const lats = points.map((l) => Number(l.latitude));
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  }, [data, except]);
};

const PlaceFields = ({ place, merchant }: { place?: MerchantLocationFragment; merchant?: string }) => {
  const [pin, setPin] = useState<Point | null>(() => pointOf(place));
  const [pinMoved, setPinMoved] = useState(false);
  const around = useAround(merchant ?? place?.merchant.id, place?.id);
  const [create] = useCreateMerchantLocationMutation({ refetchQueries: REFETCH });
  const [update] = useUpdateMerchantLocationMutation({ refetchQueries: REFETCH });
  const [geocode] = useGeocodeMerchantLocationMutation({ refetchQueries: REFETCH });
  const form = useForm<Values>({
    defaultValues: {
      name: place?.name ?? "",
      street: place?.street ?? "",
      postalCode: place?.postalCode ?? "",
      city: place?.city ?? "",
      country: place?.country ?? "",
      region: place?.region ?? "",
      storeCode: place?.storeCode ?? "",
      notes: place?.notes ?? "",
    },
  });
  const busy = form.formState.isSubmitting;

  const movePin = (point: Point) => {
    setPin(point);
    setPinMoved(true);
  };

  // A picked search result sets the pin and the address (the name only if empty).
  const pick = (result: GeocodeResult) => {
    movePin({ latitude: Number(result.latitude), longitude: Number(result.longitude) });
    const set = (field: keyof Values, value: string | null | undefined) =>
      form.setValue(field, value ?? "", { shouldDirty: true });
    set("street", result.street);
    set("postalCode", result.postalCode);
    set("city", result.city);
    set("region", result.region);
    set("country", result.country?.toUpperCase());
    if (!form.getValues("name").trim()) set("name", result.label.split(",")[0]);
  };

  // The place shows up on the merchant's page and map: closing is the
  // confirmation. Only an address that could not be found is said.
  const { submit } = useDialogSubmit(async (data: Values) => {
    const address = {
      name: data.name.trim(),
      street: orNull(data.street),
      postalCode: orNull(data.postalCode),
      city: orNull(data.city),
      country: orNull(data.country)?.toUpperCase() ?? null,
      region: orNull(data.region),
      storeCode: orNull(data.storeCode),
      notes: data.notes.trim(),
      // A pin set on the map wins over looking the address up.
      ...(pin && pinMoved ? { latitude: pin.latitude.toFixed(6), longitude: pin.longitude.toFixed(6) } : {}),
    };
    const saved = await (
      place
        ? update({ variables: { input: { id: place.id, ...address } } }).then((r) => r.data?.updateMerchantLocation.id)
        : create({ variables: { input: { merchant: merchant!, ...address } } }).then((r) => r.data?.createMerchantLocation.id)
    ).catch((e) => Promise.reject(asBankError(e)));
    // A place with an address but no pin is looked up right away; a failed
    // lookup leaves it saved without a pin.
    const addressChanged =
      !place || address.street !== place.street || address.city !== place.city || address.postalCode !== place.postalCode;
    if (saved && !pin && (address.street || address.city) && addressChanged) {
      const found = await geocode({ variables: { id: saved } }).catch(() => null);
      if (found && found.data?.geocodeMerchantLocation.latitude == null) toast.info("Saved, but the address was not found on the map");
    }
  }, { errorTitle: place ? "Couldn't save the place" : "Couldn't add the place" });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{place ? "Edit place" : "Add place"}</DialogTitle>
          <DialogDescription>
            Search an address or click the map to place the pin; the store number links bank lines to it.
          </DialogDescription>
        </DialogHeader>
        <AddressSearch onPick={pick} />
        <Suspense fallback={<div className="h-64 rounded-md border bg-muted" />}>
          <PointPicker value={pin} onChange={movePin} around={around} className="h-64" />
        </Suspense>
        <p className="-mt-2 text-xs text-muted-foreground">
          {pin
            ? `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)} · drag the pin to adjust`
            : "No pin yet: click the map, or leave it and the address is looked up."}
        </p>
        <StringField name="name" label="Name" placeholder="Spar Mariahilfer Straße" />
        <StringField name="street" label="Street" placeholder="Mariahilfer Straße 1" />
        <div className="grid grid-cols-[1fr_2fr_1fr] gap-2">
          <StringField name="postalCode" label="Postal code" />
          <StringField name="city" label="City" />
          <StringField name="country" label="Country" placeholder="AT" />
        </div>
        <StringField name="storeCode" label="Store number" description="The number bank lines carry for this store." />
        <ParagraphField name="notes" label="Notes" placeholder="" />
        <DialogFooter>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : place ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

const EditPlace = ({ id }: { id: string }) => {
  const { data, error } = useGetMerchantLocationQuery({ variables: { id } });
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return <PlaceFields place={data.merchantLocation} />;
};

/**
 * Add a place to `merchant`, or edit place `id`. The pin is picked on the
 * map (or from an address search); without one, the address is looked up.
 */
export const PlaceForm = (props: { id?: string; merchant?: string }) =>
  props.id ? <EditPlace id={props.id} /> : <PlaceFields merchant={props.merchant} />;

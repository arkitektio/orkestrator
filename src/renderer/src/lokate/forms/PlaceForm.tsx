import { useDialog } from "@/core/dialogs/registry";
import type { Point } from "@/core/map/PointPicker";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Slider } from "@/core/ui/slider";
import { lazy, Suspense, useState } from "react";
import {
  GetPlaceDocument,
  ListPlacesDocument,
  PlaceFragment,
  useGetPlaceQuery,
  useGetVisitQuery,
  useSyncPlacesMutation,
} from "../api/graphql";
import { formatDistance } from "../format";

// maplibre loads with the map, not with the dialog registry.
const PointPicker = lazy(() => import("@/core/map/PointPicker"));

const DEFAULT_RADIUS = 75;
const REFETCH = [ListPlacesDocument, GetPlaceDocument];

type PlaceAt = { lat: number; lon: number; radius?: number };

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

const PlaceFields = ({ place, at }: { place?: PlaceFragment; at?: PlaceAt }) => {
  const { closeDialog } = useDialog();
  const [name, setName] = useState(place?.name ?? "");
  const [pin, setPin] = useState<Point | null>(() => {
    const lat = place?.lat ?? at?.lat;
    const lon = place?.lon ?? at?.lon;
    return lat != null && lon != null ? { latitude: lat, longitude: lon } : null;
  });
  const [radius, setRadius] = useState(Math.round(place?.radius ?? at?.radius ?? DEFAULT_RADIUS));
  const [sync, { loading }] = useSyncPlacesMutation({ refetchQueries: REFETCH });
  const ready = name.trim() !== "" && pin != null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || !pin) return;
    try {
      const { data } = await sync({
        variables: {
          deleted: [],
          places: [
            {
              // An edit keeps the phone-minted key; a new place gets its own.
              clientId: place?.clientId ?? crypto.randomUUID(),
              name: name.trim(),
              lat: pin.latitude,
              lon: pin.longitude,
              radius,
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      });
      // Last write wins: a phone's newer edit beats this one and comes back.
      if (data?.syncPlaces.stale.length) toast.info("A phone changed this place more recently; its version was kept");
      else toast.success(place ? "Place saved" : "Place added");
      closeDialog();
    } catch (error) {
      toast.error("Could not save the place: " + errorText(error));
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{place ? "Edit place" : "Add place"}</DialogTitle>
        <DialogDescription>
          Click the map to set the pin and drag it to adjust. Your phones match stays within the radius to this place.
        </DialogDescription>
      </DialogHeader>
      <Suspense fallback={<div className="h-64 rounded-md border bg-muted" />}>
        <PointPicker value={pin} onChange={setPin} className="h-64" />
      </Suspense>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Name</span>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Home" />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="flex justify-between text-muted-foreground">
          Radius <span className="tabular-nums">{formatDistance(radius)}</span>
        </span>
        <Slider min={20} max={500} step={5} value={[radius]} onValueChange={([value]) => setRadius(value)} />
      </label>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
        <Button type="submit" disabled={!ready || loading}>
          {loading ? "Saving..." : place ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
};

const EditPlace = ({ id }: { id: string }) => {
  const { data, error } = useGetPlaceQuery({ variables: { id } });
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return <PlaceFields place={data.place} />;
};

const PlaceFromVisit = ({ visit }: { visit: string }) => {
  const { data, error } = useGetVisitQuery({ variables: { id: visit } });
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { lat, lon, radius } = data.visit;
  return <PlaceFields at={{ lat, lon, radius }} />;
};

/**
 * Add a place, optionally where visit `visit` was; or edit place `id`.
 * Saved through `syncPlaces`, the same last-write-wins merge the phones use.
 */
export const PlaceForm = (props: { id?: string; visit?: string }) =>
  props.id ? <EditPlace id={props.id} /> : props.visit ? <PlaceFromVisit visit={props.visit} /> : <PlaceFields />;

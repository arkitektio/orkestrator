import { useDialog } from "@/core/dialogs/registry";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { useNavigate } from "react-router-dom";
import { ListPlacesDocument, useGetPlaceQuery, useSyncPlacesMutation } from "../api/graphql";

/**
 * Delete a named place everywhere: a tombstone through `syncPlaces`, so the
 * phones drop it too instead of uploading their copy again. Visits stay; they
 * just lose the name.
 */
export const DeletePlaceForm = ({ id }: { id: string }) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const { data } = useGetPlaceQuery({ variables: { id } });
  const [sync, { loading }] = useSyncPlacesMutation({ refetchQueries: [ListPlacesDocument] });
  const place = data?.place;

  const remove = async () => {
    if (!place) return;
    try {
      const { data: result } = await sync({
        variables: { places: [], deleted: [{ clientId: place.clientId, deletedAt: new Date().toISOString() }] },
      });
      if (result?.syncPlaces.stale.length) {
        toast.info("A phone changed this place more recently; it was kept");
      } else {
        toast.success("Place deleted");
        navigate("/lokate/places");
      }
      closeDialog();
    } catch (error) {
      toast.error("Could not delete the place: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Delete {place?.name ?? "this place"}?</DialogTitle>
        <DialogDescription>
          It is removed from all your phones. Visits there are kept, without the name.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
        <Button variant="destructive" disabled={!place || loading} onClick={remove}>
          {loading ? "Deleting..." : "Delete"}
        </Button>
      </DialogFooter>
    </div>
  );
};

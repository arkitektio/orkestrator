import { ListTodo } from "lucide-react";
import { TrackRow, useTodoTracks } from "./TodoTrack";

/**
 * The todo items an object is on, with that object's own status: open the
 * image Tiago was asked to annotate, press Doing, annotate it, press Done.
 * Doing / Done show on the items assigned to you; the others say who they are
 * for. Nothing is shown for an object no todo carries.
 */
export const TodosForObject = ({ identifier, object }: { identifier: string; object: string }) => {
  const tracks = useTodoTracks(identifier, object);
  if (tracks.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <ListTodo className="size-4 text-muted-foreground" />
        Todo
      </h3>
      {tracks.map((track) => (
        <TrackRow key={track.item.id} track={track} />
      ))}
    </section>
  );
};

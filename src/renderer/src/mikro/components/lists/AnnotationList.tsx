import { createList } from "@/components/layout/createList";
import { MikroAnnotation } from "@/linkers";

import { useGetAnnotationsQuery } from "../../api/graphql";
import AnnotationCard from "../cards/AnnotationCard";

/**
 * The browse list. On `GetAnnotations` rather than the renderer's
 * `GetSceneAnnotations`: the card needs its collection and the scene to link
 * to, which the polled scene query deliberately does not select.
 *
 * `autoHide: false` — the factory's default renders nothing for an empty
 * result, which on a filtered page reads as a broken page rather than as
 * filters that excluded everything.
 */
const TList = createList({
  useHook: useGetAnnotationsQuery,
  dataKey: "annotations",
  ItemComponent: AnnotationCard,
  title: "Annotations",
  smart: MikroAnnotation,
  defaultLimit: 30,
  minItemWidth: 220,
  autoHide: false,
  emptyTitle: "No annotations found",
  emptyDescription: "Nothing matches these filters.",
});

export default TList;

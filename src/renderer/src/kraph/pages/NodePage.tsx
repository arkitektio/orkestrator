import { asGraphDetailQueryRoute } from "@/kraph/routes/graphRoutes";
import { useGetNodeQuery } from "../api/graphql";

import EntityPage from "./EntityPage";
import ProtocolEventPage from "./ProtocolEventPage";

/**
 * Dispatches on the claim's kind.
 *
 * `Node` is exactly the three values of `InstanceKind` now — Entity,
 * NaturalEvent, ProtocolEvent. `Structure` and `Metric` used to implement the
 * interface and no longer do: they are rows of other tables, never drawn as
 * vertices, and are read at claim grain instead. So the `"Structure"` branch
 * this had is gone rather than broken.
 */
export default asGraphDetailQueryRoute(useGetNodeQuery, (props) => {
  switch (props.data.node.__typename) {
    case "Entity":
      return <EntityPage />;
    case "ProtocolEvent":
      return <ProtocolEventPage />;
    default:
      // NaturalEvent has no page of its own yet; the linker for it 404s today.
      return <>No page for {props.data.node.__typename} yet</>;
  }
});

import { Shapes } from "lucide-react";
import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { useGetMeshObjectLabelQuery } from "../api/graphql";
import { parseMeshObjectId } from "../components/meshcollection/meshObjectId";

/**
 * `@mikro/meshobject` elsewhere: one mesh of a collection — the object's number
 * and the collection it is in. Its id is `<collection>:<object>`, the rule
 * `MeshObject.id` and its route use.
 */
export const MeshObjectDisplay = (props: DisplayWidgetProps) => {
  const parsed = parseMeshObjectId(props.id);
  const { data } = useGetMeshObjectLabelQuery({
    variables: { collection: parsed?.collection ?? "", object: parsed?.object ?? 0 },
    skip: !parsed,
  });
  const object = data?.meshObject;
  if (!object) return <DisplayLinePlaceholder {...props} icon={Shapes} />;

  return (
    <DisplayLine
      {...props}
      icon={Shapes}
      title={`Object ${object.objectId}`}
      meta={[object.collection.label]}
    />
  );
};

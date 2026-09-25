import { DisplayWidgetProps } from "@/lib/display/registry";
import { MikroScene } from "@/linkers";
import { useGetSceneQuery } from "@/mikro/api/graphql";

export const SceneDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetSceneQuery({
    variables: {
      id: props.object,
    },
    // See ScenePage: a layer whose `asAffine` cannot condense must null that
    // one field, not discard the scene.
    errorPolicy: "all",
  });

  if (!data?.scene) {
    return <div>Scene not found</div>;
  }


  return (
    <MikroScene.DetailLink object={data?.scene}>
      <div className="w-full h-full">
        {data.scene.name}
      </div>
    </MikroScene.DetailLink>
  );
};

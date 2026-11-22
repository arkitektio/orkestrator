import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { MikroScene } from "@/core/linkers";
import { useGetListSceneQuery } from "@/mikro/api/graphql";

export const SceneDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetListSceneQuery({
    variables: {
      id: props.id,
    },
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

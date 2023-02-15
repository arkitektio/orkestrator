import { ParentSize } from "@visx/responsive";
import { ParentSizeProps } from "@visx/responsive/lib/components/ParentSize";

export const SaveParentSize = (props: ParentSizeProps) => {
  return (
    <ParentSize {...props}>
      {(x) => {
        if (x.width === 0 || x.height === 0) return null;
        return props.children(x);
      }}
    </ParentSize>
  );
};

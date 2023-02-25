import { ParentSize } from "@visx/responsive";
import { ParentSizeProps } from "@visx/responsive/lib/components/ParentSize";

export const SaveParentSize = (props: ParentSizeProps) => {
  return (
    <ParentSize {...props}>
      {(x) => {
        if (x.width < 10 || x.width > 2000 || x.height < 10 || x.height > 2000)
          return <>....</>;
        return props.children(x);
      }}
    </ParentSize>
  );
};

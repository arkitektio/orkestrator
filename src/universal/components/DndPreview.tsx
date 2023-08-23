import { Preview } from "react-dnd-multi-backend";

export const DndPreview = (): JSX.Element => {
  return (
    <Preview
      generator={({ item, style }): JSX.Element => {
        return (
          <div
            className="bg-primary-300 rounded-full px-1  text-white text-xs"
            style={{ ...style, top: 0, left: "45px" }}
          ></div>
        );
      }}
    />
  );
};

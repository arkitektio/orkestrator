import { BsCaretLeft, BsCaretRight } from "react-icons/bs";
import { Button } from "./button";

export const ListOffsetter = ({
  offset,
  setOffset,
  step,
  array,
}: {
  offset: number;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  step: number;
  array?: any[] | undefined | null;
}) => (
  <>
    {offset != 0 && (
      <Button
        size={"sm"}
        variant={"ghost"}
        type="button"
        className="hover:text-foreground transition-all"
        onClick={() => setOffset(offset - step > 0 ? offset - step : 0)}
      >
        {" "}
        <BsCaretLeft />{" "}
      </Button>
    )}
    {array && array.length == step && (
      <Button
        size={"sm"}
        variant={"ghost"}
        className="hover:text-foreground transition-all "
        onClick={() => setOffset(offset + step)}
      >
        {" "}
        <BsCaretRight />{" "}
      </Button>
    )}
  </>
);

export const ListTitle = (props: {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <div className="text-xl text-foreground justify-between flex flex-row">
      <div className="flex-grow my-auto font-semibold text-md">{props.children}</div>
      {props.right && <div className="my-auto">{props.right}</div>}
    </div>
  );
};

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
  // The small uppercase label of a home page's blocks (`HomeSectionHeading`:
  // mikro's "Recent data", "Pinned folders"): a list's title is the same kind
  // of thing, so it reads the same wherever a list sits.
  return (
    <div className="mb-2 flex flex-row items-center justify-between gap-2 px-0.5">
      <h2 className="flex min-w-0 flex-grow items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {props.children}
      </h2>
      {props.right && <div className="my-auto shrink-0">{props.right}</div>}
    </div>
  );
};

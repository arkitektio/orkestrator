import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SolvedError, ValidationError } from "../validation/types";

export const SolvedErrorRender = ({ error }: { error: SolvedError }) => {
  return (
    <div className="text-xs">
      {error.message} {error.path}
    </div>
  );
};

export const RemainingErrorRender = ({
  error,
  onClick,
}: {
  error: ValidationError;
  onClick: (error: ValidationError) => void;
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild onClick={() => onClick(error)}>
        <div className="text-xs cursor-pointer hover:text-foreground">
          {error.message}
        </div>
      </TooltipTrigger>
      <TooltipContent side="left">
        <div className="bg-background p-2 rounded-md">
          <div className="text-xs">
            {error.message} {error.path}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ValidationError } from "@/fluss/validation/types";
import { Ban } from "lucide-react";
import { RemainingErrorRender } from "../../ErrorRender";

export const ErrorBox = (props: {
  errors: readonly ValidationError[];
  onClick?: (error: ValidationError) => void;
}) => (
  <Card className="w-full">
    <CardHeader className="flex flex-row py-2">
      <Ban className="text-red-600 my-auto h-8 w-8" />
      <CardContent className="flex flex-col w-full">
        <div className="font-semibold leading-none tracking-tight mb-2 my-auto">Workflow is invalid</div>
        <div className="gap-1 flex flex-col">
          {props.errors.map((e, index) => (
            <RemainingErrorRender key={`${e.type}-${e.id}-${e.path ?? index}`} error={e} onClick={props.onClick ?? (() => {})} />
          ))}
        </div>
      </CardContent>
    </CardHeader>
  </Card>
);

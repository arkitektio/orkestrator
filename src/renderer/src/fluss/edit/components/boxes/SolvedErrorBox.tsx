import { Card, CardContent, CardHeader } from "@/core/ui/card";
import { SolvedError } from "@/fluss/validation/types";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { SolvedErrorRender } from "../../ErrorRender";

export const SolvedErrorBox = (props: { errors: readonly SolvedError[] }) => (
  <Card className="w-full">
    <CardHeader className="flex flex-row py-2">
      <ExclamationTriangleIcon className="text-amber-500 my-auto h-8 w-8" />
      <CardContent className="flex flex-col w-full">
        <div className="font-semibold leading-none tracking-tight mb-2 my-auto">Automatically adjusted</div>
        <div className="gap-1 flex flex-col">
          {props.errors.map((e, index) => (
            <SolvedErrorRender key={`${e.type}-${e.id}-${index}`} error={e} />
          ))}
        </div>
      </CardContent>
    </CardHeader>
  </Card>
);

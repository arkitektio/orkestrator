import { Guard } from "@/app/Arkitekt";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { ArrowRight, PlayIcon } from "lucide-react";
import React from "react";
import {
  ApplicableTalk as ApplicableAlpakaTalk,
} from "./alpaka/talk";
import { describeStructures } from "./describe";
import { ApplicableDefinitions } from "./kabinet/definitions";
import { ApplicableRelations } from "./kraph/relations";
import { ApplicableLocalActions } from "./local/localactions";
import {
  ApplicableActions,
  ApplicableBatchActions,
  ApplicableBatchImplementations,
  ApplicableImplementations,
} from "./rekuest/actions";
import { ApplicableShortcuts } from "./rekuest/shortcuts";
import type { ObjectButtonProps, SmartContextProps } from "./types";

export const ObjectButton = (props: ObjectButtonProps) => {
  return (
    <Popover>
      <PopoverTrigger>
        {props.children || (
          <Button
            variant={props.variant || "outline"}
            className={cn(props.className, "text-foreground")}
            size={props.size || "icon"}
          >
            <PlayIcon />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="text-foreground border-border px-2 py-2 items-left"
        data-nonbreaker
      >
        <SmartContext {...props} />
      </PopoverContent>
    </Popover>
  );
};

/**
 * What the menu is about, when that is not plain from where it opened: a
 * drop ("2 Images → Dataset", as the gesture went) or a selection ("3 Images").
 * One object, right-clicked, needs no telling.
 */
const SmartContextHeader = ({ objects, partners }: SmartContextProps) => {
  const dropped = partners && partners.length > 0;
  if (!dropped && objects.length < 2) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5 px-2 pb-2 pt-1 text-xs font-medium text-foreground">
      {dropped && (
        <>
          <span className="truncate">{describeStructures(partners)}</span>
          <ArrowRight aria-hidden className="h-3 w-3 shrink-0 text-muted-foreground" />
        </>
      )}
      <span className="truncate">{describeStructures(objects)}</span>
    </div>
  );
};

export const SmartContext = (props: SmartContextProps) => {
  const [filter, setFilterValue] = React.useState<string | undefined>(undefined);
  // The raw value drives the input; the children put the filter straight into
  // query variables, so hand them a debounced copy to avoid a request per key.
  const debouncedFilter = useDebounce(filter, 200);

  return (
    <>
      <SmartContextHeader {...props} />

      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search"
          className="h-10 text-sm"
          onValueChange={(value) => {
            setFilterValue(value);
          }}
          autoFocus
        />

        <CommandList className="mt-2">
          <ApplicableLocalActions {...props} filter={debouncedFilter} />
          <CommandEmpty>No Action available</CommandEmpty>
          <Guard.Alpaka unavailable={<></>}>
            <ApplicableAlpakaTalk {...props} filter={debouncedFilter} />
          </Guard.Alpaka>
          <Guard.Rekuest unavailable={<></>}>
            {!props.disableShortcuts && (
              <ApplicableShortcuts {...props} filter={debouncedFilter} />
            )}
          </Guard.Rekuest>

          <Guard.Kraph unavailable={<></>}>
            {!props.disableKraph && (
              <ApplicableRelations {...props} filter={debouncedFilter} />
            )}
          </Guard.Kraph>

          <Guard.Rekuest unavailable={<></>}>
            {!props.disableActions && (
              <ApplicableActions {...props} filter={debouncedFilter} />
            )}
            {!props.disableActions && (
              <ApplicableImplementations {...props} filter={debouncedFilter} />
            )}
            {!props.disableBatchActions && (
              <ApplicableBatchActions {...props} filter={debouncedFilter} />
            )}
            {!props.disableBatchActions && (
              <ApplicableBatchImplementations {...props} filter={debouncedFilter} />
            )}
          </Guard.Rekuest>

          <Guard.Kabinet unavailable={<></>}>
            {!props.disableKabinet && (
              <ApplicableDefinitions {...props} filter={debouncedFilter} />
            )}
          </Guard.Kabinet>
        </CommandList>
      </Command>
    </>
  );
};

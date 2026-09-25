import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/core/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { useImplementationOptionsQuery } from "@/rekuest/api/graphql";
import { useEffect, useState } from "react";

export const AgentSelectionDialog = ({
  dependencyId,
  open,
  onOpenChange,
  onSelect,
}: {
  dependencyId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (implementationId: string) => void;
}) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, loading } = useImplementationOptionsQuery({
    variables: {
      dependency: dependencyId,
      search: debouncedSearch,
    },
    skip: !dependencyId || !open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Agent</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search agents..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && <CommandItem>Loading...</CommandItem>}
            {!loading && data?.options?.length === 0 && (
              <CommandEmpty>No agents found.</CommandEmpty>
            )}
            <CommandGroup>
              {data?.options?.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onSelect(option.value);
                    onOpenChange(false);
                  }}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

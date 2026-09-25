import { GraphQLSearchField } from "@/core/components/fields/GraphQLSearchField";
import { Form, FormControl, FormField, FormItem } from "@/core/components/ui/form";
import { Input } from "@/core/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { useProtocolOptionsLazyQuery } from "@/rekuest/api/graphql";
import { useLatestRef } from "@/core/hooks/useLatestRef";
import { ArrowDown } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

export type SearchValues = { search?: string; protocol?: string };

const DEBOUNCE_MS = 300;

/**
 * The one search box shared by every contextual panel. Emits the debounced
 * search text / protocol; never re-emits an unchanged value, so consumers can
 * key queries on it directly.
 */
export const SearchForm = (props: {
  onSearch: (values: SearchValues) => void;
  className?: string;
}) => {
  const form = useForm<SearchValues>({ defaultValues: { search: "", protocol: undefined } });
  const search = useWatch({ control: form.control, name: "search" });
  const protocol = useWatch({ control: form.control, name: "protocol" });
  const latest = useLatestRef(props.onSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      latest.current({
        search: search?.trim() ? search.trim() : undefined,
        protocol: protocol || undefined,
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, protocol, latest]);

  const [searchProtocol] = useProtocolOptionsLazyQuery();

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className={props.className}>
        <div className="w-full mb-1">
          <Popover>
            <FormField
              control={form.control}
              name="search"
              render={({ field }) => (
                <PopoverAnchor asChild>
                  <FormItem className="h-full w-full relative flex-row flex">
                    <FormControl>
                      <Input
                        placeholder="Search...."
                        autoFocus
                        autoComplete="off"
                        {...field}
                        value={field.value ?? ""}
                        className="flex-grow h-full bg-background text-foreground w-full"
                      />
                    </FormControl>
                    <PopoverTrigger className="absolute right-1 text-foreground text-sm">
                      <ArrowDown className="w-4 h-4" />
                    </PopoverTrigger>
                  </FormItem>
                </PopoverAnchor>
              )}
            />
            <PopoverContent>
              <GraphQLSearchField
                name="protocol"
                label="Protocol"
                searchQuery={searchProtocol}
                placeholder="Filter"
                description="Filter by protocol"
              />
            </PopoverContent>
          </Popover>
        </div>
      </form>
    </Form>
  );
};

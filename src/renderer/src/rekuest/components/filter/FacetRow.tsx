/** One labelled facet in a filter popover. */
export const FacetRow = (props: {
  label: string;
  /** Says what the facet means, on hover of its label. */
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="text-xs font-medium text-muted-foreground" title={props.hint}>
      {props.label}
    </div>
    {props.children}
  </div>
);

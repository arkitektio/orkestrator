import { reportErrorAs } from "@/core/notify";
import { PageAction } from "@/core/ui/page-action";
import { Pin, PinOff } from "lucide-react";
import { usePinMaterializedBlokMutation } from "../api/graphql";
import { PIN_REFETCH } from "../lib/pins";

/**
 * The page action that pins a thing for you: a favourite, listed first and on Home.
 * Bloks are pinned, never templates: a blok is what you open and use.
 */
const PinAction = (props: { pinned: boolean; what: string; onToggle: () => Promise<unknown> }) => (
  <PageAction
    size="sm"
    variant={props.pinned ? "default" : "outline"}
    title={props.pinned ? `Unpin this ${props.what}` : `Pin this ${props.what}: it is listed first, and on Home`}
    onClick={() => {
      props.onToggle().catch(reportErrorAs(props.pinned ? `Couldn't unpin the ${props.what}` : `Couldn't pin the ${props.what}`));
    }}
  >
    {props.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
    {props.pinned ? "Unpin" : "Pin"}
  </PageAction>
);

export const PinMaterializedBlokAction = (props: { materializedBlok: { id: string; pinned: boolean } }) => {
  const [pin] = usePinMaterializedBlokMutation({ refetchQueries: PIN_REFETCH });
  return (
    <PinAction
      pinned={props.materializedBlok.pinned}
      what="blok"
      onToggle={() =>
        pin({ variables: { input: { id: props.materializedBlok.id, pin: !props.materializedBlok.pinned } } })
      }
    />
  );
};

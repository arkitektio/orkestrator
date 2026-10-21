import { useDialog } from "@/core/dialogs/registry";
import { RekuestMaterializedBlok } from "@/core/linkers";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import { OpenableBlokFragment } from "@/rekuest/api/graphql";
import { blokArgsSearch, missingBlokArgs } from "@/rekuest/components/blokArgs";
import { AppWindow } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { buildActionArgs } from "./actions";
import { materializeErrorMessage, resolveRun } from "./materialize";

/**
 * The "Open in…" row: a blok whose args take the selection, opened for it.
 * Its page reads the args from the link, so nothing runs here. A blok that
 * needs more than the selection gives asks for the rest first (the `openblok`
 * dialog, its args' form with the selection prefilled), as an action does.
 */
export const OpenInBlokRow = (props: SmartContextProps & { blok: OpenableBlokFragment }) => {
  const navigate = useNavigate();
  const { openDialog } = useDialog();
  const { blok } = props;
  const [failure, setFailure] = React.useState<string | null>(null);
  const [doing, setDoing] = React.useState(false);

  const open = async () => {
    let run: SmartContextProps = props;
    if (props.materialize) {
      // Opening for an object that is still being made.
      setDoing(true);
      try {
        run = await resolveRun(props);
      } catch (error) {
        setFailure(materializeErrorMessage(error));
        return;
      } finally {
        setDoing(false);
      }
    }
    let args: Record<string, unknown>;
    try {
      args = buildActionArgs({ id: blok.id, args: blok.blok.args }, run);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
      return;
    }
    if (missingBlokArgs(blok.blok.args, args).length > 0) {
      openDialog("openblok", { id: blok.id, args });
      return;
    }
    navigate(`${RekuestMaterializedBlok.linkBuilder(blok.id)}${blokArgsSearch(args)}`);
  };

  return (
    <CommandActionRow
      onSelect={() => void open()}
      value={`blok-${blok.id}`}
      title={blok.name || blok.blok.name}
      description={blok.description || blok.blok.description || (blok.declaredBy ? `by ${blok.declaredBy.name}` : undefined)}
      icon={AppWindow}
      running={doing}
      failure={failure ? { title: "Could not open", detail: failure } : null}
      // It opens all the same: what it shows comes from the agent, which is not there to answer.
      unavailable={blok.declaredBy && !blok.declaredBy.connected ? { reason: `${blok.declaredBy.name} is offline` } : null}
    />
  );
};

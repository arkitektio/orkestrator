import { RekuestMaterializedBlok } from "@/core/linkers";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import { OpenableBlokFragment } from "@/rekuest/api/graphql";
import { blokArgsSearch } from "@/rekuest/components/blokArgs";
import { AppWindow } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { buildActionArgs } from "./actions";

/**
 * The "Open in…" row: a blok whose args take the selection, opened for it.
 * Its page reads the args from the link, so nothing runs here; a blok that
 * needs more than the selection gives asks for the rest itself.
 */
export const OpenInBlokRow = (props: SmartContextProps & { blok: OpenableBlokFragment }) => {
  const navigate = useNavigate();
  const { blok, objects, partners } = props;
  const [failure, setFailure] = React.useState<string | null>(null);

  const open = React.useCallback(() => {
    let args: Record<string, unknown>;
    try {
      args = buildActionArgs({ id: blok.id, args: blok.blok.args }, { ...props, objects, partners });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
      return;
    }
    navigate(`${RekuestMaterializedBlok.linkBuilder(blok.id)}${blokArgsSearch(args)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blok, navigate, objects, partners]);

  return (
    <CommandActionRow
      onSelect={open}
      value={`blok-${blok.id}`}
      title={blok.name || blok.blok.name}
      description={blok.description || blok.blok.description || (blok.declaredBy ? `by ${blok.declaredBy.name}` : undefined)}
      icon={AppWindow}
      failure={failure ? { title: "Could not open", detail: failure } : null}
      // It opens all the same: what it shows comes from the agent, which is not there to answer.
      unavailable={blok.declaredBy && !blok.declaredBy.connected ? { reason: `${blok.declaredBy.name} is offline` } : null}
    />
  );
};

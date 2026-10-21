import { useDialog } from "@/core/dialogs/registry";
import { RekuestMaterializedBlok } from "@/core/linkers";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { useMaterializedBlokQuery } from "@/rekuest/api/graphql";
import { BlokArgsForm } from "@/rekuest/components/BlokArgsForm";
import { blokArgsSearch, type BlokArgs } from "@/rekuest/components/blokArgs";
import { useNavigate } from "react-router-dom";

/**
 * "Open in…" for a blok the selection does not fill: what the selection gave
 * is prefilled (`args`), the rest is asked for with the blok's args' form,
 * then the blok opens on its page for all of it.
 */
export const OpenBlokDialog = (props: { id: string; args: BlokArgs }) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const { data, error, refetch } = useMaterializedBlokQuery({ variables: { id: props.id } });

  if (error) return <QueryError error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  const materializedBlok = data.materializedBlok;
  return (
    <BlokArgsForm
      layout="dialog"
      name={materializedBlok.name || materializedBlok.blok.name}
      ports={materializedBlok.blok.args}
      args={props.args}
      hidden={props.args}
      onOpen={(args) => {
        closeDialog();
        navigate(`${RekuestMaterializedBlok.linkBuilder(materializedBlok.id)}${blokArgsSearch(args)}`);
      }}
    />
  );
};

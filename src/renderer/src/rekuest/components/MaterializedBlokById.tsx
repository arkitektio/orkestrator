import * as React from 'react';
import {Link} from 'react-router-dom';
import {RekuestMaterializedBlok} from '@/core/linkers';
import {MaterializedBlokFragment, useMaterializedBlokQuery} from '@/rekuest/api/graphql';
import {BlokArgsForm} from './BlokArgsForm';
import {missingBlokArgs, type BlokArgs} from './blokArgs';
import MaterializedBlokRenderer from './MaterializedBlokRenderer';

type MaterializedBlokByIdProps = Omit<
  React.ComponentProps<typeof MaterializedBlokRenderer>,
  'materializedBlok'
> & {
  materializedBlokId?: string | null;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
};

export const MaterializedBlokById = (
  props: MaterializedBlokByIdProps,
) => {
  const {
    materializedBlokId,
    loadingFallback,
    errorFallback,
    emptyFallback,
    ...rendererProps
  } = props;

  const {data, loading, error} = useMaterializedBlokQuery({
    variables: {id: materializedBlokId ?? ''},
    skip: !materializedBlokId,
  });

  if (!materializedBlokId) {
    return <>{emptyFallback ?? null}</>;
  }

  if (loading && !data?.materializedBlok) {
    return <>{loadingFallback ?? null}</>;
  }

  if (error) {
    return <>{errorFallback ?? null}</>;
  }

  if (!data?.materializedBlok) {
    return <>{emptyFallback ?? null}</>;
  }

  return <OpenedMaterializedBlok {...rendererProps} materializedBlok={data.materializedBlok} />;
};

/**
 * A blok opened for an item needs the item: asked for with its args' form
 * when it is shown on its own (an agent's default panel), pointed to its page
 * inside a card, where there is no room for a form.
 */
const OpenedMaterializedBlok = (
  props: Omit<React.ComponentProps<typeof MaterializedBlokRenderer>, 'materializedBlok'> & {
    materializedBlok: MaterializedBlokFragment;
  },
) => {
  const {materializedBlok, args: given, onArgsChange, ...rendererProps} = props;
  const [own, setOwn] = React.useState<BlokArgs>(given ?? {});
  const args = given ?? own;
  const setArgs = onArgsChange ?? setOwn;
  const ports = materializedBlok.blok.args;
  const [asking, setAsking] = React.useState(() => missingBlokArgs(ports, args).length > 0);

  if (asking && rendererProps.embedded) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        Opens for {ports.map(port => port.key).join(', ')}:{' '}
        <Link className="underline" to={RekuestMaterializedBlok.linkBuilder(materializedBlok.id)}>
          choose one
        </Link>
        .
      </div>
    );
  }

  if (asking) {
    return (
      <BlokArgsForm
        name={materializedBlok.name || materializedBlok.blok.name}
        ports={ports}
        args={args}
        onOpen={next => {
          setArgs(next);
          setAsking(false);
        }}
      />
    );
  }

  return <MaterializedBlokRenderer {...rendererProps} materializedBlok={materializedBlok} args={args} onArgsChange={setArgs} />;
};

export default MaterializedBlokById;

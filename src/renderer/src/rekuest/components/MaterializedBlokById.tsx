import * as React from 'react';
import {useMaterializedBlokQuery} from '@/rekuest/api/graphql';
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

  return (
    <MaterializedBlokRenderer
      {...rendererProps}
      materializedBlok={data.materializedBlok}
    />
  );
};

export default MaterializedBlokById;

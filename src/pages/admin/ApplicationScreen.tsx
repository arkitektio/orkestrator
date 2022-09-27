import React from "react";
import { useParams } from "react-router";
import { Application } from "../../man/components/Application";

export type IAppProps = {};

const ApplicationScreen: React.FC<IAppProps> = () => {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) return <></>;
  return (
    <>
      <Application clientId={clientId} />
    </>
  );
};

export { ApplicationScreen };

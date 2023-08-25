import { useDatalayer } from "@jhnnsrs/datalayer";
import { withLok } from "../LokContext";
import { useAppQuery } from "../api/graphql";

export const AppImage: React.FC<{
  identifier: string;
  className?: string;
}> = ({ identifier, ...props }) => {
  const { data, error } = withLok(useAppQuery)({
    variables: { identifier },
  });

  const { s3resolve } = useDatalayer();

  return (
    <img
      src={
        data?.app?.logo
          ? s3resolve(data?.app.logo)
          : `https://eu.ui-avatars.com/api/?name=${data?.app?.identifier}&background=random`
      }
      {...props}
    />
  );
};

import { useMikro } from "../../mikro/MikroContext";
import { useAppQuery } from "../api/graphql";
import { withLok } from "../LokContext";

export const AppImage: React.FC<{
  identifier: string;
  className?: string;
}> = ({ identifier, ...props }) => {
  const { data, error } = withLok(useAppQuery)({
    variables: { identifier },
  });

  const { s3resolve } = useMikro();

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

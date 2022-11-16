import { HTMLAttributes, ImgHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { App, User } from "../../linker";
import { useMikro } from "../../mikro/MikroContext";
import { useAppQuery, useUserQuery } from "../api/graphql";
import { withMan } from "../man";

export const AppImage: React.FC<{
  version: string;
  identifier: string;
  className?: string;
}> = ({ version, identifier, ...props }) => {
  const { data, error } = withMan(useAppQuery)({
    variables: { identifier, version },
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

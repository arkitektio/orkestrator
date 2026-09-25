import { Arkitekt } from "@/app/Arkitekt";
import React from "react";

type ImageWithAuthProps = {
  id: string;
};

const apiUrlFromImageID = (id: string, fakts: any) => {
  return `${fakts.omero_ark.endpoint_url.replace(
    "/graphql",
    "",
  )}/api/thumbnails/${id}`;
};

const AuthorizedImage: React.FC<ImageWithAuthProps> = (props) => {
  const fakts = Arkitekt.useFakts();
  const token = Arkitekt.useToken();

  // Components refs
  const img: React.Ref<HTMLImageElement> = React.createRef();

  // Load data
  React.useEffect(() => {
    if (!props.id) return;
    if (!token) return;
    if (img.current === null) return;
    let objectURL: string | undefined;
    let cancelled = false;
    fetch(apiUrlFromImageID(props.id, fakts), {
      headers: {
        Accept: "image/jpeg",
        Authorization: "Bearer " + token,
      },
    })
      .then((res) => res.blob())
      .then((res) => {
        if (cancelled) return;
        objectURL = URL.createObjectURL(res);
        if (img.current) img.current.src = objectURL;
      });
    // Revoke the blob URL on unmount / id change, otherwise it leaks per image.
    return () => {
      cancelled = true;
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [fakts, props.id, token]);

  return <img src={""} alt={"Loading..."} ref={img} />;
};

export default AuthorizedImage;

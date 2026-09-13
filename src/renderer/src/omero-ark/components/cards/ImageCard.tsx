import { Arkitekt } from "@/app/Arkitekt";
import { Card } from "@/components/ui/card";
import { OmeroArkImage } from "@/linkers";
import { aliasToHttpPath } from "@/lib/arkitekt/alias/helpers";

import { ListOmeroImageFragment } from "@/omero-ark/api/graphql";
import React from "react";

interface Props {
  image: ListOmeroImageFragment;

}

const apiUrlFromImageID = (id: string, baseUrl: string) => {
  //TODO: CURRENTLY NOT FUNCTIONAL
  return `${baseUrl.replace(
    "/graphql",
    "",
  )}/api/thumbnails/${id}`;
};

const TCard = ({ image }: Props) => {
  const token = Arkitekt.useToken();
  const omeroArk = Arkitekt.useService("omero_ark");

  // Components refs
  const ref: React.Ref<HTMLImageElement> = React.createRef();

  // Load data
  React.useEffect(() => {
    if (!image.id) return;
    if (!token) return;
    if (ref.current === null) return;
    if (!omeroArk.alias) return;
    const baseUrl = aliasToHttpPath(omeroArk.alias, "");
    let objectURL: string | undefined;
    let cancelled = false;
    fetch(apiUrlFromImageID(image.id, baseUrl), {
      headers: {
        Accept: "image/jpeg",
        Authorization: "Bearer " + token,
      },
    })
      .then((res) => res.blob())
      .then((res) => {
        if (cancelled) return;
        objectURL = URL.createObjectURL(res);
        if (ref.current === null) return;
        ref.current.style.background = "url('" + objectURL + "')";
        ref.current.style.backgroundSize = "cover";
        ref.current.style.backgroundPosition = "center";
      });
    // Revoke the blob URL on unmount / id change, otherwise it leaks per card.
    return () => {
      cancelled = true;
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [image.id, omeroArk.alias, token]);

  return (
    <OmeroArkImage.Smart
      object={image}
    >
      <Card
        className="px-2 py-2 h-40 w-full top-0 left-0 bg-opacity-20 bg-black  rounded rounded-xl"
        ref={ref}
      >
        <OmeroArkImage.DetailLink
          className={({ isActive } /*  */) =>
            "z-10 font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={image}
        >
          {image?.name}
        </OmeroArkImage.DetailLink>
        {image.description}
      </Card>
    </OmeroArkImage.Smart>
  );
};

export default React.memo(TCard);
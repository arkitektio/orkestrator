import { Dialog } from "@headlessui/react";
import { x } from "@tauri-apps/api/path-e12e0e34";
import { ParentSize } from "@visx/responsive";
import Konva from "konva";
import React, { useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Stage } from "react-konva";
import { useNavigate } from "react-router";
import { RoiLabel } from "../../components/ThumbnailCanvas";
import { notEmpty } from "../../floating/utils";
import { SaveParentSize } from "../../layout/SaveParentSize";
import { Roi } from "../../linker";
import {
  DetailRepresentationDocument,
  DetailRepresentationFragment,
  RepresentationVariety,
  RoiType,
  RoiTypeInput,
  useCreate_RoiMutation,
  useCreate_ThumbnailMutation,
} from "../../mikro/api/graphql";
import { useMikro, withMikro } from "../../mikro/MikroContext";
import { useSettings } from "../../settings/settings-context";
import { useXarray } from "../provider/context";
import {
  AvailableColormap,
  XArrayProvider,
  available_color_maps,
} from "../provider/provider";
import { Listbox } from "@headlessui/react";
import {
  BsCloudUpload,
  BsDownload,
  BsFillSquareFill,
  BsSquare,
} from "react-icons/bs";
import { C } from "@tauri-apps/api/event-2a9960e7";

export interface TwoDProps {
  representation: DetailRepresentationFragment;
  colormap?: AvailableColormap;
  withRois?: boolean;
  follow?: "width" | "height";
}

let canvaswidth = 700;
let canvasheight = 700;

const people = [
  { id: 1, name: "Durward Reynolds", unavailable: false },
  { id: 2, name: "Kenton Towne", unavailable: false },
  { id: 3, name: "Therese Wunsch", unavailable: false },
  { id: 4, name: "Benedict Kessler", unavailable: true },
  { id: 5, name: "Katelyn Rohan", unavailable: false },
];

export const ColorMapSelect = (props: {
  onChange: (colormap: AvailableColormap) => void;
  colormap: AvailableColormap;
}) => {
  return (
    <Listbox value={props.colormap} onChange={props.onChange}>
      <Listbox.Button className={"hover:bg-gray-700 rounded px-2"}>
        {props.colormap}
      </Listbox.Button>
      <Listbox.Options className={"grid grid-cols-3 rounded p-2 bg-gray-900"}>
        {available_color_maps.map((c, index) => (
          <Listbox.Option
            key={index}
            value={c}
            className="hover:bg-gray-700 rounded cursor-pointer"
          >
            {c}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </Listbox>
  );
};

export const Canvas: React.FC<{
  width: number;
  height: number;
  path: string;
  z: number;
  withRois?: boolean;
  representation: DetailRepresentationFragment;
  colormap: AvailableColormap;
}> = ({ width, height, z, colormap, path, representation, withRois }) => {
  const [uploadImage] = withMikro(useCreate_ThumbnailMutation)({
    refetchQueries(result) {
      return [
        {
          query: DetailRepresentationDocument,
          variables: { id: representation.id },
        },
      ];
    },
  });
  const layerRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageBitmap | null>(null);
  const [activeColormap, setColormap] = useState<AvailableColormap>(colormap);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [currentZ, setCurrentZ] = useState(z);
  const [currentC, setCurrentC] = useState(0);
  const [currentT, setCurrentT] = useState(0);
  const [labeling, setLabeling] = useState(false);
  const [label, setActiveLabel] = useState<string | undefined>(undefined);
  let zdims = representation.shape?.at(2) || 0;
  let tdims = representation.shape?.at(1) || 0;
  let cdims = representation.shape?.at(0) || 0;
  const { getSelectionAsImageData } = useXarray();

  const renderImage = async (
    c: number,
    t: number,
    z: number,
    path: string,
    colormap: AvailableColormap
  ) => {
    setLoading(true);
    try {
      let image = await getSelectionAsImageData(
        path,
        [c, t, z, ":", ":"],
        colormap
      );

      let bitmap = await createImageBitmap(image);
      setImageData((image) => bitmap);
      setLoading(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const download = async () => {
    if (layerRef.current) {
      let canvas = layerRef.current;
      let data = canvas.toDataURL("image/png");
      var link = document.createElement("a");
      link.download = "download.png";
      link.href = data;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const render = async () => {
    if (layerRef.current) {
      let canvas = layerRef.current;
      let data = canvas.toDataURL("image/png");
      let blob = await fetch(data).then((res) => res.blob());
      var file = new File([blob], "image.png");
      uploadImage({
        variables: {
          file: file,
          rep: representation.id,
        },
      });
    }
  };

  useEffect(() => {
    console.log("Loading image slice...");
    renderImage(currentC, currentT, currentZ, path, activeColormap);
  }, [path, activeColormap, currentC, currentT, currentZ]);

  useEffect(() => {
    if (layerRef.current && imageData) {
      let ctx = layerRef?.current?.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.drawImage(
        imageData,
        0,
        0,
        imageData.width,
        imageData.height,
        0,
        0,
        width,
        height
      );
      setLoading(false);
      setError(undefined);
    }
  }, [layerRef.current, imageData, height, width]);

  return (
    <>
      <div
        className={`absolute top-0 left-0 bg-gray-900 ${
          loading || error ? "opacity-100" : "opacity-0"
        } animate-opacity ease-in-out duration-300 z-2 flex items-center justify-center text-white `}
        style={{ width: width, height: height }}
      >
        {error ? (
          <div className="ring-2 ring-primary-300 ring-inset p-3 rounded rounded-lg">
            {error}
          </div>
        ) : (
          <div className="ring-2 ring-primary-300 ring-inset p-3 rounded rounded-lg">
            Loading
          </div>
        )}
      </div>

      <canvas
        id="c"
        width={width}
        height={height}
        ref={layerRef}
        className="absolute top-0 left-0"
      ></canvas>
      <div
        className={`absolute top-0 left-0 bg-gradient-to-b from-black to-transparent h-10 0 z-10 flex flex-row gap-2 group-hover:block hidden text-white opacity-100`}
        style={{ width: width }}
      >
        <div className="flex flex-row px-2">
          <div className="font-light flex-initial mr-2">Colormap:</div>
          <div className="font-light flex-1">
            <ColorMapSelect colormap={activeColormap} onChange={setColormap} />
          </div>
          {zdims > 1 && (
            <div className="flex-initial ml-2 group flex flex-row">
              z: {currentZ}
              <button
                className="ml-2  hover:bg-gray-700 text-white font-bold  px-2 rounded group-hover:block hidden"
                onClick={() => {
                  setCurrentZ((z) => (z - 1 <= 0 ? -1 : z - 1));
                }}
              >
                -
              </button>
              <button
                className=" hover:bg-gray-700 text-white font-bold px-2 rounded group-hover:block hidden"
                onClick={() => {
                  setCurrentZ((z) => (z + 1 > zdims - 1 ? 0 : z + 1));
                }}
              >
                +
              </button>
            </div>
          )}
          {tdims > 1 && (
            <div className="flex-initial ml-2 group flex flex-row">
              t: {currentT}
              <button
                className="ml-2  hover:bg-gray-700 text-white font-bold  px-2 rounded group-hover:block hidden"
                onClick={() => {
                  setCurrentT((t) => (t - 1 <= 0 ? -1 : z - 1));
                }}
              >
                -
              </button>
              <button
                className=" hover:bg-gray-700 text-white font-bold px-2 rounded group-hover:block hidden"
                onClick={() => {
                  setCurrentT((t) => (t + 1 > tdims - 1 ? 0 : z + 1));
                }}
              >
                +
              </button>
            </div>
          )}
          {cdims > 1 && (
            <div className="flex-initial ml-2 group flex flex-row">
              c: {currentC}
              <button
                className="ml-2  hover:bg-gray-700 text-white font-bold  px-2 rounded group-hover:block hidden"
                onClick={() => {
                  setCurrentC((c) => (c - 1 <= 0 ? -1 : c - 1));
                }}
              >
                -
              </button>
              <button
                className=" hover:bg-gray-700 text-white font-bold px-2 rounded group-hover:block hidden"
                onClick={() => {
                  setCurrentC((c) => (c + 1 > cdims - 1 ? 0 : c + 1));
                }}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        className={`absolute bottom-0 right-0 bg-gradient-to-t pb-1 from-black to- z-10 flex flex-row gap-2 group-hover:block hidden text-white opacity-100`}
        style={{ width: width }}
      >
        <div className="flex flex-row px-2 mb-1">
          <div className="flex-initial group flex flex-row">
            {withRois && (
              <button
                className="  text-white font-bold px-2"
                onClick={() => {
                  setLabeling(!labeling);
                }}
              >
                {labeling ? <BsFillSquareFill /> : <BsSquare />}
              </button>
            )}
            {withRois && labeling && (
              <>
                <div className="font-light flex-initial mr-2">Label:</div>
                <div className="font-light flex-1">
                  <input
                    type="text"
                    className="bg-gray-800 text-white rounded px-2"
                    value={label}
                    onChange={(e) => setActiveLabel(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex-grow"></div>
          <button
            className=" hover:bg-gray-700 text-white font-bold px-2 rounded"
            onClick={() => download()}
          >
            <BsDownload />
          </button>
          <button
            className=" hover:bg-gray-700 text-white font-bold px-2 rounded"
            onClick={() => render()}
          >
            <BsCloudUpload />
          </button>
        </div>
      </div>
      {withRois && (
        <RoiCanvas
          label={label}
          labeling={labeling}
          z={currentZ}
          c={currentC}
          t={currentT}
          width={width}
          height={height}
          representation={representation}
        />
      )}
    </>
  );
};

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const RoiCanvas = ({
  width,
  height,
  z,
  c,
  t,
  labeling = false,
  label,
  representation,
}: {
  width: number;
  height: number;
  z?: number;
  c?: number;
  t?: number;
  labeling?: boolean;
  label?: string;
  representation: DetailRepresentationFragment;
}) => {
  const [newAnnotation, setNewAnnotation] = useState<BoundingBox[]>([]);
  const [createRoi] = withMikro(useCreate_RoiMutation)({
    refetchQueries(result) {
      return [
        {
          query: DetailRepresentationDocument,
          variables: { id: representation.id },
        },
      ];
    },
  });

  let rectangles =
    representation.rois?.filter(
      (r) =>
        r?.type === RoiType.Rectangle &&
        r.vectors?.at(0)?.z == z &&
        r.vectors?.at(0)?.c == c &&
        r.vectors?.at(0)?.t == t
    ) ?? [];

  const translate = (
    x: number | null | undefined,
    y: number | null | undefined
  ) => {
    return [
      ((x || 0) / (representation.shape?.at(4) || 1)) * height,
      ((y || 0) / (representation.shape?.at(3) || 1)) * width,
    ];
  };

  const reverseTranslate = (
    x: number | null | undefined,
    y: number | null | undefined
  ) => {
    return [
      ((x || 0) / height) * (representation.shape?.at(4) || 1),
      ((y || 0) / width) * (representation.shape?.at(3) || 1),
    ];
  };

  const handleMouseDown = (event: any) => {
    if (newAnnotation.length === 0 && labeling) {
      const { x, y } = event.target.getStage().getPointerPosition();
      setNewAnnotation([{ x, y, width: 0, height: 0 }]);
    }
  };

  const handleMouseUp = (event: any) => {
    if (newAnnotation.length === 1 && labeling) {
      const sx = newAnnotation[0].x;
      const sy = newAnnotation[0].y;
      const { x, y } = event.target.getStage().getPointerPosition();
      const annotationToAdd = {
        x: sx,
        y: sy,
        width: x - sx,
        height: y - sy,
      };

      const constantDims = {
        z: z,
        c: c,
        t: t,
      };
      createRoi({
        variables: {
          type: RoiTypeInput.Rectangle,
          vectors: [
            {
              x: reverseTranslate(annotationToAdd.x, annotationToAdd.y)[0],
              y: reverseTranslate(annotationToAdd.x, annotationToAdd.y)[1],
              ...constantDims,
            },
            {
              x: reverseTranslate(
                annotationToAdd.x + annotationToAdd.width,
                annotationToAdd.y
              )[0],
              y: reverseTranslate(
                annotationToAdd.x + annotationToAdd.width,
                annotationToAdd.y
              )[1],
              ...constantDims,
            },
            {
              x: reverseTranslate(
                annotationToAdd.x + annotationToAdd.width,
                annotationToAdd.y + annotationToAdd.height
              )[0],
              y: reverseTranslate(
                annotationToAdd.x + annotationToAdd.width,
                annotationToAdd.y + annotationToAdd.height
              )[1],
              ...constantDims,
            },
            {
              x: reverseTranslate(
                annotationToAdd.x,
                annotationToAdd.y + annotationToAdd.height
              )[0],
              y: reverseTranslate(
                annotationToAdd.x,
                annotationToAdd.y + annotationToAdd.height
              )[1],
              ...constantDims,
            },
          ],
          representation: representation.id,
          label: label,
        },
      });
      setNewAnnotation([]);
    }
  };

  const handleMouseMove = (event: any) => {
    if (newAnnotation.length === 1 && labeling) {
      const sx = newAnnotation[0].x;
      const sy = newAnnotation[0].y;
      const { x, y } = event.target.getStage().getPointerPosition();
      setNewAnnotation([
        {
          x: sx,
          y: sy,
          width: x - sx,
          height: y - sy,
        },
      ]);
    }
  };

  const navigate = useNavigate();

  return (
    <Stage
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      width={width}
      height={height}
      className="absolute top-0 left-0 z-4 "
    >
      <Layer>
        {rectangles.filter(notEmpty).map((r, index) => {
          let vectors = r?.vectors?.map((v) => translate(v?.x, v?.y)) ?? [
            [0, 0],
          ];
          return (
            <Line
              points={vectors.flat()}
              closed={true}
              key={index}
              stroke="white"
              onMouseDown={(e) => {
                console.log(e);
                navigate(Roi.linkBuilder(r.id));
              }}
              strokeWidth={4}
            />
          );
        })}
        {newAnnotation.map((value, index) => {
          return (
            <Rect
              key={index}
              x={value.x}
              y={value.y}
              width={value.width}
              height={value.height}
              fill="transparent"
              stroke="black"
            />
          );
        })}
      </Layer>
    </Stage>
  );
};

export const TwoDOffcanvas = ({
  representation,
  colormap,
  withRois,
  follow = "width",
}: TwoDProps) => {
  const { s3resolve } = useMikro();
  const [z, setZ] = useState(
    representation.shape ? Math.floor(representation.shape[2] / 2) : 0
  );

  const scroll = (e: React.WheelEvent<HTMLDivElement>) => {
    setZ((curr) => {
      if (representation.shape && curr == representation.shape[2]) {
        return curr;
      } else if (curr == 0) {
        return 0;
      } else if (e.deltaY > 0) {
        return curr - 1;
      } else {
        return curr + 1;
      }
    });
  };

  const { settings } = useSettings();

  let colorm: AvailableColormap =
    colormap || representation.variety == RepresentationVariety.Mask
      ? settings.defaultMaskColormap
      : settings.defaultColormap;

  const aspectRatio =
    (representation?.shape &&
      representation?.shape[3] / representation?.shape[4]) ||
    1;

  return (
    <SaveParentSize debounceTime={800}>
      {({ width, height }) => {
        let bwidth = follow == "width" ? width : height * aspectRatio;
        let bheight = follow == "width" ? width / aspectRatio : height;

        return (
          <div
            className="relative group"
            style={{ height: bheight, width: bwidth }}
          >
            <Canvas
              withRois={withRois}
              representation={representation}
              z={z}
              width={bwidth}
              height={bheight}
              colormap={colorm}
              path={s3resolve("/" + representation.store)}
            />
          </div>
        );
      }}
    </SaveParentSize>
  );
};

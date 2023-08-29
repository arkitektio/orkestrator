import { Listbox } from "@headlessui/react";
import { useDatalayer } from "@jhnnsrs/datalayer";
import cn from "classnames";
import React, { useEffect, useRef, useState } from "react";
import {
  BsCloudUpload,
  BsDownload,
  BsFillSquareFill,
  BsSquare,
} from "react-icons/bs";
import { Circle, Layer, Line, Rect, Stage } from "react-konva";
import { useNavigate } from "react-router";
import ReactSlider from "react-slider";
import { useDebounce } from "use-debounce";
import { notEmpty } from "../../../floating/utils";
import { SaveParentSize } from "../../../layout/SaveParentSize";
import {
  MikroChannel,
  MikroPosition,
  MikroRoi,
  MikroTimepoint,
} from "../../../linker";
import { ImageView, useXarray } from "../../../providers/xarray/context";
import {
  AvailableColormap,
  XArrayProvider,
  available_color_maps,
} from "../../../providers/xarray/provider";
import { dtypeToMinMax } from "../../../providers/xarray/utils";
import { useSettings } from "../../../settings/settings-context";
import { withMikro } from "../../MikroContext";
import {
  CanvasRepresentationFragment,
  DetailRepresentationDocument,
  RepresentationVariety,
  RoiType,
  RoiTypeInput,
  useActivesViewForRepresentationLazyQuery,
  useCreate_RoiMutation,
  useCreate_ThumbnailMutation,
} from "../../api/graphql";
export interface TwoDProps {
  representation: CanvasRepresentationFragment;
  colormap?: AvailableColormap;
  withRois?: boolean;
  highlightRois?: string[];
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
  highlightRois?: string[];
  z: number;
  withRois?: boolean;
  representation: CanvasRepresentationFragment;
  colormap: AvailableColormap;
}> = ({
  width,
  height,
  z,
  colormap,
  path,
  representation,
  withRois,
  highlightRois,
}) => {
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

  const [getViews, { data: views }] = withMikro(
    useActivesViewForRepresentationLazyQuery
  )();

  const layerRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageBitmap | null>(null);
  const [activeColormap, setColormap] = useState<AvailableColormap>(colormap);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [currentZ, setCurrentZ] = useState(z);
  const [currentC, setCurrentC] = useState(0);
  const [currentT, setCurrentT] = useState(0);
  const [debouncedT] = useDebounce(currentT, 100);
  const [debouncedZ] = useDebounce(currentZ, 100);
  const [debouncedC] = useDebounce(currentC, 100);
  const [auto, setAuto] = useState(true);
  const [clims, setClims] = useState<{
    cmin: number | undefined;
    cmax: number | undefined;
  }>({ cmin: undefined, cmax: undefined });
  const [debouncedClims] = useDebounce(clims, 100);
  const [labeling, setLabeling] = useState(false);
  const [imageView, setImageView] = useState<ImageView | undefined>();
  const [label, setActiveLabel] = useState<string | undefined>(undefined);
  let zdims = representation.shape?.at(2) || 0;
  let tdims = representation.shape?.at(1) || 0;
  let cdims = representation.shape?.at(0) || 0;
  const { getSelectionAsImageView, renderImageView } = useXarray();

  const downloadImage = async (
    c: number,
    t: number,
    z: number,
    path: string
  ) => {
    setLoading(true);
    try {
      let imageView = await getSelectionAsImageView(path, [c, t, z, ":", ":"]);
      setImageView((image) => imageView);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    }
  };

  const renderImage = async (
    imageView: ImageView,
    colormap: AvailableColormap,
    cmin?: number,
    cmax?: number
  ) => {
    setLoading(true);
    try {
      let image = await renderImageView(imageView, colormap, cmin, cmax);
      let bitmap = await createImageBitmap(image);
      setImageData((image) => bitmap);
      setLoading(false);
    } catch (e) {
      console.error(e);
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

  const scroll = (e: React.WheelEvent<HTMLDivElement>) => {
    setCurrentZ((curr) => {
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

  useEffect(() => {
    if (imageView && !auto) {
      renderImage(
        imageView,
        activeColormap,
        debouncedClims.cmin,
        debouncedClims.cmax
      );
    } else if (imageView) {
      renderImage(imageView, activeColormap);
    }
  }, [imageView, activeColormap, debouncedClims, auto]);

  useEffect(() => {
    console.log("Loading image slice...");
    downloadImage(debouncedC, debouncedT, debouncedZ, path);
  }, [path, debouncedC, debouncedT, debouncedZ]);

  useEffect(() => {
    console.log("Loading image slice...");
    getViews({
      variables: {
        representation: representation.id,
        c: debouncedC,
        t: debouncedT,
        z: debouncedZ,
      },
    }).catch((e) => console.log(e));
  }, [path, debouncedC, debouncedT, debouncedZ]);

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
    <div
      className="relative group"
      style={{ height: height, width: width }}
      onWheel={scroll}
    >
      <div
        className={`absolute top-0 left-0 bg-gray-900 ${
          loading || error ? "opacity-100" : "opacity-0"
        } animate-opacity ease-in-out duration-500 z-2 flex items-center justify-center text-white `}
        style={{ width: width, height: height }}
      >
        {error && (
          <div className="ring-2 ring-primary-300 ring-inset p-3 rounded rounded-lg">
            {error}
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
          <div className="font-light flex-initial">
            <ColorMapSelect colormap={activeColormap} onChange={setColormap} />
          </div>
          <div className="font-light flex-1 flex flex-row flex-row-reverse">
            <button
              className="ml-2  hover:bg-gray-700 text-white font-bold  px-2 rounded group-hover:block hidden"
              onClick={() => setAuto(!auto)}
            >
              {auto ? "<" : ">"}
            </button>
            {!auto && imageView && (
              <ReactSlider
                className="w-full flex-grow"
                defaultValue={[imageView.min, imageView.max]}
                ariaLabel={["Lower thumb", "Upper thumb"]}
                ariaValuetext={(state) => `Thumb value ${state.valueNow}`}
                renderThumb={(props, state) => (
                  <div {...props} className="">
                    {state.valueNow}
                  </div>
                )}
                renderTrack={(props, state) => {
                  //check if there are multiple values
                  const points = Array.isArray(state.value)
                    ? state.value.length
                    : null;
                  const isMulti = points && points > 0;
                  const isLast = isMulti
                    ? state.index === points
                    : state.index === 1;
                  const isFirst = state.index === 0;
                  return (
                    <div
                      {...props}
                      className={cn({
                        //use 1/4 height or width depending on the orientation and make sure to center it.
                        "h-1/4 top-1/2 -translate-y-1/2": true,
                        "rounded-full": true,
                        "bg-gray-200": isMulti ? isFirst || isLast : isLast,
                        "bg-indigo-500": isMulti
                          ? !isFirst || !isLast
                          : isFirst,
                      })}
                    ></div>
                  );
                }}
                pearling
                onChange={(values) => {
                  setClims({ cmin: values[0], cmax: values[1] });
                }}
                min={dtypeToMinMax(imageView.dtype)[0]}
                max={dtypeToMinMax(imageView.dtype)[1]}
                minDistance={10}
              />
            )}
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
                  setCurrentT((t) => (t - 1 <= 0 ? -1 : t - 1));
                }}
              >
                -
              </button>
              <button
                className=" hover:bg-gray-700 text-white font-bold px-2 rounded group-hover:block hidden"
                onClick={() => {
                  setCurrentT((t) => (t + 1 > tdims - 1 ? 0 : t + 1));
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
          highlightRois={highlightRois}
        />
      )}
      {views?.views && views.views.length > 0 && (
        <div className="absolute top-10 left-0 z-10 flex flex-col gap-2 group-hover:block hidden text-white opacity-100 flex flex-row">
          {views?.views?.filter(notEmpty).map((view) => {
            return (
              <div
                key={view.id}
                className=" pb-1 from-black to- z-10 flex flex-row gap-2 group-hover:block hidden text-white opacity-100"
                style={{ width: width }}
              >
                <div className="flex flex-row px-2 mb-1">
                  <div className="flex-initial group flex flex-row">
                    {view.channel && (
                      <MikroChannel.DetailLink object={view.channel.id}>
                        C: {view.channel.name}
                      </MikroChannel.DetailLink>
                    )}
                    {view.timepoint && (
                      <MikroTimepoint.DetailLink object={view.timepoint.id}>
                        T: {view.timepoint.name}
                      </MikroTimepoint.DetailLink>
                    )}
                    {view.position && (
                      <MikroPosition.DetailLink object={view.position.id}>
                        P: {view.position.name}
                      </MikroPosition.DetailLink>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
  highlightRois,
  labeling = false,
  label,
  representation,
}: {
  width: number;
  height: number;
  z?: number;
  c?: number;
  t?: number;
  highlightRois?: string[];
  labeling?: boolean;
  label?: string;
  representation: CanvasRepresentationFragment;
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

  let points =
    representation.rois?.filter(
      (r) =>
        r?.type === RoiType.Point &&
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
          let highlight = highlightRois?.includes(r.id ?? "");

          return (
            <Line
              points={vectors.flat()}
              closed={true}
              key={index}
              stroke={highlight ? "red" : "white"}
              onMouseDown={(e) => {
                console.log(e);
                navigate(MikroRoi.linkBuilder(r.id));
              }}
              strokeWidth={highlight ? 4 : 2}
            />
          );
        })}
        {points.filter(notEmpty).map((r, index) => {
          let vectors = r?.vectors?.map((v) => translate(v?.x, v?.y)) ?? [
            [0, 0],
          ];
          let highlight = highlightRois?.includes(r.id ?? "");

          return (
            <Circle
              x={vectors[0][0]}
              y={vectors[0][1]}
              radius={5}
              closed={true}
              key={index}
              stroke={highlight ? "red" : "white"}
              onMouseDown={(e) => {
                console.log(e);
                navigate(MikroRoi.linkBuilder(r.id));
              }}
              strokeWidth={highlight ? 4 : 2}
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
  highlightRois,
  follow = "width",
}: TwoDProps) => {
  const { s3resolve } = useDatalayer();
  const [z, setZ] = useState(
    representation.shape ? Math.floor(representation.shape[2] / 2) : 0
  );

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
    <XArrayProvider>
      <SaveParentSize debounceTime={800}>
        {({ width, height }) => {
          let bwidth = follow == "width" ? width : height * aspectRatio;
          let bheight = follow == "width" ? width / aspectRatio : height;

          return (
            <Canvas
              withRois={withRois}
              representation={representation}
              highlightRois={highlightRois}
              z={z}
              width={bwidth}
              height={bheight}
              colormap={colorm}
              path={s3resolve("/" + representation.store)}
            />
          );
        }}
      </SaveParentSize>
    </XArrayProvider>
  );
};

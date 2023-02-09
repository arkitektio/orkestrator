import { Dialog } from "@headlessui/react";
import { ParentSize } from "@visx/responsive";
import Konva from "konva";
import React, { useEffect, useRef, useState } from "react";
import { Rect } from "react-konva";
import { DetailRepresentationFragment } from "../../mikro/api/graphql";
import { useMikro } from "../../mikro/MikroContext";
import { useXarray } from "../provider/context";
import { XArrayProvider } from "../provider/provider";

export interface TwoDProps {
  representation: DetailRepresentationFragment;
}

class ColoredRect extends React.Component {
  state = {
    color: "green",
  };
  handleClick = () => {
    this.setState({
      color: Konva.Util.getRandomColor(),
    });
  };
  render() {
    return (
      <Rect
        x={20}
        y={20}
        width={50}
        height={50}
        fill={this.state.color}
        shadowBlur={5}
        onClick={this.handleClick}
      />
    );
  }
}
let canvaswidth = 700;
let canvasheight = 700;

export const Canvas: React.FC<{ width: number; height: number; z: number }> = ({
  width,
  height,
  z,
}) => {
  const layerRef = useRef<HTMLCanvasElement>(null);
  const [currentZ, setCurrentZ] = useState(Math.floor(z / 2));

  let x = useXarray();

  useEffect(() => {
    if (layerRef.current) {
      x.getSelection([0, 0, currentZ, ":", ":"]).then(async (data) => {
        let flattend = data.flatten();

        let min = 0;
        let max = 0;

        let imgwidth = data.shape[0];
        let imgheight = data.shape[1];

        console.log(imgheight, imgwidth, height, width);

        for (var i = 0; i < imgwidth * imgheight; i++) {
          if (flattend[i] < min) {
            min = flattend[i];
          }
          if (flattend[i] > max) {
            max = flattend[i];
          }
        }

        if (layerRef.current) {
          console.log("hmmm");
          let ctx = layerRef.current.getContext("2d");
          if (ctx) {
            var iData = ctx.createImageData(imgwidth, imgheight);

            let z = 0;
            for (let i = 0; i < imgheight; i++) {
              for (let j = 0; j < imgwidth; j++) {
                iData.data[z] = 0;
                iData.data[z + 1] = ((data.get([j, i]) as number) * 255) / max;
                iData.data[z + 2] = 0;
                iData.data[z + 3] = 255;
                z += 4;
              }
            }

            let imageBitmap = await createImageBitmap(iData);

            var hRatio = width / imgwidth;
            var vRatio = height / imgheight;
            var ratio = Math.min(hRatio, vRatio);

            ctx.drawImage(
              imageBitmap,
              0,
              0,
              imgwidth,
              imgheight,
              0,
              0,
              width,
              height
            );
          }
        }
      });
    }
  }, [layerRef.current, currentZ, width, height]);

  const scroll = (e: React.WheelEvent<HTMLCanvasElement>) => {
    console.log("scroll", e);

    setCurrentZ((curr) => {
      if (curr == z) {
        return z;
      }
      if (curr == 0) {
        return 0;
      } else if (e.deltaY > 0) {
        return curr - 1;
      } else {
        return curr + 1;
      }
    });
    e.preventDefault();

    e.stopPropagation();

    return false;
  };

  return (
    <>
      <canvas
        id="c"
        width={width}
        height={height}
        ref={layerRef}
        onWheel={(e) => scroll(e)}
      ></canvas>
      ;
    </>
  );
};

export const TwoD = ({ representation }: TwoDProps) => {
  const { s3resolve } = useMikro();

  const aspectRatio =
    representation?.shape &&
    representation?.shape[3] / representation?.shape[4];

  return (
    <div className="w-full h-full">
      <XArrayProvider path={s3resolve("/" + representation.store)}>
        <ParentSize debounceTime={800}>
          {({ width, height }) => (
            <Canvas
              z={representation.shape ? representation.shape[2] : 0}
              width={width}
              height={width * (aspectRatio || width)}
            />
          )}
        </ParentSize>
      </XArrayProvider>
    </div>
  );
};

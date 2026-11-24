import * as React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useTracks } from "@livekit/components-react";
import { Track, type RemoteVideoTrack, type Room } from "livekit-client";

import { asStructure } from "@arkitektio/bsx/renderer/bloks/shared/index";
import { useSceneNotice } from "@arkitektio/bsx/renderer/bloks/scene/context";
import { useBlok, useValue, type BlokRenderArgs } from "@arkitektio/bsx/renderer/runtime/index";
import { MountGroup, useMountReady } from "@/core/blok/mount/MountGroup";
import type { MountFrame } from "@/core/blok/mount/frame";
import { StreamKind, useGetStreamQuery, type VideoFormatFragment } from "@/lovekit/api/graphql";
import { useAgentRoom, useWatchedTrack } from "@/lovekit/agentRoom";
import { useConnector } from "@/lovekit/components/StreamView";

import { lovekitVideoSchema } from "./index";

/** Where a frame's pixels are: the row and column axes, their step and their origin. */
type PixelGrid = { frame: MountFrame; row: { scale: number; offset: number }; column: { scale: number; offset: number } };

/**
 * The first two SPACE axes of a video format are its rows and columns, as an
 * image's are (y, x). An axis with no calibration steps one per pixel.
 */
export const pixelGridOf = (format: VideoFormatFragment | null | undefined): PixelGrid | null => {
  const spatial = (format?.axes ?? []).filter((axis) => axis.type === "SPACE");
  if (!format || spatial.length < 2) return null;
  const step = (name: string) => format.calibration.find((calibration) => calibration.axis === name);
  const [rowAxis, columnAxis] = spatial;
  const row = step(rowAxis.name);
  const column = step(columnAxis.name);
  return {
    frame: {
      reference: format.reference,
      axes: [
        { name: rowAxis.name, type: "SPACE", unit: row?.unit ?? null },
        { name: columnAxis.name, type: "SPACE", unit: column?.unit ?? null },
      ],
    },
    row: { scale: row?.scale ?? 1, offset: row?.offset ?? 0 },
    column: { scale: column?.scale ?? 1, offset: column?.offset ?? 0 },
  };
};

/**
 * A quad for a `width × height` frame: pixel (row, column) at
 * (offset + column · step, offset + row · step), the first row at v = 0 (the
 * texture is not flipped), as a mikro image layer of the same grid lies.
 */
const quadFor = (grid: PixelGrid, width: number, height: number): THREE.BufferGeometry => {
  const x0 = grid.column.offset;
  const y0 = grid.row.offset;
  const x1 = x0 + width * grid.column.scale;
  const y1 = y0 + height * grid.row.scale;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0], 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeBoundingSphere();
  return geometry;
};

/**
 * A `<video>` the track plays into, for the texture to read. It sits over the
 * canvas, full size and transparent: LiveKit's adaptive stream pauses a track
 * whose element is hidden or has no size.
 */
const useTrackVideo = (track: RemoteVideoTrack | undefined): HTMLVideoElement | null => {
  const host = useThree((state) => state.gl.domElement.parentElement);
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null);
  React.useEffect(() => {
    if (!track || !host) return;
    const element = document.createElement("video");
    element.muted = true;
    element.playsInline = true;
    element.autoplay = true;
    Object.assign(element.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      opacity: "0",
      pointerEvents: "none",
    });
    host.appendChild(element);
    track.attach(element);
    setVideo(element);
    return () => {
      track.detach(element);
      element.remove();
      setVideo(null);
    };
  }, [track, host]);
  return video;
};

const VideoQuad = ({ video, grid, opacity }: { video: HTMLVideoElement; grid: PixelGrid; opacity: number }) => {
  const texture = React.useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [video]);
  React.useEffect(() => () => texture.dispose(), [texture]);

  const [size, setSize] = React.useState({ width: video.videoWidth, height: video.videoHeight });
  React.useEffect(() => {
    // The publisher remakes its track when its frame size changes.
    const read = () => setSize({ width: video.videoWidth, height: video.videoHeight });
    video.addEventListener("loadedmetadata", read);
    video.addEventListener("resize", read);
    return () => {
      video.removeEventListener("loadedmetadata", read);
      video.removeEventListener("resize", read);
    };
  }, [video]);

  const geometry = React.useMemo(
    () => (size.width > 0 && size.height > 0 ? quadFor(grid, size.width, size.height) : null),
    [grid, size.width, size.height],
  );
  React.useEffect(() => () => geometry?.dispose(), [geometry]);
  useMountReady(geometry !== null);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
};

/** The stream's track in its agent's joined room, drawn on the quad once it plays. */
const RoomVideo = ({ room, streamKey, grid, opacity }: { room: Room; streamKey: string; grid: PixelGrid; opacity: number }) => {
  const tracks = useTracks([Track.Source.Camera], { room, onlySubscribed: true });
  const reference = tracks.find((candidate) => candidate.publication?.trackName === streamKey);
  const video = useTrackVideo(reference?.publication?.track as RemoteVideoTrack | undefined);
  return video ? <VideoQuad video={video} grid={grid} opacity={opacity} /> : null;
};

export const LovekitVideoRender = ({ component }: BlokRenderArgs) => {
  const blok = useBlok(component, lovekitVideoSchema);
  const value = asStructure(useValue(blok.value));
  const transform = useValue(blok.transform);
  const output = useValue(blok.output);
  const opacity = useValue(blok.opacity) ?? 1;
  const { data, error } = useGetStreamQuery({ variables: { id: String(value?.object ?? "") }, skip: !value });
  const stream = data?.stream;
  const grid = React.useMemo(() => pixelGridOf(stream?.videoFormat), [stream?.videoFormat]);

  const connector = useConnector();
  const room = useAgentRoom(stream?.agent.id, stream ? connector : undefined);
  useWatchedTrack(stream?.agent.id, stream?.key);

  const problem = !value
    ? null
    : error
      ? `The stream could not be loaded: ${error.message}`
      : stream && stream.kind !== StreamKind.Video
        ? `${stream.title} is no video stream.`
        : stream && !grid
          ? `${stream.title} declares no pixel axes (videoFormat with two SPACE axes): it cannot be placed.`
          : null;
  useSceneNotice(problem ? "A video mount cannot be drawn" : null, problem ?? undefined);

  if (!stream || !grid) return null;
  return (
    <MountGroup id={component.id} frame={grid.frame} transform={transform} output={output}>
      {room?.room ? <RoomVideo room={room.room} streamKey={stream.key} grid={grid} opacity={opacity} /> : null}
    </MountGroup>
  );
};

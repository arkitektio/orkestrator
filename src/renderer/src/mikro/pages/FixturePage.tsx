import { Bounds, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import type * as THREE from "three";

import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { MikroFixture } from "@/core/linkers";
import { ErrorNote } from "@/core/ui/error-note";
import { useMikro } from "@/mikro/api/funcs";
import { getMikroKulisseUrl } from "@/mikro/datalayer/mikroAccess";

import { useGetFixtureQuery, type DetailFixtureFragment } from "../api/graphql";
import CoordinateGraphView from "../components/coordinates/CoordinateGraphView";
import { cloneForView } from "../lib/fixtures/glass";
import { acquireGltf, releaseGltf } from "../lib/fixtures/gltfCache";
import { MIKRO_HELP } from "../help";
import { wholeLensContexts } from "../lenses";

/** "24 × 24 × 0.17 mm": the box the file declares, in the model's own unit. */
const sizeOf = (model: DetailFixtureFragment): string | null => {
  const box = model.bounds as { min?: number[]; max?: number[] } | null;
  if (!box?.min || !box?.max) return null;
  const unit = model.coordinateSystem.axes[0]?.unit;
  const sizes = box.max.map((high, axis) => Number((high - box.min![axis]).toPrecision(3)));
  return `${sizes.join(" × ")}${unit ? ` ${unit}` : ""}`;
};

/**
 * The model on its own, in its own units: a preview to turn around, not a
 * placement. Where it sits relative to the sample is a registration, and
 * shows in a scene.
 *
 * Draws its own copy of the file's materials (`cloneForView`), with
 * transmissive glass drawn as blended glass: this canvas is transparent too,
 * so real transmission would have nothing behind it to refract and draw dark.
 */
const FixturePreview = ({ model }: { model: DetailFixtureFragment }) => {
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();
  const [root, setRoot] = useState<THREE.Object3D | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!datalayer) return;
    let cancelled = false;
    let dispose = () => {};
    const key = model.store.id;
    acquireGltf(key, () => getMikroKulisseUrl(model.store, client, datalayer))
      .then((gltf) => {
        if (cancelled) return;
        const view = cloneForView(gltf.scene);
        dispose = view.dispose;
        setRoot(view.root);
      })
      .catch((next) => {
        if (!cancelled) setError(next);
      });
    return () => {
      cancelled = true;
      dispose();
      setRoot(null);
      releaseGltf(key);
    };
  }, [model.store, client, datalayer]);

  if (error) return <ErrorNote error={error} title="Couldn't load the model" className="m-4" />;

  return (
    <Canvas camera={{ fov: 35 }} className="h-full w-full">
      <ambientLight intensity={0.6} />
      <directionalLight position={[1, 2, 3]} intensity={1.6} />
      <directionalLight position={[-2, -1, -1]} intensity={0.5} />
      {root && (
        <Bounds fit clip observe margin={1.3}>
          <primitive object={root} />
        </Bounds>
      )}
      <OrbitControls makeDefault />
    </Canvas>
  );
};

const FixtureInfo = ({ model }: { model: DetailFixtureFragment }) => {
  const size = sizeOf(model);
  const rows: [string, string | null | undefined][] = [
    ["File", model.store.originalFileName],
    ["Size", size],
    ["Axes", model.coordinateSystem.axes.map((axis) => `${axis.name} (${axis.unit ?? "no unit"})`).join(", ")],
    ["Folder", model.folder?.name],
    ["Registered", new Date(model.createdAt).toLocaleString()],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 text-sm">
      {rows
        .filter(([, value]) => !!value)
        .map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
    </dl>
  );
};

export const FixturePage = asDetailQueryRoute(useGetFixtureQuery, ({ data }) => {
  const model = data.fixture;
  // Its whole lens, offered in the ⌘K palette beside the model itself.
  const wholeLensId = model.fullLens?.id;
  const related = useMemo(
    () => wholeLensContexts("FixtureLens", wholeLensId ? { id: wholeLensId } : null),
    [wholeLensId],
  );

  return (
    <MikroFixture.ModelPage
      object={model}
      help={MIKRO_HELP.fixture}
      title={model.label}
      related={related}
      actions={<MikroFixture.Actions object={model} />}
      pageActions={<MikroFixture.ObjectButton alwaysShow object={model} />}
      additionalSidebars={
        <>
          <Sidebars.Tab label="Info">
            <FixtureInfo model={model} />
          </Sidebars.Tab>
          {/* The model's own space and the edges out of it: where it is
              registered, which is what places it in a scene. */}
          <Sidebars.Tab label="Space">
            <div className="h-full w-full">
              <CoordinateGraphView coordinateSystem={model.coordinateSystem.id} />
            </div>
          </Sidebars.Tab>
        </>
      }
      defaultSidebar="Info"
      sidebarKey="FixtureDetail"
    >
      <div className="h-full w-full">
        <FixturePreview model={model} />
      </div>
    </MikroFixture.ModelPage>
  );
});

export default FixturePage;

import CheckoutMaterializedBlokRenderer from "@/rekuest/components/CheckoutMaterializedBlokRenderer";
import { WithMediaUrl } from "@/rekuest/datalayer/rekuestAccess";
import {
  Center,
  Environment,
  Grid,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Matrix4, Vector3, type Group } from "three";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  type MediaStore,
  type SpaceFragment,
  type SpacePlacementFragment,
} from "../api/graphql";

type SpaceViewScenePanel = {
  id: string;
  kind: "materialized-blok";
  placementId: string;
};

type SpaceViewSceneState = {
  spaceId: string;
  placements: SpacePlacementFragment[];
  selectedPlacementId: string | null;
  openPanels: SpaceViewScenePanel[];
  viewProjectionMatrix: Matrix4 | null;
  viewportSize: { width: number; height: number };
  updateCameraData: (matrix: Matrix4, size: { width: number; height: number }) => void;
  selectPlacement: (id: string | null) => void;
  openPlacementPanel: (placementId: string) => void;
  closePanel: (panelId: string) => void;
  clearPanels: () => void;
};

type SpaceViewSceneStore = StoreApi<SpaceViewSceneState>;

const SpaceViewSceneContext = React.createContext<SpaceViewSceneStore | null>(null);

const createSpaceViewSceneStore = (
  spaceId: string,
  placements: SpaceFragment["placements"],
): SpaceViewSceneStore => {
  return createStore<SpaceViewSceneState>((set) => ({
    spaceId,
    placements,
    selectedPlacementId: null,
    openPanels: [],
    viewProjectionMatrix: null,
    viewportSize: { width: 0, height: 0 },
    updateCameraData: (matrix, size) => set({ viewProjectionMatrix: matrix, viewportSize: size }),
    selectPlacement: (id) => set({ selectedPlacementId: id }),
    openPlacementPanel: (placementId) =>
      set((state) => {
        const panelId = `materialized-blok:${placementId}`;

        return {
          openPanels: [
            ...state.openPanels.filter((panel) => panel.id !== panelId),
            {
              id: panelId,
              kind: "materialized-blok",
              placementId,
            },
          ],
        };
      }),
    closePanel: (panelId) =>
      set((state) => ({
        openPanels: state.openPanels.filter((panel) => panel.id !== panelId),
      })),
    clearPanels: () => set({ openPanels: [] }),
  }));
};

const useSpaceViewScene = <T,>(selector: (state: SpaceViewSceneState) => T): T => {
  const store = useContext(SpaceViewSceneContext);

  if (!store) {
    throw new Error("useSpaceViewScene must be used within a SpaceViewSceneProvider");
  }

  return useStore(store, selector);
};

const MembershipModel = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);

  return (
    <Center>
      <primitive object={scene.clone()} />
    </Center>
  );
};

const FallbackBox = () => (
  <>
    <boxGeometry args={[0.6, 0.6, 0.6]} />
    <meshStandardMaterial color="#6366f1" />
  </>
);

const ViewPlacement = ({ placement }: { placement: SpacePlacementFragment }) => {
  const meshRef = useRef<Group>(null!);
  const selectedId = useSpaceViewScene((state) => state.selectedPlacementId);
  const selectPlacement = useSpaceViewScene((state) => state.selectPlacement);
  const openPlacementPanel = useSpaceViewScene((state) => state.openPlacementPanel);
  const isSelected = selectedId === placement.id;

  useEffect(() => {
    if (!meshRef.current) {
      return;
    }

    const flat = placement.affineMatrix.flat() as number[];
    const matrix = new Matrix4().fromArray(flat).transpose();

    meshRef.current.matrix.copy(matrix);
    meshRef.current.matrix.decompose(
      meshRef.current.position,
      meshRef.current.quaternion,
      meshRef.current.scale,
    );
    meshRef.current.matrixAutoUpdate = true;
    meshRef.current.updateMatrixWorld(true);
  }, [placement.affineMatrix, placement.id]);

  return (
    <group
      ref={meshRef}
      onClick={(event) => {
        event.stopPropagation();
        selectPlacement(placement.id);
        openPlacementPanel(placement.id);
      }}
    >
      {placement.model?.file ? (
        <WithMediaUrl media={placement.model.file as unknown as MediaStore}>
          {(url: string) => <MembershipModel url={url} />}
        </WithMediaUrl>
      ) : (
        <mesh castShadow>
          <FallbackBox />
        </mesh>
      )}

      <Html
        position={[0, placement.model?.file ? 1.2 : 0.8, 0]}
        center
        distanceFactor={6}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
          <div className="font-medium">{placement.name}</div>
          <div className="text-white/60">{placement.agent.id}</div>
        </div>
      </Html>

      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const DEFAULT_PANEL_SIZE = {
  width: 280,
  height: 180,
};

const ViewMaterializedBlokPanel = ({ panelId, placementId }: { panelId: string; placementId: string }) => {
  const placements = useSpaceViewScene((state) => state.placements);
  const viewProjectionMatrix = useSpaceViewScene((state) => state.viewProjectionMatrix);
  const viewportSize = useSpaceViewScene((state) => state.viewportSize);
  const closePanel = useSpaceViewScene((state) => state.closePanel);
  const selectPlacement = useSpaceViewScene((state) => state.selectPlacement);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelSize, setPanelSize] = useState(DEFAULT_PANEL_SIZE);

  const placement = placements.find((item) => item.id === placementId);
  const materializedBlokId = placement?.blok?.id;

  useEffect(() => {
    const node = panelRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const nextWidth = Math.ceil(entry.contentRect.width);
      const nextHeight = Math.ceil(entry.contentRect.height);

      setPanelSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current;
        }

        return {
          width: nextWidth,
          height: nextHeight,
        };
      });
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [materializedBlokId]);

  const screenPosition = useMemo(() => {
    if (!placement || !viewProjectionMatrix || viewportSize.width === 0 || viewportSize.height === 0) {
      return null;
    }

    const affine = placement.affineMatrix as number[][] | null | undefined;
    if (!affine || affine.length < 4) {
      return null;
    }

    const matrix = new Matrix4();
    matrix.set(
      affine[0][0],
      affine[0][1],
      affine[0][2],
      affine[0][3],
      affine[1][0],
      affine[1][1],
      affine[1][2],
      affine[1][3],
      affine[2][0],
      affine[2][1],
      affine[2][2],
      affine[2][3],
      affine[3][0],
      affine[3][1],
      affine[3][2],
      affine[3][3],
    );

    const world = new Vector3();
    world.setFromMatrixPosition(matrix);
    world.applyMatrix4(viewProjectionMatrix);

    if (world.z < -1 || world.z > 1) {
      return null;
    }

    const anchorX = (world.x * 0.5 + 0.5) * viewportSize.width;
    const anchorY = (world.y * -0.5 + 0.5) * viewportSize.height;

    return {
      left: clamp(anchorX + 24, 16, viewportSize.width - panelSize.width - 16),
      top: clamp(anchorY - panelSize.height / 2, 16, viewportSize.height - panelSize.height - 16),
    };
  }, [panelSize.height, panelSize.width, placement, viewProjectionMatrix, viewportSize.height, viewportSize.width]);

  if (!placement || !screenPosition) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className="absolute z-20 pointer-events-auto"
      style={{
        left: screenPosition.left,
        top: screenPosition.top,
        maxWidth: Math.max(220, Math.min(560, viewportSize.width - 32)),
        maxHeight: Math.max(120, viewportSize.height - 32),
      }}
    >
      <button
        className="absolute right-3 top-3 z-10 rounded-full border border-border/70 bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm transition hover:text-foreground"
        onClick={() => {
          closePanel(panelId);
          selectPlacement(null);
        }}
        type="button"
      >
        Close
      </button>

      <div className="max-h-full max-w-full">
        <CheckoutMaterializedBlokRenderer
          materializedBlokId={materializedBlokId}
          chrome="minimal"
          sizing="intrinsic"
          surfaceId={materializedBlokId ?? placementId}
          loadingFallback={(
            <div className="flex min-h-24 min-w-56 items-center justify-center rounded-xl border border-border/50 bg-background/90 px-4 py-6 text-sm text-muted-foreground shadow-sm">
              Loading panel preview...
            </div>
          )}
          errorFallback={(
            <div className="flex min-h-24 min-w-56 items-center justify-center rounded-xl border border-destructive/40 bg-background/95 px-4 py-6 text-center text-sm text-destructive shadow-sm">
              Failed to load the materialized blok preview.
            </div>
          )}
          emptyFallback={(
            <div className="flex min-h-24 min-w-56 items-center justify-center rounded-xl border border-border/50 bg-background/90 px-4 py-6 text-center text-sm text-muted-foreground shadow-sm">
              This placement does not have a materialized blok preview yet.
            </div>
          )}
        />
      </div>
    </div>
  );
};

const SpaceViewMaterializedBlokPanels = () => {
  const openPanels = useSpaceViewScene((state) => state.openPanels);

  if (openPanels.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {openPanels.map((panel) => (
        <ViewMaterializedBlokPanel
          key={panel.id}
          panelId={panel.id}
          placementId={panel.placementId}
        />
      ))}
    </div>
  );
};

const SpaceViewCameraMatrixSync = ({ debounceMs = 80 }: { debounceMs?: number }) => {
  const updateCameraData = useSpaceViewScene((state) => state.updateCameraData);
  const matrixRef = useRef(new Matrix4());
  const previousRef = useRef(new Matrix4());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  useFrame(({ camera, size }) => {
    camera.updateProjectionMatrix();
    matrixRef.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    const current = matrixRef.current.elements;
    const previous = previousRef.current.elements;
    let changed = false;

    for (let index = 0; index < 16; index += 1) {
      if (Math.abs(current[index] - previous[index]) > 0.00001) {
        changed = true;
        break;
      }
    }

    if (!changed) {
      return;
    }

    previousRef.current.copy(matrixRef.current);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const snapshot = matrixRef.current.clone();
    const nextSize = { width: size.width, height: size.height };
    timerRef.current = setTimeout(() => {
      updateCameraData(snapshot, nextSize);
    }, debounceMs);
  });

  return null;
};

const SpaceViewSceneContent = () => {
  const placements = useSpaceViewScene((state) => state.placements);
  const clearPanels = useSpaceViewScene((state) => state.clearPanels);
  const selectPlacement = useSpaceViewScene((state) => state.selectPlacement);

  return (
    <>
      <color attach="background" args={["#0a0a0f"]} />
      <fog attach="fog" args={["#0a0a0f", 12, 28]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 10, 5]} intensity={1.8} color="#fff8e7" />
      <directionalLight position={[-5, 3, -4]} intensity={0.5} color="#93c5fd" />
      <spotLight position={[0, 12, 0]} intensity={12} angle={0.4} penumbra={0.8} color="#818cf8" />

      <Grid
        infiniteGrid
        fadeDistance={20}
        fadeStrength={3}
        cellSize={1}
        sectionSize={5}
        cellColor="#1e1e2e"
        sectionColor="#2e2e4e"
        cellThickness={0.5}
        sectionThickness={1}
        position={[0, -0.01, 0]}
      />

      {placements.map((placement) => (
        <ViewPlacement key={placement.id} placement={placement} />
      ))}

      <mesh
        position={[0, -0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={() => {
          selectPlacement(null);
          clearPanels();
        }}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
      </mesh>

      <Environment preset="city" />
      <SpaceViewCameraMatrixSync />
      <OrbitControls
        enablePan
        enableZoom
        makeDefault
        maxPolarAngle={Math.PI / 2.05}
        minDistance={2}
        maxDistance={20}
      />
    </>
  );
};

export const SpaceViewSceneProvider = ({
  space,
  children,
}: {
  space: SpaceFragment;
  children: React.ReactNode;
}) => {
  const [store] = useState<SpaceViewSceneStore>(() => createSpaceViewSceneStore(space.id, space.placements));

  return <SpaceViewSceneContext.Provider value={store}>{children}</SpaceViewSceneContext.Provider>;
};

export const SpaceViewScene = () => {
  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Space Scene</div>
        <div className="flex-1" />
      </div>

      <div className="relative flex-1">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [4, 4, 8], fov: 45 }}
          frameloop="demand"
          className="!absolute inset-0"
        >
          <SpaceViewSceneContent />
        </Canvas>
        <SpaceViewMaterializedBlokPanels />
      </div>
    </div>
  );
};

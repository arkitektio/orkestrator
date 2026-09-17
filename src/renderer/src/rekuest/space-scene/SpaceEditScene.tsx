import CheckoutMaterializedBlokRenderer from "@/rekuest/components/CheckoutMaterializedBlokRenderer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WithMediaUrl } from "@/lib/datalayer/rekuestAccess";
import { useSmartDrop } from "@/providers/smart/hooks";
import type { Structure } from "@/types";
import {
  Center,
  Environment,
  Grid,
  Html,
  OrbitControls,
  TransformControls,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Group, Matrix4, Vector3 } from "three";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  type MediaStore,
  type SpaceFragment,
  type SpacePlacementFragment,
  useCreatePlacementMutation,
  useListMaterializedBloksQuery,
  useThreeDModelOptionsQuery,
  useUpdatePlacementMutation,
} from "../api/graphql";

type SpaceEditScenePanel = {
  id: string;
  kind: "materialized-blok";
  placementId: string;
};

type SpaceEditSceneState = {
  spaceId: string;
  placements: SpacePlacementFragment[];
  selectedPlacementId: string | null;
  openPanels: SpaceEditScenePanel[];
  viewProjectionMatrix: Matrix4 | null;
  viewportSize: { width: number; height: number };
  updateCameraData: (matrix: Matrix4, size: { width: number; height: number }) => void;
  setPlacements: (placements: SpacePlacementFragment[]) => void;
  addPlacement: (placement: SpacePlacementFragment) => void;
  selectPlacement: (id: string | null) => void;
  openPlacementPanel: (placementId: string) => void;
  closePanel: (panelId: string) => void;
  clearPanels: () => void;
};

type SpaceEditSceneStore = StoreApi<SpaceEditSceneState>;

const SpaceEditSceneContext = React.createContext<SpaceEditSceneStore | null>(null);

const IDENTITY_AFFINE_MATRIX = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

type DroppedAgent = {
  id: string;
  name?: string | null;
};

type CreatePlacementDropContext = {
  agentId: string;
  agentName: string;
};

type PlacementDialogOption = {
  id: string;
  label: string;
  description?: string | null;
};

const isDroppedAgent = (
  structure: Structure,
): structure is Structure & { object: DroppedAgent } => {
  return structure.identifier === "@rekuest/agent" && typeof structure.object?.id === "string";
};

const useDebouncedString = (value: string, delayMs = 250) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
};

const PlacementDialogOptionPicker = ({
  label,
  inputId,
  placeholder,
  search,
  onSearchChange,
  selectedOption,
  options,
  loading,
  emptyText,
  onSelect,
  onClear,
}: {
  label: string;
  inputId: string;
  placeholder: string;
  search: string;
  onSearchChange: (value: string) => void;
  selectedOption: PlacementDialogOption | null;
  options: PlacementDialogOption[];
  loading: boolean;
  emptyText: string;
  onSelect: (option: PlacementDialogOption) => void;
  onClear: () => void;
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        {selectedOption && (
          <Button type="button" variant="ghost" size="xs" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>

      <Input
        id={inputId}
        placeholder={placeholder}
        value={search}
        onChange={(event) => {
          onSearchChange(event.target.value);
        }}
      />

      <div className="overflow-hidden rounded-md border border-border/70">
        {selectedOption && (
          <div className="border-b border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <span className="font-medium text-foreground">Selected:</span>{" "}
            <span className="text-muted-foreground">{selectedOption.label}</span>
          </div>
        )}

        <div className="max-h-40 overflow-y-auto p-1">
          {loading ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">Loading...</div>
          ) : options.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">{emptyText}</div>
          ) : (
            options.map((option) => {
              const isSelected = selectedOption?.id === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition ${
                    isSelected
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted/60 text-foreground/90"
                  }`}
                  onClick={() => {
                    onSelect(option);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{option.label}</div>
                    {option.description && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {option.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const createSpaceEditSceneStore = (
  spaceId: string,
  placements: SpaceFragment["placements"],
): SpaceEditSceneStore => {
  return createStore<SpaceEditSceneState>((set) => ({
    spaceId,
    placements,
    selectedPlacementId: null,
    openPanels: [],
    viewProjectionMatrix: null,
    viewportSize: { width: 0, height: 0 },
    updateCameraData: (matrix, size) => set({ viewProjectionMatrix: matrix, viewportSize: size }),
    setPlacements: (nextPlacements) =>
      set((state) => {
        const placementIds = new Set(nextPlacements.map((placement) => placement.id));
        const selectedPlacementId =
          state.selectedPlacementId && placementIds.has(state.selectedPlacementId)
            ? state.selectedPlacementId
            : null;

        return {
          placements: nextPlacements,
          selectedPlacementId,
          openPanels: state.openPanels.filter((panel) => placementIds.has(panel.placementId)),
        };
      }),
    addPlacement: (placement) =>
      set((state) => ({
        placements: [...state.placements, placement],
        selectedPlacementId: placement.id,
      })),
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

const useSpaceEditScene = <T,>(selector: (state: SpaceEditSceneState) => T): T => {
  const store = useContext(SpaceEditSceneContext);

  if (!store) {
    throw new Error("useSpaceEditScene must be used within a SpaceEditSceneProvider");
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

const EditPlacement = ({ placement }: { placement: SpacePlacementFragment }) => {
  const meshRef = useRef<Group>(null!);
  const [transformObject, setTransformObject] = useState<Group | null>(null);
  const selectedId = useSpaceEditScene((state) => state.selectedPlacementId);
  const selectPlacement = useSpaceEditScene((state) => state.selectPlacement);
  const openPlacementPanel = useSpaceEditScene((state) => state.openPlacementPanel);
  const isSelected = selectedId === placement.id;
  const [updatePlacement] = useUpdatePlacementMutation();

  const handleGroupRef = useCallback((node: Group | null) => {
    meshRef.current = node!;
    setTransformObject(node);
  }, []);

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

  const handleTransformEnd = useCallback(() => {
    if (!meshRef.current) {
      return;
    }

    const elements = meshRef.current.matrix.elements;
    const affineMatrix = [
      [elements[0], elements[4], elements[8], elements[12]],
      [elements[1], elements[5], elements[9], elements[13]],
      [elements[2], elements[6], elements[10], elements[14]],
      [elements[3], elements[7], elements[11], elements[15]],
    ];

    updatePlacement({
      variables: {
        input: {
          id: placement.id,
          affineMatrix,
        },
      },
    });
  }, [placement.id, updatePlacement]);

  return (
    <>
      {isSelected && transformObject && (
        <TransformControls object={transformObject} mode="translate" onMouseUp={handleTransformEnd} />
      )}
      <group
        ref={handleGroupRef}
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
    </>
  );
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const DEFAULT_PANEL_SIZE = {
  width: 280,
  height: 180,
};

const EditMaterializedBlokPanel = ({ panelId, placementId }: { panelId: string; placementId: string }) => {
  const placements = useSpaceEditScene((state) => state.placements);
  const viewProjectionMatrix = useSpaceEditScene((state) => state.viewProjectionMatrix);
  const viewportSize = useSpaceEditScene((state) => state.viewportSize);
  const closePanel = useSpaceEditScene((state) => state.closePanel);
  const selectPlacement = useSpaceEditScene((state) => state.selectPlacement);
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

const SpaceEditMaterializedBlokPanels = () => {
  const openPanels = useSpaceEditScene((state) => state.openPanels);

  if (openPanels.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {openPanels.map((panel) => (
        <EditMaterializedBlokPanel
          key={panel.id}
          panelId={panel.id}
          placementId={panel.placementId}
        />
      ))}
    </div>
  );
};

const SpaceEditCameraMatrixSync = ({ debounceMs = 80 }: { debounceMs?: number }) => {
  const updateCameraData = useSpaceEditScene((state) => state.updateCameraData);
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

const SpaceEditSceneContent = () => {
  const placements = useSpaceEditScene((state) => state.placements);
  const clearPanels = useSpaceEditScene((state) => state.clearPanels);
  const selectPlacement = useSpaceEditScene((state) => state.selectPlacement);

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
        <EditPlacement key={placement.id} placement={placement} />
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
      <SpaceEditCameraMatrixSync />
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

export const SpaceEditSceneProvider = ({
  space,
  children,
}: {
  space: SpaceFragment;
  children: React.ReactNode;
}) => {
  const [store] = useState<SpaceEditSceneStore>(() => createSpaceEditSceneStore(space.id, space.placements));

  useEffect(() => {
    store.getState().setPlacements(space.placements);
  }, [space.placements, store]);

  return <SpaceEditSceneContext.Provider value={store}>{children}</SpaceEditSceneContext.Provider>;
};

export const SpaceEditScene = () => {
  const spaceId = useSpaceEditScene((state) => state.spaceId);
  const addPlacement = useSpaceEditScene((state) => state.addPlacement);
  const [dropContext, setDropContext] = useState<CreatePlacementDropContext | null>(null);
  const [role, setRole] = useState("");
  const [materializedBlokSearch, setMaterializedBlokSearch] = useState("");
  const [threeDModelSearch, setThreeDModelSearch] = useState("");
  const [selectedMaterializedBlok, setSelectedMaterializedBlok] =
    useState<PlacementDialogOption | null>(null);
  const [selectedThreeDModel, setSelectedThreeDModel] = useState<PlacementDialogOption | null>(null);
  const debouncedMaterializedBlokSearch = useDebouncedString(materializedBlokSearch);
  const debouncedThreeDModelSearch = useDebouncedString(threeDModelSearch);
  const [createPlacement, { loading: isCreatingPlacement }] = useCreatePlacementMutation();

  const { data: materializedBlokData, loading: isLoadingMaterializedBloks } = useListMaterializedBloksQuery({
    variables: {
      filters: debouncedMaterializedBlokSearch
        ? { search: debouncedMaterializedBlokSearch }
        : undefined,
      pagination: { limit: 8 },
    },
    skip: !dropContext,
  });

  const { data: threeDModelData, loading: isLoadingThreeDModels } = useThreeDModelOptionsQuery({
    variables: {
      search: debouncedThreeDModelSearch || undefined,
      values: selectedThreeDModel ? [selectedThreeDModel.id] : undefined,
    },
    skip: !dropContext,
  });

  const materializedBlokOptions = useMemo<PlacementDialogOption[]>(() => {
    return (materializedBlokData?.materializedBloks ?? []).map((materializedBlok) => ({
      id: materializedBlok.id,
      label: materializedBlok.blok.name,
      description: materializedBlok.id,
    }));
  }, [materializedBlokData]);

  const threeDModelOptions = useMemo<PlacementDialogOption[]>(() => {
    const options = (threeDModelData?.options ?? []).map((option) => ({
      id: option.value,
      label: option.label,
      description: option.value,
    }));

    if (selectedThreeDModel && !options.some((option) => option.id === selectedThreeDModel.id)) {
      return [selectedThreeDModel, ...options];
    }

    return options;
  }, [selectedThreeDModel, threeDModelData]);

  const closeCreatePlacementDialog = useCallback(() => {
    setDropContext(null);
    setRole("");
    setMaterializedBlokSearch("");
    setThreeDModelSearch("");
    setSelectedMaterializedBlok(null);
    setSelectedThreeDModel(null);
  }, []);

  const [{ isOver }, dropRef] = useSmartDrop(
    (structures) => {
      const droppedAgent = structures.find(isDroppedAgent);

      if (!droppedAgent) {
        return;
      }

      setDropContext({
        agentId: droppedAgent.object.id,
        agentName: droppedAgent.object.name || droppedAgent.object.id,
      });
      setRole("");
      setMaterializedBlokSearch("");
      setThreeDModelSearch("");
      setSelectedMaterializedBlok(null);
      setSelectedThreeDModel(null);
    },
  );

  const handleCreatePlacement = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!dropContext) {
        return;
      }

      const result = await createPlacement({
        variables: {
          input: {
            agent: dropContext.agentId,
            affineMatrix: IDENTITY_AFFINE_MATRIX,
            materializedBlok: selectedMaterializedBlok?.id,
            model: selectedThreeDModel?.id,
            role: role.trim() || undefined,
            space: spaceId,
          },
        },
      });

      const createdPlacement = result.data?.createPlacement;

      if (!createdPlacement) {
        return;
      }

      addPlacement({
        __typename: "Placement",
        affineMatrix: createdPlacement.affineMatrix ?? IDENTITY_AFFINE_MATRIX,
        agent: {
          __typename: "Agent",
          id: dropContext.agentId,
        },
        blok: selectedMaterializedBlok
          ? {
              __typename: "MaterializedBlok",
              id: selectedMaterializedBlok.id,
            }
          : null,
        id: createdPlacement.id,
        model:
          selectedThreeDModel && createdPlacement.model?.file
            ? {
                __typename: "ThreeDModel",
                id: selectedThreeDModel.id,
                transferFunction: null,
                file: createdPlacement.model.file,
              }
            : null,
        name: dropContext.agentName,
      });
      closeCreatePlacementDialog();
    },
    [
      addPlacement,
      closeCreatePlacementDialog,
      createPlacement,
      dropContext,
      role,
      selectedMaterializedBlok,
      selectedThreeDModel,
      spaceId,
    ],
  );

  return (
    <div className="relative flex h-full flex-col" ref={dropRef}>
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Space Editor</div>
        <div className="text-xs text-muted-foreground">
          Select a placement to move it. Changes are saved automatically.
        </div>
        <div className="flex-1" />
      </div>

      <div className="relative flex-1">
        {isOver && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-3 text-sm shadow-lg">
              Drop an agent card to create a placement.
            </div>
          </div>
        )}
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [4, 4, 8], fov: 45 }}
          frameloop="demand"
          className="!absolute inset-0"
        >
          <SpaceEditSceneContent />
        </Canvas>
        <SpaceEditMaterializedBlokPanels />
      </div>

      <Dialog
        open={dropContext !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeCreatePlacementDialog();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Placement</DialogTitle>
            <DialogDescription>
              Create a placement for {dropContext?.agentName ?? "the dropped agent"} in this space.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleCreatePlacement}>
            <div className="space-y-2">
              <Label htmlFor="space-edit-create-placement-agent">Agent</Label>
              <Input
                id="space-edit-create-placement-agent"
                value={dropContext?.agentName ?? ""}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="space-edit-create-placement-role">Role</Label>
              <Input
                id="space-edit-create-placement-role"
                placeholder="Optional role"
                value={role}
                onChange={(event) => {
                  setRole(event.target.value);
                }}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PlacementDialogOptionPicker
                label="Materialized Blok"
                inputId="space-edit-create-placement-materialized-blok"
                placeholder="Search materialized bloks"
                search={materializedBlokSearch}
                onSearchChange={setMaterializedBlokSearch}
                selectedOption={selectedMaterializedBlok}
                options={materializedBlokOptions}
                loading={isLoadingMaterializedBloks}
                emptyText="No materialized bloks found."
                onSelect={setSelectedMaterializedBlok}
                onClear={() => {
                  setSelectedMaterializedBlok(null);
                }}
              />

              <PlacementDialogOptionPicker
                label="3D Model"
                inputId="space-edit-create-placement-three-d-model"
                placeholder="Search 3D models"
                search={threeDModelSearch}
                onSearchChange={setThreeDModelSearch}
                selectedOption={selectedThreeDModel}
                options={threeDModelOptions}
                loading={isLoadingThreeDModels}
                emptyText="No 3D models found."
                onSelect={setSelectedThreeDModel}
                onClear={() => {
                  setSelectedThreeDModel(null);
                }}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeCreatePlacementDialog}
                disabled={isCreatingPlacement}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingPlacement || dropContext === null}>
                {isCreatingPlacement ? "Creating..." : "Create placement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

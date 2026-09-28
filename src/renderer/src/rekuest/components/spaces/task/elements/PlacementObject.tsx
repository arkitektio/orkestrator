import { SpaceGroupPlacement } from "../types";
import { useSpaceViewStore } from "../store";
import * as React from "react";
import { useEffect, useCallback, useMemo } from "react";
import { Group, Matrix4 } from "three";
import { MediaStoreFragment } from "@/rekuest/api/graphql";
import { WithMediaUrl } from "@/rekuest/datalayer/rekuestAccess";
import { Center, useGLTF } from "@react-three/drei";
import { InvertedHullOutline } from "./InvertedHullOutline";
import { BrandColors } from "./brandColors";





const PlacementModel = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  return (
    <Center>
      <primitive object={scene.clone()} />
    </Center>
  );
};





export const PlacementObject = ({
  placement,
  brandColors,
}: {
  placement: SpaceGroupPlacement;
  brandColors: BrandColors;
}) => {
  const groupRef = React.useRef<Group>(null!);
  const selectPlacement = useSpaceViewStore((s) => s.selectPlacement);
  const isSelected = useSpaceViewStore((s) => s.selectedPlacementId === placement.id);
  const isActive = useSpaceViewStore((s) => s.activeAgentIds.has(placement.agentId));
  const isRoot = useSpaceViewStore(
    (s) => placement.isRoot === true || placement.agentId === s.rootAgentId,
  );
  const computedMatrix = useSpaceViewStore((s) => s.computedTransforms.get(placement.id));

  const hullConfig = useMemo(() => {
    if (isRoot)     return { enabled: true, color: brandColors.chart1, thickness: 1.10, opacity: 0.8 };
    if (isSelected) return { enabled: true, color: brandColors.chart3, thickness: 1.10, opacity: 0.8 };
    if (isActive)   return { enabled: true, color: brandColors.chart2, thickness: 1.10, opacity: 0.8 };
    return { enabled: false, color: brandColors.chart2, thickness: 1.10, opacity: 0.8 };
  }, [isRoot, isSelected, isActive, brandColors]);

  useEffect(() => {
    if (!groupRef.current || !computedMatrix) return;
    const flat = computedMatrix.flat() as number[];
    const m = new Matrix4().fromArray(flat).transpose();
    groupRef.current.matrix.copy(m);
    groupRef.current.matrix.decompose(
      groupRef.current.position,
      groupRef.current.quaternion,
      groupRef.current.scale,
    );
    groupRef.current.matrixAutoUpdate = true;
    groupRef.current.updateMatrixWorld(true);
  }, [computedMatrix]);

  const handleClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      selectPlacement(placement.id);
    },
    [placement.id, selectPlacement],
  );

  return (
    <group ref={groupRef} onClick={handleClick}>
      <InvertedHullOutline
        enabled={hullConfig.enabled}
        color={hullConfig.color}
        thickness={hullConfig.thickness}
        opacity={hullConfig.opacity}
      >
        {placement.model?.file ? (
          <WithMediaUrl media={placement.model.file as unknown as MediaStoreFragment}>
            {(url: string) => <PlacementModel url={url} />}
          </WithMediaUrl>
        ) : (
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshStandardMaterial color={isRoot ? brandColors.chart1 : brandColors.chart4} />
          </mesh>
        )}
      </InvertedHullOutline>
    </group>
  );
};

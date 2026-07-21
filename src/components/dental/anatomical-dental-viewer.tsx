"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import Link from "next/link";
import { toothStatusColor } from "@/lib/dental/constants";
import {
  DUNDEE_PERMANENT_DENTITION,
  INTERACTIVE_MODEL_PATH,
} from "@/lib/dental/model-sources";
import {
  resolveMeshFdi,
  TEETH_SET_HIDDEN_MESHES,
} from "@/lib/dental/mesh-fdi-map";
import { prepareModelRoot } from "@/lib/dental/prepare-model";
import {
  DENTAL_CAMERA_FOV,
  DENTAL_CAMERA_POSITION,
  DENTAL_MODEL_ROTATION,
  DENTAL_ORBIT_LIMITS,
  DENTAL_ORBIT_TARGET,
} from "@/lib/dental/viewer-pose";
import type { TreatmentPlanMarker } from "@/lib/dental/treatment-plan-markers";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

type ToothRecord = {
  toothFdi: number;
  status: string;
  notes?: string | null;
};

type Props = {
  teeth: ToothRecord[];
  selectedFdi: number | null;
  onSelect: (fdi: number) => void;
  treatmentPlanMarkers?: TreatmentPlanMarker[];
};

const ENAMEL = "#f2ebe2";
const SCENE_BG = "#eef2f6";
const SELECTED_COLOR = "#4338ca";
const SELECTED_EMISSIVE = "#818cf8";
const HOVER_COLOR = "#ea580c";
const HOVER_EMISSIVE = "#fb923c";

function TreatmentPlanBox({
  markers,
  selectedFdi,
  onSelect,
}: {
  markers: TreatmentPlanMarker[];
  selectedFdi: number | null;
  onSelect: (fdi: number) => void;
}) {
  const { t } = useLocale();
  if (markers.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute bottom-7 left-2 right-2 z-10">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 shadow-sm">
        <span className="text-[11px] font-semibold text-slate-600">
          {t("dental.treatmentPlansLabel")}
        </span>
        {markers.map((marker) => {
          const isSelected = selectedFdi === marker.toothFdi;
          return (
            <button
              key={marker.toothFdi}
              type="button"
              onClick={() => onSelect(marker.toothFdi)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-semibold transition",
                isSelected
                  ? "bg-teal-700 text-white"
                  : "bg-teal-50 text-teal-800 hover:bg-teal-100"
              )}
            >
              {marker.toothFdi} · {marker.completedSessions}/{marker.totalSessions}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function applyAnatomicalMaterial(
  mesh: THREE.Mesh,
  status: string,
  selected: boolean,
  hovered: boolean
) {
  const isMissing = status === "missing";
  let color: THREE.Color;
  let emissive = new THREE.Color("#000000");
  let emissiveIntensity = 0;
  let roughness = 0.32;
  let metalness = 0.03;

  if (selected) {
    color = new THREE.Color(SELECTED_COLOR);
    emissive = new THREE.Color(SELECTED_EMISSIVE);
    emissiveIntensity = 0.55;
    roughness = 0.26;
    metalness = 0.06;
  } else if (hovered) {
    color = new THREE.Color(HOVER_COLOR);
    emissive = new THREE.Color(HOVER_EMISSIVE);
    emissiveIntensity = 0.42;
    roughness = 0.28;
  } else if (status !== "healthy") {
    const pathology = toothStatusColor(status);
    color = new THREE.Color(ENAMEL).lerp(new THREE.Color(pathology), 0.72);
    emissive = new THREE.Color(pathology);
    emissiveIntensity = 0.28;
    roughness = 0.38;
  } else {
    color = new THREE.Color(ENAMEL);
  }

  mesh.material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
    transparent: isMissing,
    opacity: isMissing ? 0.25 : 1,
  });
}

function AnatomicalTeethModel({
  teeth,
  selectedFdi,
  onSelect,
}: Pick<Props, "teeth" | "selectedFdi" | "onSelect">) {
  const [hoveredFdi, setHoveredFdi] = useState<number | null>(null);
  const { scene } = useGLTF(INTERACTIVE_MODEL_PATH);

  const statusMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of teeth) map.set(t.toothFdi, t.status);
    return map;
  }, [teeth]);

  const model = useMemo(() => {
    const root = scene.clone(true);
    const strayMeshes: THREE.Mesh[] = [];

    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (TEETH_SET_HIDDEN_MESHES.has(child.name)) {
        strayMeshes.push(child);
        return;
      }
      const fdi = resolveMeshFdi(child.name);
      if (fdi) {
        child.userData.fdi = fdi;
        return;
      }
      strayMeshes.push(child);
    });

    for (const mesh of strayMeshes) {
      mesh.parent?.remove(mesh);
    }

    prepareModelRoot(root);
    return root;
  }, [scene]);

  useEffect(() => {
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const fdi = child.userData.fdi as number | undefined;
      if (!fdi) return;
      const status = statusMap.get(fdi) ?? "healthy";
      const isSelected = selectedFdi === fdi;
      const isHovered = hoveredFdi === fdi && !isSelected;
      applyAnatomicalMaterial(child, status, isSelected, isHovered);
    });
  }, [model, statusMap, selectedFdi, hoveredFdi]);

  function resolveFdi(object: THREE.Object3D): number | null {
    let obj: THREE.Object3D | null = object;
    while (obj) {
      const fdi = obj.userData?.fdi as number | undefined;
      if (fdi) return fdi;
      obj = obj.parent;
    }
    return null;
  }

  return (
    <group
      rotation={DENTAL_MODEL_ROTATION}
      onClick={(e) => {
        e.stopPropagation();
        const fdi = resolveFdi(e.object);
        if (fdi) onSelect(fdi);
      }}
      onPointerMove={(e) => {
        const fdi = resolveFdi(e.object);
        setHoveredFdi(fdi);
        document.body.style.cursor = fdi ? "pointer" : "auto";
      }}
      onPointerOut={() => {
        setHoveredFdi(null);
        document.body.style.cursor = "auto";
      }}
    >
      <primitive object={model} />
    </group>
  );
}

function CameraRig({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...DENTAL_CAMERA_POSITION);
    camera.lookAt(...DENTAL_ORBIT_TARGET);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...DENTAL_ORBIT_TARGET);
      controls.update();
    }
  }, [camera, controlsRef]);
  return null;
}

function Scene(props: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <>
      <color attach="background" args={[SCENE_BG]} />
      <CameraRig controlsRef={controlsRef} />
      <ambientLight intensity={0.65} color="#ffffff" />
      <hemisphereLight
        intensity={0.55}
        color="#ffffff"
        groundColor="#d8dee6"
      />
      <directionalLight position={[2, 4, 3]} intensity={1.1} color="#fff" />
      <directionalLight position={[-3, 1, 2]} intensity={0.35} color="#f8fafc" />
      <Environment preset="apartment" environmentIntensity={0.35} />
      <AnatomicalTeethModel {...props} />
      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.22}
        scale={12}
        blur={2.5}
        far={4}
        color="#94a3b8"
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={DENTAL_ORBIT_LIMITS.minDistance}
        maxDistance={DENTAL_ORBIT_LIMITS.maxDistance}
        minPolarAngle={DENTAL_ORBIT_LIMITS.minPolarAngle}
        maxPolarAngle={DENTAL_ORBIT_LIMITS.maxPolarAngle}
        minAzimuthAngle={DENTAL_ORBIT_LIMITS.minAzimuthAngle}
        maxAzimuthAngle={DENTAL_ORBIT_LIMITS.maxAzimuthAngle}
        target={DENTAL_ORBIT_TARGET}
      />
    </>
  );
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const VIEWER_HEIGHT = "h-[min(62vh,560px)]";

export function AnatomicalDentalViewer({
  treatmentPlanMarkers = [],
  ...props
}: Props) {
  const { t } = useLocale();
  const hasPlans = treatmentPlanMarkers.length > 0;

  return (
    <CanvasErrorBoundary
      fallback={
        <div
          className={`flex ${VIEWER_HEIGHT} items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500`}
        >
          {t("dental.anatomicalError")}
        </div>
      }
    >
      <div
        className={`relative ${VIEWER_HEIGHT} w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#eef2f6] shadow-inner`}
      >
        <Canvas
          camera={{ position: DENTAL_CAMERA_POSITION, fov: DENTAL_CAMERA_FOV }}
          dpr={[1, 2]}
          gl={{
            powerPreference: "high-performance",
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
          }}
        >
          <Suspense
            fallback={
              <Html center>
                <p className="rounded-lg bg-white/90 px-4 py-2 text-sm text-slate-600 shadow">
                  {t("dental.anatomicalLoading")}
                </p>
              </Html>
            }
          >
            <Scene {...props} />
          </Suspense>
        </Canvas>
        <TreatmentPlanBox
          markers={treatmentPlanMarkers}
          selectedFdi={props.selectedFdi}
          onSelect={props.onSelect}
        />
        <p
          className={cn(
            "pointer-events-none absolute left-0 right-0 px-3 text-center text-[9px] leading-snug text-slate-400",
            hasPlans ? "bottom-1" : "bottom-2"
          )}
        >
          {t("dental.anatomicalHint")}{" "}
          <Link
            href={DUNDEE_PERMANENT_DENTITION.sketchfabUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto underline decoration-slate-400 hover:text-slate-600"
          >
            Dundee
          </Link>{" "}
          (CC BY)
        </p>
      </div>
    </CanvasErrorBoundary>
  );
}

useGLTF.preload(INTERACTIVE_MODEL_PATH);

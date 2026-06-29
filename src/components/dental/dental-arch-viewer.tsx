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
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox, useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import {
  toothStatusColor,
  toothStatusLabel,
} from "@/lib/dental/constants";
import { FDI_ALL } from "@/lib/dental/constants";
import {
  DENTAL_MODEL_PATH,
  resolveMeshFdi,
  TEETH_SET_HIDDEN_MESHES,
} from "@/lib/dental/mesh-fdi-map";
import { TOOTH_TRANSFORMS } from "@/lib/dental/tooth-layout";
import { prepareModelRoot } from "@/lib/dental/prepare-model";
import { addMissingQuadrantTeeth } from "@/lib/dental/synthetic-teeth";

type ToothRecord = {
  toothFdi: number;
  status: string;
  notes?: string | null;
};

type Props = {
  teeth: ToothRecord[];
  selectedFdi: number | null;
  onSelect: (fdi: number) => void;
  showAnnotations?: boolean;
};

const BASE_TOOTH = "#ebe4d8";
const ENAMEL_HIGHLIGHT = "#f8f4ec";
const SELECTED_TINT = "#fde047";
const HOVER_TINT = "#fef08a";

function isRecordedTooth(tooth: ToothRecord) {
  return tooth.status !== "healthy" || (tooth.notes?.trim().length ?? 0) > 0;
}

function annotationAnchor(fdi: number, start: THREE.Vector3): THREE.Vector3 {
  const radial = start.clone();
  if (radial.lengthSq() < 1e-6) radial.set(0, 0.1, 0.25);
  radial.normalize();

  const isUpper = fdi >= 11 && fdi <= 28;
  const isLower = fdi >= 31 && fdi <= 48;
  const unit = fdi % 10;
  const sideBias = (unit - 4.5) * 0.025;

  const end = start
    .clone()
    .add(radial.multiplyScalar(isUpper || isLower ? 0.42 : 0.35));

  if (isUpper) end.y += 0.18;
  if (isLower) end.y -= 0.18;
  end.x += sideBias;

  return end;
}

function ToothAnnotation({
  tooth,
  mesh,
}: {
  tooth: ToothRecord;
  mesh: THREE.Mesh;
}) {
  const labelRef = useRef<THREE.Group>(null);
  const lineObj = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({
      color: toothStatusColor(tooth.status),
      transparent: true,
      opacity: 0.92,
    });
    return new THREE.Line(geom, mat);
  }, [tooth.status]);
  const color = toothStatusColor(tooth.status);

  useFrame(() => {
    if (!mesh || !labelRef.current) return;

    const start = new THREE.Vector3();
    mesh.getWorldPosition(start);
    const end = annotationAnchor(tooth.toothFdi, start);

    lineObj.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [start.x, start.y, start.z, end.x, end.y, end.z],
        3
      )
    );

    labelRef.current.position.copy(end);
  });

  const statusText = toothStatusLabel(tooth.status);
  const notesText = tooth.notes?.trim();

  return (
    <>
      <primitive object={lineObj} />
      <group ref={labelRef}>
        <Html
          center
          distanceFactor={5.5}
          style={{ pointerEvents: "none" }}
          zIndexRange={[40, 0]}
        >
          <div
            dir="rtl"
            className="max-w-[9.5rem] rounded-lg border border-slate-600 bg-slate-900/95 px-2 py-1.5 text-right text-[10px] leading-snug text-slate-100 shadow-lg"
          >
            <div className="mb-0.5 flex items-center justify-end gap-1.5 font-bold">
              <span
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>السن {tooth.toothFdi}</span>
            </div>
            <div className="font-semibold" style={{ color }}>
              {statusText}
            </div>
            {notesText ? (
              <div className="mt-0.5 text-slate-400">{notesText}</div>
            ) : null}
          </div>
        </Html>
      </group>
    </>
  );
}

function ToothAnnotations({
  teeth,
  meshes,
}: {
  teeth: ToothRecord[];
  meshes: Map<number, THREE.Mesh>;
}) {
  const recorded = useMemo(() => teeth.filter(isRecordedTooth), [teeth]);

  return (
    <>
      {recorded.map((tooth) => {
        const mesh = meshes.get(tooth.toothFdi);
        if (!mesh) return null;
        return (
          <ToothAnnotation
            key={tooth.toothFdi}
            tooth={tooth}
            mesh={mesh}
          />
        );
      })}
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

function toothDisplayColor(status: string, selected: boolean, hovered: boolean) {
  if (selected) return SELECTED_TINT;
  if (status === "healthy") {
    if (hovered) return HOVER_TINT;
    return BASE_TOOTH;
  }
  return toothStatusColor(status);
}

function applyToothMaterial(
  mesh: THREE.Mesh,
  status: string,
  selected: boolean,
  hovered: boolean
) {
  const isMissing = status === "missing";
  const color = toothDisplayColor(status, selected, hovered);

  mesh.material = new THREE.MeshStandardMaterial({
    color,
    roughness: status === "healthy" ? 0.38 : 0.48,
    metalness: 0.02,
    emissive: selected
      ? new THREE.Color("#ca8a04")
      : hovered
        ? new THREE.Color("#854d0e")
        : status !== "healthy"
          ? new THREE.Color(color).multiplyScalar(0.15)
          : new THREE.Color("#000000"),
    emissiveIntensity: selected ? 0.22 : hovered ? 0.08 : status !== "healthy" ? 0.12 : 0,
    transparent: isMissing,
    opacity: isMissing ? 0.28 : 1,
    flatShading: false,
  });

  if (status === "healthy" && !selected && !hovered && mesh.material instanceof THREE.MeshStandardMaterial) {
    mesh.material.color.lerp(new THREE.Color(ENAMEL_HIGHLIGHT), 0.12);
  }
}

function ProceduralTeethModel({
  teeth,
  selectedFdi,
  onSelect,
  showAnnotations = true,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredFdi, setHoveredFdi] = useState<number | null>(null);
  const [meshesByFdi, setMeshesByFdi] = useState<Map<number, THREE.Mesh>>(
    () => new Map()
  );

  const statusMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of teeth) map.set(t.toothFdi, t.status);
    return map;
  }, [teeth]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const map = new Map<number, THREE.Mesh>();
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const fdi = child.userData.fdi as number | undefined;
      if (!fdi) return;
      map.set(fdi, child);
      const status = statusMap.get(fdi) ?? "healthy";
      applyToothMaterial(
        child,
        status,
        selectedFdi === fdi,
        hoveredFdi === fdi
      );
    });
    setMeshesByFdi(map);
  }, [statusMap, selectedFdi, hoveredFdi]);

  return (
    <group
      ref={groupRef}
      rotation={[0.08, Math.PI, 0]}
      onClick={(e) => {
        e.stopPropagation();
        const fdi = e.object.userData?.fdi as number | undefined;
        if (fdi) onSelect(fdi);
      }}
      onPointerMove={(e) => {
        const fdi = e.object.userData?.fdi as number | undefined;
        setHoveredFdi(fdi ?? null);
        document.body.style.cursor = fdi ? "pointer" : "auto";
      }}
      onPointerOut={() => {
        setHoveredFdi(null);
        document.body.style.cursor = "auto";
      }}
    >
      {FDI_ALL.map((fdi) => {
        const transform = TOOTH_TRANSFORMS[fdi];
        const status = statusMap.get(fdi) ?? "healthy";
        const color = toothDisplayColor(
          status,
          selectedFdi === fdi,
          hoveredFdi === fdi
        );

        return (
          <RoundedBox
            key={fdi}
            args={transform.size}
            position={transform.position}
            rotation={transform.rotation}
            radius={0.04}
            smoothness={4}
            userData={{ fdi }}
          >
            <meshStandardMaterial
              color={color}
              roughness={0.72}
              metalness={0.04}
              transparent={status === "missing"}
              opacity={status === "missing" ? 0.28 : 1}
            />
          </RoundedBox>
        );
      })}
      {showAnnotations ? (
        <ToothAnnotations teeth={teeth} meshes={meshesByFdi} />
      ) : null}
    </group>
  );
}

function TeethModel({
  teeth,
  selectedFdi,
  onSelect,
  showAnnotations = true,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredFdi, setHoveredFdi] = useState<number | null>(null);
  const [meshesByFdi, setMeshesByFdi] = useState<Map<number, THREE.Mesh>>(
    () => new Map()
  );
  const [useFallback, setUseFallback] = useState(false);
  const { scene } = useGLTF(DENTAL_MODEL_PATH);

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
    addMissingQuadrantTeeth(root);
    return root;
  }, [scene]);

  useEffect(() => {
    const map = new Map<number, THREE.Mesh>();
    let meshCount = 0;
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const fdi = child.userData.fdi as number | undefined;
      if (!fdi) return;
      meshCount += 1;
      map.set(fdi, child);
      const status = statusMap.get(fdi) ?? "healthy";
      applyToothMaterial(
        child,
        status,
        selectedFdi === fdi,
        hoveredFdi === fdi
      );
    });
    setMeshesByFdi(map);
    if (meshCount === 0) {
      console.warn("dental model: no mapped teeth meshes found, using fallback");
      setUseFallback(true);
    }
  }, [model, statusMap, selectedFdi, hoveredFdi]);

  if (useFallback) {
    return (
      <ProceduralTeethModel
        teeth={teeth}
        selectedFdi={selectedFdi}
        onSelect={onSelect}
        showAnnotations={showAnnotations}
      />
    );
  }

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
      ref={groupRef}
      rotation={[0.08, Math.PI, 0]}
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
      {showAnnotations ? (
        <ToothAnnotations teeth={teeth} meshes={meshesByFdi} />
      ) : null}
    </group>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, -0.15, 3.8);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

function Scene(props: Props) {
  return (
    <>
      <color attach="background" args={["#050505"]} />
      <CameraRig />
      <ambientLight intensity={0.55} color="#e2e8f0" />
      <hemisphereLight
        intensity={0.35}
        color="#f8fafc"
        groundColor="#1e293b"
      />
      <directionalLight position={[1.5, 3, 4]} intensity={1.1} color="#fff" />
      <directionalLight position={[-2.5, 1, 2]} intensity={0.35} color="#cbd5e1" />
      <directionalLight position={[0, -2, 3]} intensity={0.2} color="#94a3b8" />
      <Environment preset="studio" environmentIntensity={0.35} />
      <TeethModel {...props} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={2.2}
        maxDistance={5.5}
        minPolarAngle={Math.PI / 4.5}
        maxPolarAngle={Math.PI / 1.65}
        target={[0, 0, 0]}
      />
      <gridHelper
        args={[4, 20, "#1e293b", "#0f172a"]}
        position={[0, -1.35, 0]}
      />
    </>
  );
}

function ViewerFallback() {
  return (
    <div className="flex h-[min(62vh,560px)] items-center justify-center rounded-2xl border border-slate-700 bg-black p-6 text-center text-sm text-slate-400">
      تعذّر عرض نموذج الأسنان. حدّث الصفحة وحاول مجدداً.
    </div>
  );
}

export function DentalArchViewer(props: Props) {
  return (
    <CanvasErrorBoundary fallback={<ViewerFallback />}>
      <div className="relative h-[min(62vh,560px)] w-full overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-inner">
        <Canvas
          camera={{ position: [0, -0.15, 3.8], fov: 38 }}
          dpr={[1, 2]}
          gl={{
            powerPreference: "high-performance",
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
        >
          <Suspense
            fallback={
              <Html center>
                <p className="rounded-lg bg-slate-900/90 px-4 py-2 text-sm text-slate-300 shadow">
                  جاري تحميل نموذج الأسنان...
                </p>
              </Html>
            }
          >
            <Scene {...props} />
          </Suspense>
        </Canvas>
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs text-slate-500">
          اسحب للدوران · قرّب/بعّد بعجلة الفأرة · اضغط على السن لتسجيل حالته
        </p>
      </div>
    </CanvasErrorBoundary>
  );
}

useGLTF.preload(DENTAL_MODEL_PATH);

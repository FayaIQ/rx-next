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
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  toothStatusColor,
  toothStatusLabel,
} from "@/lib/dental/constants";
import {
  DENTAL_MODEL_PATH,
  TEETH_SET_MESH_FDI,
} from "@/lib/dental/mesh-fdi-map";

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
            className="max-w-[9.5rem] rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5 text-right text-[10px] leading-snug text-slate-800 shadow-md backdrop-blur-sm"
          >
            <div className="mb-0.5 flex items-center justify-end gap-1.5 font-bold text-slate-900">
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
              <div className="mt-0.5 text-slate-600">{notesText}</div>
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

function applyToothMaterial(
  mesh: THREE.Mesh,
  status: string,
  selected: boolean
) {
  const isHealthy = status === "healthy";
  const isMissing = status === "missing";
  const color = isHealthy ? "#f8fafc" : toothStatusColor(status);

  mesh.material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: isHealthy ? 0.28 : 0.35,
    metalness: 0.02,
    clearcoat: isHealthy ? 0.45 : 0.2,
    clearcoatRoughness: 0.2,
    emissive: selected
      ? new THREE.Color("#0891b2")
      : isHealthy
        ? new THREE.Color("#000000")
        : new THREE.Color(color),
    emissiveIntensity: selected ? 0.35 : isHealthy ? 0 : 0.15,
    transparent: isMissing,
    opacity: isMissing ? 0.35 : 1,
  });
}

function normalizeToFrame(root: THREE.Object3D, targetSize = 2.4) {
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = targetSize / maxDim;
    root.position.sub(center);
    root.scale.setScalar(scale);
  }
  return root;
}

function TeethModel({
  teeth,
  selectedFdi,
  onSelect,
  showAnnotations = true,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const [meshesByFdi, setMeshesByFdi] = useState<Map<number, THREE.Mesh>>(
    () => new Map()
  );
  const { scene } = useGLTF(DENTAL_MODEL_PATH, true);

  const statusMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of teeth) map.set(t.toothFdi, t.status);
    return map;
  }, [teeth]);

  const model = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const fdi = TEETH_SET_MESH_FDI[child.name];
      if (fdi) {
        child.userData.fdi = fdi;
        return;
      }

      child.material = new THREE.MeshPhysicalMaterial({
        color: "#e11d48",
        roughness: 0.55,
        metalness: 0.02,
      });
    });
    normalizeToFrame(root);
    return root;
  }, [scene]);

  useEffect(() => {
    const map = new Map<number, THREE.Mesh>();
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const fdi = child.userData.fdi as number | undefined;
      if (!fdi) return;
      map.set(fdi, child);
      const status = statusMap.get(fdi) ?? "healthy";
      applyToothMaterial(child, status, selectedFdi === fdi);
    });
    setMeshesByFdi(map);
  }, [model, statusMap, selectedFdi]);

  return (
    <group
      ref={groupRef}
      rotation={[0.12, Math.PI, 0]}
      onClick={(e) => {
          e.stopPropagation();
          let obj = e.object as THREE.Object3D;
          while (obj) {
            const fdi = obj.userData?.fdi as number | undefined;
            if (fdi) {
              onSelect(fdi);
              return;
            }
            obj = obj.parent!;
          }
        }}
        onPointerOver={(e) => {
          const fdi = e.object.userData?.fdi;
          if (fdi) {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
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

function Scene(props: Props) {
  return (
    <>
      <color attach="background" args={["#f8fafc"]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight intensity={0.5} color="#ffffff" groundColor="#fecdd3" />
      <directionalLight position={[2, 4, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 2, 2]} intensity={0.45} />
      <Bounds fit clip observe margin={1.35}>
        <TeethModel {...props} />
      </Bounds>
      <OrbitControls
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={1}
        maxDistance={6}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 1.55}
      />
    </>
  );
}

function ViewerFallback() {
  return (
    <div className="flex h-[min(58vh,520px)] items-center justify-center rounded-2xl border border-rx-border bg-rx-bg-subtle p-6 text-center text-sm text-rx-muted">
      تعذّر عرض نموذج الأسنان. حدّث الصفحة وحاول مجدداً.
    </div>
  );
}

export function DentalArchViewer(props: Props) {
  return (
    <CanvasErrorBoundary fallback={<ViewerFallback />}>
      <div className="relative h-[min(58vh,520px)] w-full overflow-hidden rounded-2xl border border-rx-border bg-gradient-to-b from-slate-50 to-white">
        <Canvas
          camera={{ position: [0, 0, 4], fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ powerPreference: "high-performance", antialias: true }}
        >
          <Suspense
            fallback={
              <Html center>
                <p className="rounded-lg bg-white/90 px-4 py-2 text-sm text-rx-muted shadow">
                  جاري تحميل نموذج الأسنان...
                </p>
              </Html>
            }
          >
            <Scene {...props} />
          </Suspense>
        </Canvas>
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs text-rx-muted">
          اسحب للدوران · قرّب/بعّد بعجلة الفأرة · اضغط على السن لتسجيل حالته
        </p>
        <p className="pointer-events-none absolute left-2 top-2 text-[10px] text-rx-muted/70">
          نموذج Teeth — Poly by Google (CC BY)
        </p>
      </div>
    </CanvasErrorBoundary>
  );
}

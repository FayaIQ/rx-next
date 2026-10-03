"use client";

import { Component, type ReactNode, Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { FDI_UPPER_RIGHT, FDI_UPPER_LEFT, FDI_LOWER_RIGHT, FDI_LOWER_LEFT, FDI_ALL, toothStatusColor } from "@/lib/dental/constants";
import * as THREE from "three";
import { DUNDEE_FDI_MAP, DUNDEE_EXCLUDED_MESH } from "@/lib/dental/dundee-fdi-map";
import { ANATOMICAL_MODEL_PATH, DUNDEE_PERMANENT_DENTITION } from "@/lib/dental/model-sources";
import type { TreatmentPlanMarker } from "@/lib/dental/treatment-plan-markers";
import { useLocale } from "@/i18n/locale-provider";
import { tToothStatus, tToothQuadrant } from "@/lib/i18n-labels";

type Props = {
  teeth: Array<{ toothFdi: number; status: string; statuses?: string[]; notes?: string | null }>;
  selectedFdi: number | null;
  onSelect: (fdi: number) => void;
  treatmentPlanMarkers?: TreatmentPlanMarker[];
};

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function FdiDentalViewer({ teeth, selectedFdi, onSelect, treatmentPlanMarkers = [] }: Props) {
  const { t } = useLocale();
  const [hovered, setHovered] = useState<number | null>(null);
  const toothMap = new Map(teeth.map((tooth) => [tooth.toothFdi, tooth]));
  const rows = [[...FDI_UPPER_RIGHT, ...FDI_UPPER_LEFT], [...[...FDI_LOWER_RIGHT].reverse(), ...[...FDI_LOWER_LEFT].reverse()]];
  const title = (fdi: number) => {
    const tooth = toothMap.get(fdi);
    return `${fdi} · ${tToothQuadrant(t, fdi)} · ${(tooth?.statuses ?? [tooth?.status ?? "healthy"]).map((status) => tToothStatus(t, status)).join(" · ")}`;
  };
  const color = (fdi: number) => hovered === fdi ? "#fb923c" : selectedFdi === fdi ? "#6366f1" : toothStatusColor(toothMap.get(fdi)?.status ?? "healthy");

  return (
    <div className="space-y-3">
      <div dir="ltr" className="flex justify-between text-xs text-slate-500"><span>{t("dental.patientRight")}</span><span>{t("dental.patientLeft")}</span></div>
      <SceneBoundary fallback={<p className="p-4 text-sm">{t("dental.archError")}</p>}>
        <div className="relative h-[min(55vh,460px)] rounded-xl border border-slate-200 bg-slate-50" onPointerLeave={() => setHovered(null)}>
          {hovered !== null && <div role="status" className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center">
            <span className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-lg">{title(hovered)}</span>
          </div>}
          <Canvas camera={{ position: [0, 0.9, 4.5], fov: 35 }} dpr={[1, 1.5]}>
            <ambientLight intensity={1.1} />
            <directionalLight position={[2, 5, 5]} intensity={2} />
            <Suspense fallback={null}>
              <DundeeTeeth color={color} toothMap={toothMap} selectedFdi={selectedFdi} hovered={hovered} setHovered={setHovered} onSelect={onSelect} />
            </Suspense>
            <OrbitControls enablePan={false} minDistance={3} maxDistance={7} />
          </Canvas>
        </div>
      </SceneBoundary>
      <div dir="ltr" className="space-y-1.5" aria-label="FDI / ISO 3950">
        {rows.map((row, index) => <div key={index} className="grid grid-cols-16 gap-0.5" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
          {row.map((fdi) => <button key={fdi} type="button" title={title(fdi)} aria-label={title(fdi)} aria-pressed={selectedFdi === fdi} onClick={() => onSelect(fdi)}
            onPointerEnter={() => setHovered(fdi)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(fdi)} onBlur={() => setHovered(null)}
            className="rounded border px-0 py-2 text-[10px] font-bold sm:text-xs" style={{ borderColor: color(fdi), background: hovered === fdi ? "#ffedd5" : selectedFdi === fdi ? "#e0e7ff" : "white" }}>{fdi}</button>)}
        </div>)}
      </div>
      {treatmentPlanMarkers.length ? <div className="flex flex-wrap gap-2">{treatmentPlanMarkers.map((marker) => <button type="button" key={marker.toothFdi} onClick={() => onSelect(marker.toothFdi)} className="rounded bg-teal-50 px-2 py-1 text-xs text-teal-800">{marker.toothFdi} · {marker.completedSessions}/{marker.totalSessions}</button>)}</div> : null}
      <p className="text-xs leading-relaxed text-slate-500"><a href={DUNDEE_PERMANENT_DENTITION.sketchfabUrl} target="_blank" rel="noreferrer">Permanent Dentition — University of Dundee, School of Dentistry</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></p>
    </div>
  );
}

function DundeeTeeth({ color, toothMap, selectedFdi, hovered, setHovered, onSelect }: {
  color: (fdi: number) => string;
  toothMap: Map<number, Props["teeth"][number]>; selectedFdi: number | null; hovered: number | null;
  setHovered: (fdi: number | null) => void; onSelect: (fdi: number) => void;
}) {
  const { scene } = useGLTF(ANATOMICAL_MODEL_PATH);
  const model = useMemo(() => {
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene);
    const center = bounds.getCenter(new THREE.Vector3());
    const meshes: Array<{ fdi: number; geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }> = [];
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object.name === DUNDEE_EXCLUDED_MESH) return;
      const fdi = DUNDEE_FDI_MAP[object.name];
      if (!fdi) throw new Error(`Unmapped Dundee tooth: ${object.name}`);
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      geometry.computeBoundingBox();
      const toothCenter = geometry.boundingBox!.getCenter(new THREE.Vector3());
      // Spread tooth centers in the arch plane, preserving each tooth's shape.
      const gapX = (toothCenter.x - center.x) * 0.18;
      const gapZ = (toothCenter.z - center.z) * 0.18;
      // Preserve original anatomy, open the bite slightly for independent selection.
      geometry.translate(-center.x + gapX, -center.y + (fdi < 30 ? 0.18 : -0.18), -center.z + gapZ);
      const material = (Array.isArray(object.material) ? object.material[0] : object.material) as THREE.MeshStandardMaterial;
      meshes.push({ fdi, geometry, material });
    });
    if (meshes.length !== 32 || new Set(meshes.map((m) => m.fdi)).size !== 32 || FDI_ALL.some((fdi) => !meshes.some((m) => m.fdi === fdi))) throw new Error("Incomplete Dundee FDI mapping");
    return meshes;
  }, [scene]);
  return <group>{model.map(({ fdi, geometry, material }) => <group key={fdi}>
    <mesh geometry={geometry} onClick={(event) => { event.stopPropagation(); onSelect(fdi); }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(fdi); }} onPointerOut={() => setHovered(null)}>
      <meshStandardMaterial map={material.map} color={hovered !== fdi && selectedFdi !== fdi && (!toothMap.get(fdi) || toothMap.get(fdi)?.status === "healthy") ? material.color : color(fdi)}
        roughness={material.roughness} metalness={material.metalness} normalMap={material.normalMap} side={material.side}
        emissive={hovered === fdi ? "#fb923c" : "#000000"} emissiveIntensity={0.2} transparent opacity={toothMap.get(fdi)?.status === "missing" ? 0.3 : 1} />
    </mesh>

  </group>)}</group>;
}

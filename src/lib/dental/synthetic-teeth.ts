import * as THREE from "three";

export function meshCenter(mesh: THREE.Mesh) {
  return new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
}

export function placeSyntheticTooth(
  root: THREE.Object3D,
  byFdi: Map<number, THREE.Mesh>,
  fdi: number,
  fromFdi: number,
  refFdi: number,
  rootScale: number,
  sizeScale = 0.88
) {
  const from = byFdi.get(fromFdi);
  const ref = byFdi.get(refFdi);
  if (!from || !ref) return;

  const fromPos = meshCenter(from);
  const refPos = meshCenter(ref);
  const step = fromPos.clone().sub(refPos);
  const target = fromPos.clone().add(step.multiplyScalar(0.92));
  const worldOffset = target.clone().sub(fromPos);

  const clone = from.clone(true);
  const geometry = clone.geometry.clone();
  geometry.computeBoundingBox();

  if (geometry.boundingBox) {
    const center = geometry.boundingBox.getCenter(new THREE.Vector3());
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(sizeScale, sizeScale, sizeScale);
    geometry.translate(center.x, center.y, center.z);
  }

  geometry.translate(
    worldOffset.x / rootScale,
    worldOffset.y / rootScale,
    worldOffset.z / rootScale
  );
  geometry.computeBoundingBox();

  clone.geometry = geometry;
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  clone.scale.set(1, 1, 1);
  clone.name = `Synth${fdi}`;
  clone.userData.fdi = fdi;
  root.add(clone);
  byFdi.set(fdi, clone);
}

export function addMissingQuadrantTeeth(root: THREE.Object3D) {
  const byFdi = new Map<number, THREE.Mesh>();
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.fdi) {
      byFdi.set(child.userData.fdi as number, child);
    }
  });

  const rootScale = root.scale.x || 1;
  placeSyntheticTooth(root, byFdi, 27, 26, 24, rootScale);
  placeSyntheticTooth(root, byFdi, 28, 27, 26, rootScale);
  placeSyntheticTooth(root, byFdi, 37, 36, 34, rootScale);
  placeSyntheticTooth(root, byFdi, 38, 37, 36, rootScale);
}

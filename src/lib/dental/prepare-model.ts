import * as THREE from "three";

export function prepareModelRoot(root: THREE.Object3D, targetSize = 2.6) {
  root.updateMatrixWorld(true);

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.updateWorldMatrix(true, false);
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    geometry.computeBoundingBox();
    child.geometry = geometry;
    child.position.set(0, 0, 0);
    child.rotation.set(0, 0, 0);
    child.scale.set(1, 1, 1);
  });

  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);

  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim <= 0) return root;

  const scale = targetSize / maxDim;
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  return root;
}

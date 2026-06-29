/** Default frontal open-jaw pose for the teeth GLB viewer. */
export const DENTAL_MODEL_ROTATION: [number, number, number] = [0.08, Math.PI, 0];

export const DENTAL_CAMERA_POSITION: [number, number, number] = [0, -0.15, 3.8];

export const DENTAL_CAMERA_FOV = 38;

export const DENTAL_ORBIT_TARGET: [number, number, number] = [0, 0, 0];

export const DENTAL_ORBIT_LIMITS = {
  minDistance: 2.2,
  maxDistance: 5.5,
  minPolarAngle: Math.PI / 4.5,
  maxPolarAngle: Math.PI / 1.65,
  minAzimuthAngle: -Math.PI / 2.2,
  maxAzimuthAngle: Math.PI / 2.2,
} as const;

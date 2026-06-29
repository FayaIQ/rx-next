/**
 * teeth-set.glb — "Teeth" by Poly by Google (CC-BY).
 * Source: https://poly.pizza/m/eNR_DPPP1Hp
 */
export const TEETH_SET_MESH_FDI: Record<string, number> = {
  Box010: 18,
  Box009: 17,
  Box014: 16,
  Box008: 15,
  Box013: 14,
  Box007: 13,
  Box012: 12,
  Box005: 11,
  Box003: 21,
  Box011: 22,
  Box002: 23,
  Box006: 24,
  Box001: 25,
  Box004: 26,
  Box028: 48,
  Box017: 47,
  Box027: 46,
  Box018: 45,
  Box016: 44,
  Box024: 43,
  Box025: 42,
  Box022: 41,
  Box021: 31,
  Box029: 32,
  Box020: 33,
  Box023: 34,
  Box031: 35,
  Box019: 36,
};

/** Stray meshes in the GLB — not part of the dental arch. */
export const TEETH_SET_HIDDEN_MESHES = new Set(["Box015", "Box030"]);

export const DENTAL_MODEL_PATH = "/models/dental/teeth-set.glb";

export function resolveMeshFdi(meshName: string): number | undefined {
  const direct = TEETH_SET_MESH_FDI[meshName];
  if (direct !== undefined) return direct;
  const base = meshName.replace(/_\d+$/, "");
  return TEETH_SET_MESH_FDI[base];
}

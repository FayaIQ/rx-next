/** Dundee Permanent Dentition (CC BY 4.0), source mesh names after GLTFLoader
 * sanitization. LL1–LL8 identify patient lower left; their contralateral meshes
 * occupy patient right. Upper counterparts verified against arch positions and
 * incisor/canine/premolar/molar source groups. Not assigned by file order.
 */
export const DUNDEE_FDI_MAP: Record<string, number> = {
  LL1seam_2ZBrushPolyMesh3D_Mandible_ll1_0: 31,
  LL2seam_2ZBrushPolyMesh3D_Mandible_l2_0: 32,
  LL3seam_2ZBrushPolyMesh3D_Mandible_ll3_0: 33,
  LL4seam_2ZBrushPolyMesh3D_Mandible_ll4_0: 34,
  LL5seam_3ZBrushPolyMesh3D_Mandible_ll5_0: 35,
  LL6seam_2ZBrushPolyMesh3D_Mandible_blinn10_0: 36,
  LL7seam_2ZBrushPolyMesh3D_Mandible_ll7_0: 37,
  LL8seam_2ZBrushPolyMesh3D_Mandible_ll8_0: 38,
  ZBrushPolyMesh3D_Mandible_ll8_0: 48,
  ZBrushPolyMesh3D1_Mandible_ll7_0: 47,
  ZBrushPolyMesh3D2_Mandible_blinn10_0: 46,
  ZBrushPolyMesh3D3_Mandible_ll4_0: 44,
  ZBrushPolyMesh3D4_Mandible_ll5_0: 45,
  ZBrushPolyMesh3D5_Mandible_ll3_0: 43,
  ZBrushPolyMesh3D6_Mandible_l2_0: 42,
  ZBrushPolyMesh3D7_Mandible_ll1_0: 41,
  polySurface1_UL1_0: 21,
  polySurface2_UL1_0: 11,
  polySurface4_blinn14_0: 12,
  polySurface6_blinn15_0: 13,
  polySurface8_blinn18_0: 16,
  ZBrushPolyMesh3D1_blinn14_0: 22,
  polySurface9_blinn19_0: 27,
  polySurface10_blinn19_0: 17,
  ZBrushPolyMesh3D3_blinn16_0: 24,
  ZBrushPolyMesh3D4_blinn17_0: 25,
  ZBrushPolyMesh3D2_blinn15_0: 23,
  ZBrushPolyMesh3D5_blinn18_0: 26,
  ZBrushPolyMesh3D7_blinn20_0: 28,
  ZBrushPolyMesh3D8_blinn16_0: 14,
  ZBrushPolyMesh3D9_blinn17_0: 15,
  polySurface12_blinn20_0: 18,
};
// Tiny non-tooth fragment (0.01 model units) under the UL6 source group.
export const DUNDEE_EXCLUDED_MESH = "polySurface7_blinn18_0";

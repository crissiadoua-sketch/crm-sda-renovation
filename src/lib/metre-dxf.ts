import DxfParser from "dxf-parser";
import { DXF_INSUNITS_VERS_MM } from "@/lib/metre-units";

export type EntiteDxf = { type: "LIGNE" | "POLYLIGNE"; pointsMm: { x: number; y: number }[] };

export type ResultatParsingDxf = { entites: EntiteDxf[]; echelleMmParUnite: number };

// Lit $INSUNITS dans le header DXF pour connaître l'unité réelle du dessin
// (mm/cm/m/pouces…) et convertit toutes les coordonnées directement en mm —
// contrairement à une image/PDF, un DXF n'a donc jamais besoin de calibration
// manuelle : l'échelle est déjà connue.
export function parseDxf(contenu: string): ResultatParsingDxf {
  const parser = new DxfParser();
  const dxf = parser.parseSync(contenu);
  if (!dxf) throw new Error("Fichier DXF illisible.");

  const insunits = typeof dxf.header?.["$INSUNITS"] === "number" ? (dxf.header["$INSUNITS"] as number) : 0;
  const echelleMmParUnite = DXF_INSUNITS_VERS_MM[insunits] ?? 1;

  const entites: EntiteDxf[] = [];
  for (const entity of dxf.entities ?? []) {
    if (entity.type === "LINE") {
      const vertices = (entity as unknown as { vertices: { x: number; y: number }[] }).vertices ?? [];
      if (vertices.length >= 2) {
        entites.push({
          type: "LIGNE",
          pointsMm: vertices.map((v) => ({ x: v.x * echelleMmParUnite, y: v.y * echelleMmParUnite })),
        });
      }
    } else if (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") {
      const vertices = (entity as unknown as { vertices: { x: number; y: number }[] }).vertices ?? [];
      if (vertices.length >= 2) {
        entites.push({
          type: "POLYLIGNE",
          pointsMm: vertices.map((v) => ({ x: v.x * echelleMmParUnite, y: v.y * echelleMmParUnite })),
        });
      }
    }
  }

  return { entites, echelleMmParUnite };
}

// Bornes (en mm) de l'ensemble des entités — pour cadrer la vue initiale du canvas.
export function bornesDxf(entites: EntiteDxf[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of entites) {
    for (const p of e.pointsMm) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

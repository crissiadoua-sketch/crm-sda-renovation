"use client";
import dynamic from "next/dynamic";

const Editeur3D = dynamic(
  () => import("./editeur-3d").then((m) => ({ default: m.Editeur3D })),
  { ssr: false },
);

export default Editeur3D;

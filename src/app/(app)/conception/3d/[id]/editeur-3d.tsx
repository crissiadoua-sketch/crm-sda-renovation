"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls, Grid, ContactShadows, Environment,
  TransformControls, PerspectiveCamera, OrthographicCamera,
} from "@react-three/drei";
import * as THREE from "three";
import Link from "next/link";
import {
  ChevronLeft, Save, Box, Search, Layers, Info, Download,
  Trash2, RotateCcw, Move, RefreshCw, Eye, EyeOff,
  Sun, Grid3X3, Copy, Image as ImageIcon,
} from "lucide-react";
import { sauvegarderScene, supprimerProjet3D, dupliquerProjet3D } from "@/lib/actions/projet3d";
import {
  TOUS_ELEMENTS_3D, CATEGORIES_3D, getElement3D,
  type Element3DDef,
} from "@/lib/elements-3d";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SceneEl {
  uid: string;          // unique id dans la scène
  elementId: string;    // référence à Element3DDef
  pos: [number, number, number];
  rot: [number, number, number];
  dim: [number, number, number];   // peut être customisé
  couleur: string;
  visible: boolean;
  label?: string;
}

interface ProjetInfo {
  id: string;
  titre: string;
  scene: string;
  settings: string;
  chantierId?: string | null;
  chantierNom?: string | null;
}

interface Plan2D {
  id: string;
  titre: string;
  fichier: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Mesh d'un élément 3D
// ---------------------------------------------------------------------------

function ElementMesh({
  el, def, selected, onClick,
}: {
  el: SceneEl;
  def: Element3DDef;
  selected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  const [lx, ly, lz] = el.dim;

  // Couleur avec teinte sélection/survol
  const couleur = selected
    ? "#6366F1"
    : hovered
    ? lighten(el.couleur, 0.15)
    : el.couleur;

  if (!el.visible) return null;

  const mat = (
    <meshStandardMaterial
      color={couleur}
      roughness={def.roughness}
      metalness={def.metalness}
      transparent={selected || hovered}
      opacity={selected ? 0.85 : 1}
    />
  );

  // Géométrie spéciale : toit 2 pentes
  if (def.forme === "toit2pentes") {
    return (
      <group
        position={el.pos}
        rotation={el.rot as unknown as THREE.Euler}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Corps principal */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[lx, ly * 0.4, lz]} />
          <meshStandardMaterial color={couleur} roughness={def.roughness} metalness={def.metalness} />
        </mesh>
        {/* Pente gauche */}
        <mesh castShadow position={[-lx * 0.25, ly * 0.5, 0]} rotation={[0, 0, Math.PI / 6]}>
          <boxGeometry args={[lx * 0.55, 0.05, lz]} />
          <meshStandardMaterial color={darken(couleur, 0.1)} roughness={def.roughness} />
        </mesh>
        {/* Pente droite */}
        <mesh castShadow position={[lx * 0.25, ly * 0.5, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <boxGeometry args={[lx * 0.55, 0.05, lz]} />
          <meshStandardMaterial color={darken(couleur, 0.1)} roughness={def.roughness} />
        </mesh>
        {selected && <SelectionBox dim={[lx, ly, lz]} />}
      </group>
    );
  }

  // Géométrie spéciale : IPN en H
  if (def.forme === "ipn") {
    return (
      <group
        position={el.pos}
        rotation={el.rot as unknown as THREE.Euler}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Âme */}
        <mesh castShadow>
          <boxGeometry args={[lx, ly * 0.6, ly * 0.06]} />
          <meshStandardMaterial color={couleur} roughness={def.roughness} metalness={def.metalness} />
        </mesh>
        {/* Semelle sup */}
        <mesh castShadow position={[0, ly * 0.3, 0]}>
          <boxGeometry args={[lx, ly * 0.08, ly]} />
          <meshStandardMaterial color={couleur} roughness={def.roughness} metalness={def.metalness} />
        </mesh>
        {/* Semelle inf */}
        <mesh castShadow position={[0, -ly * 0.3, 0]}>
          <boxGeometry args={[lx, ly * 0.08, ly]} />
          <meshStandardMaterial color={couleur} roughness={def.roughness} metalness={def.metalness} />
        </mesh>
        {selected && <SelectionBox dim={[lx, ly, lz]} />}
      </group>
    );
  }

  // Géométrie spéciale : escalier
  if (def.forme === "escalier") {
    const nbMarches = 14;
    return (
      <group
        position={el.pos}
        rotation={el.rot as unknown as THREE.Euler}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {Array.from({ length: nbMarches }).map((_, i) => (
          <mesh key={i} castShadow position={[0, (i * ly) / nbMarches, (i * lz) / nbMarches - lz / 2]}>
            <boxGeometry args={[lx, ly / nbMarches, lz / nbMarches]} />
            <meshStandardMaterial color={couleur} roughness={def.roughness} />
          </mesh>
        ))}
        {selected && <SelectionBox dim={[lx, ly, lz]} />}
      </group>
    );
  }

  // Géométrie cylindre
  if (def.forme === "cylinder") {
    return (
      <mesh
        ref={meshRef}
        position={el.pos}
        rotation={el.rot as unknown as THREE.Euler}
        castShadow receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[lx / 2, lx / 2, ly, 16]} />
        {mat}
        {selected && <SelectionBox dim={[lx, ly, lz]} />}
      </mesh>
    );
  }

  // Box par défaut
  return (
    <mesh
      ref={meshRef}
      position={el.pos}
      rotation={el.rot as unknown as THREE.Euler}
      castShadow receiveShadow
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[lx, ly, lz]} />
      {mat}
      {selected && <SelectionBox dim={[lx, ly, lz]} />}
    </mesh>
  );
}

function SelectionBox({ dim }: { dim: [number, number, number] }) {
  return (
    <mesh>
      <boxGeometry args={[dim[0] + 0.03, dim[1] + 0.03, dim[2] + 0.03]} />
      <meshBasicMaterial color="#6366F1" wireframe transparent opacity={0.4} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Scène Three.js
// ---------------------------------------------------------------------------

function Scene({
  elements, selectedUid, onSelect, settings, plan2DUrl, topView,
}: {
  elements: SceneEl[];
  selectedUid: string | null;
  onSelect: (uid: string | null) => void;
  settings: { longueur: number; largeur: number; hauteur: number };
  plan2DUrl: string | null;
  topView: boolean;
}) {
  const selectedEl = elements.find((e) => e.uid === selectedUid);
  const selectedMeshRef = useRef<THREE.Object3D>(null!);

  return (
    <>
      {/* Lumières */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-8, 10, -5]} intensity={0.4} />

      {/* Sol avec texture plan 2D optionnel */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
        onClick={() => onSelect(null)}
      >
        <planeGeometry args={[settings.longueur, settings.largeur]} />
        {plan2DUrl ? (
          <Plan2DTexture url={plan2DUrl} />
        ) : (
          <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
        )}
      </mesh>

      {/* Grille */}
      <Grid
        position={[0, 0, 0]}
        args={[settings.longueur + 2, settings.largeur + 2]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#CBD5E1"
        sectionSize={5}
        sectionColor="#94A3B8"
        sectionThickness={1}
        fadeDistance={40}
        infiniteGrid={false}
      />

      {/* Contour de la pièce */}
      <RoomOutline settings={settings} />

      {/* Ombres de contact */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.3}
        scale={Math.max(settings.longueur, settings.largeur) + 4}
        blur={1.5}
        far={4}
      />

      {/* Éléments de la scène */}
      {elements.map((el) => {
        const def = getElement3D(el.elementId);
        if (!def) return null;
        return (
          <ElementMesh
            key={el.uid}
            el={el}
            def={def}
            selected={el.uid === selectedUid}
            onClick={() => onSelect(el.uid === selectedUid ? null : el.uid)}
          />
        );
      })}

      {/* Contrôles */}
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate={!topView}
        maxPolarAngle={topView ? 0 : Math.PI / 2.1}
        target={[0, 0, 0]}
      />
    </>
  );
}

function Plan2DTexture({ url }: { url: string }) {
  const tex = new THREE.TextureLoader().load(url);
  return <meshStandardMaterial map={tex} roughness={0.8} />;
}

function RoomOutline({ settings }: { settings: { longueur: number; largeur: number; hauteur: number } }) {
  const { longueur, largeur, hauteur } = settings;
  const color = "#CBD5E1";
  const th = 0.05;
  return (
    <group>
      {/* 4 murs fil de fer */}
      {[
        { pos: [0, hauteur / 2, -largeur / 2] as [number,number,number], size: [longueur, hauteur, th] as [number,number,number] },
        { pos: [0, hauteur / 2, largeur / 2] as [number,number,number], size: [longueur, hauteur, th] as [number,number,number] },
        { pos: [-longueur / 2, hauteur / 2, 0] as [number,number,number], size: [th, hauteur, largeur] as [number,number,number] },
        { pos: [longueur / 2, hauteur / 2, 0] as [number,number,number], size: [th, hauteur, largeur] as [number,number,number] },
      ].map((w, i) => (
        <mesh key={i} position={w.pos}>
          <boxGeometry args={w.size} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Helpers couleur
// ---------------------------------------------------------------------------

function lighten(hex: string, amount: number): string {
  try {
    const c = new THREE.Color(hex);
    c.r = Math.min(1, c.r + amount);
    c.g = Math.min(1, c.g + amount);
    c.b = Math.min(1, c.b + amount);
    return `#${c.getHexString()}`;
  } catch { return hex; }
}

function darken(hex: string, amount: number): string {
  try {
    const c = new THREE.Color(hex);
    c.r = Math.max(0, c.r - amount);
    c.g = Math.max(0, c.g - amount);
    c.b = Math.max(0, c.b - amount);
    return `#${c.getHexString()}`;
  } catch { return hex; }
}

// ---------------------------------------------------------------------------
// Composant principal — Éditeur 3D
// ---------------------------------------------------------------------------

export function Editeur3D({
  projet,
  plans2D,
}: {
  projet: ProjetInfo;
  plans2D: Plan2D[];
}) {
  // État scène
  const [elements, setElements] = useState<SceneEl[]>(() => {
    try { return JSON.parse(projet.scene) as SceneEl[]; } catch { return []; }
  });
  const [settings, setSettings] = useState(() => {
    try { return { longueur: 10, largeur: 8, hauteur: 2.7, ...JSON.parse(projet.settings) }; }
    catch { return { longueur: 10, largeur: 8, hauteur: 2.7 }; }
  });

  // UI state
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [searchLib, setSearchLib] = useState("");
  const [categorieFiltree, setCategorieFiltree] = useState<string | null>(null);
  const [panelDroit, setPanelDroit] = useState<"proprietes" | "bim" | "parametres">("proprietes");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [topView, setTopView] = useState(false);
  const [plan2DUrl, setPlan2DUrl] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(true);

  const selectedEl = elements.find((e) => e.uid === selectedUid) ?? null;
  const selectedDef = selectedEl ? getElement3D(selectedEl.elementId) : null;

  // Bibliothèque filtrée
  const libFiltered = TOUS_ELEMENTS_3D.filter((e) => {
    if (categorieFiltree && e.categorie !== categorieFiltree) return false;
    if (searchLib && !e.nom.toLowerCase().includes(searchLib.toLowerCase()) &&
        !e.sousCategorie.toLowerCase().includes(searchLib.toLowerCase())) return false;
    return true;
  });

  // Ajouter un élément
  const ajouterElement = useCallback((def: Element3DDef) => {
    const uid = `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newEl: SceneEl = {
      uid,
      elementId: def.id,
      pos: [0, def.dim[1] / 2, 0],
      rot: [0, 0, 0],
      dim: [...def.dim] as [number, number, number],
      couleur: def.couleur,
      visible: true,
      label: def.nom,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedUid(uid);
  }, []);

  // Supprimer élément sélectionné
  const supprimerElement = useCallback(() => {
    if (!selectedUid) return;
    setElements((prev) => prev.filter((e) => e.uid !== selectedUid));
    setSelectedUid(null);
  }, [selectedUid]);

  // Dupliquer élément sélectionné
  const dupliquerElement = useCallback(() => {
    if (!selectedEl) return;
    const uid = `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setElements((prev) => [...prev, { ...selectedEl, uid, pos: [selectedEl.pos[0] + 0.5, selectedEl.pos[1], selectedEl.pos[2] + 0.5] }]);
    setSelectedUid(uid);
  }, [selectedEl]);

  // Mise à jour position/rotation/dim élément
  const updateEl = useCallback((uid: string, patch: Partial<SceneEl>) => {
    setElements((prev) => prev.map((e) => e.uid === uid ? { ...e, ...patch } : e));
  }, []);

  // Sauvegarder
  const sauvegarder = useCallback(async () => {
    setSaving(true);
    await sauvegarderScene(projet.id, JSON.stringify(elements), JSON.stringify(settings));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [projet.id, elements, settings]);

  // Sauvegarde auto toutes les 60s
  useEffect(() => {
    const t = setInterval(sauvegarder, 60_000);
    return () => clearInterval(t);
  }, [sauvegarder]);

  // Export BIM CSV
  const exportBIM = useCallback(() => {
    const rows = elements.map((el) => {
      const def = getElement3D(el.elementId);
      if (!def) return null;
      return [
        el.label ?? def.nom,
        def.categorie,
        def.sousCategorie,
        def.bim.materiau,
        def.bim.fabricant ?? "",
        def.bim.reference ?? "",
        def.bim.norme ?? "",
        def.bim.coutUHT ?? "",
        def.bim.unite ?? "",
        el.dim[0].toFixed(2),
        el.dim[1].toFixed(2),
        el.dim[2].toFixed(2),
        `${el.pos[0].toFixed(2)};${el.pos[1].toFixed(2)};${el.pos[2].toFixed(2)}`,
      ];
    }).filter(Boolean) as string[][];

    const header = ["Désignation","Catégorie","Sous-catégorie","Matériau","Fabricant","Référence","Norme","Prix HT","Unité","Long. (m)","Haut. (m)","Prof. (m)","Position XYZ"];
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BIM_${projet.titre}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [elements, projet.titre]);

  // Import plan 2D comme fond
  const importerPlan2D = useCallback((fichier: string) => {
    setPlan2DUrl(fichier.startsWith("/") ? fichier : `/${fichier}`);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-900" style={{ marginTop: "-24px", marginLeft: "-24px", marginRight: "-24px", width: "calc(100% + 48px)" }}>

      {/* ── Toolbar haut ── */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-700 bg-slate-800 px-3">
        <Link href="/conception/3d" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-300 hover:bg-slate-700 text-sm">
          <ChevronLeft className="h-4 w-4" />
          Projets
        </Link>

        <span className="text-slate-600">|</span>
        <span className="text-sm font-semibold text-white truncate max-w-48">{projet.titre}</span>
        {projet.chantierNom && (
          <span className="text-xs text-slate-400">— {projet.chantierNom}</span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Vue dessus / perspective */}
          <button
            onClick={() => setTopView((v) => !v)}
            title={topView ? "Vue perspective" : "Vue de dessus (plan 2D)"}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${topView ? "bg-violet-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            {topView ? "Dessus" : "3D"}
          </button>

          {/* Bibliothèque toggle */}
          <button
            onClick={() => setShowLibrary((v) => !v)}
            className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600 flex items-center gap-1"
          >
            <Layers className="h-3.5 w-3.5" />
            Lib.
          </button>

          {/* Export BIM */}
          <button
            onClick={exportBIM}
            className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600 flex items-center gap-1"
            title="Exporter données BIM en CSV"
          >
            <Download className="h-3.5 w-3.5" />
            Export BIM
          </button>

          {/* Sauvegarder */}
          <button
            onClick={sauvegarder}
            disabled={saving}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${saved ? "bg-emerald-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700"} disabled:opacity-60`}
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? "Sauvegardé ✓" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* ── Corps principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panneau gauche — Bibliothèque */}
        {showLibrary && (
          <div className="flex w-60 shrink-0 flex-col border-r border-slate-700 bg-slate-800 overflow-hidden">
            <div className="p-2 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchLib}
                  onChange={(e) => setSearchLib(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full rounded-lg bg-slate-700 pl-7 pr-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Catégories */}
            <div className="flex gap-1 overflow-x-auto px-2 py-1.5 border-b border-slate-700">
              <button
                onClick={() => setCategorieFiltree(null)}
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${!categorieFiltree ? "bg-violet-600 text-white" : "bg-slate-700 text-slate-300"}`}
              >
                Tout
              </button>
              {Object.entries(CATEGORIES_3D).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => setCategorieFiltree(key === categorieFiltree ? null : key)}
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${categorieFiltree === key ? "bg-violet-600 text-white" : "bg-slate-700 text-slate-300"}`}
                  title={cat.label}
                >
                  {cat.emoji}
                </button>
              ))}
            </div>

            {/* Plan 2D comme fond */}
            {plans2D.length > 0 && (
              <div className="px-2 py-1.5 border-b border-slate-700">
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Plan 2D → sol 3D</p>
                {plans2D.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => importerPlan2D(p.fichier)}
                    className="w-full text-left rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-700 hover:text-slate-200 flex items-center gap-1"
                  >
                    <ImageIcon className="h-3 w-3" />
                    <span className="truncate">{p.titre}</span>
                  </button>
                ))}
                {plan2DUrl && (
                  <button onClick={() => setPlan2DUrl(null)} className="w-full text-left rounded px-2 py-1 text-[10px] text-red-400 hover:bg-slate-700 mt-0.5">
                    ✕ Retirer plan 2D
                  </button>
                )}
              </div>
            )}

            {/* Liste éléments */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
              {Object.entries(CATEGORIES_3D).map(([catKey, catInfo]) => {
                const items = libFiltered.filter((e) => e.categorie === catKey);
                if (items.length === 0) return null;
                return (
                  <div key={catKey} className="mb-3">
                    <p className="sticky top-0 bg-slate-800 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      {catInfo.emoji} {catInfo.label}
                    </p>
                    {items.map((def) => (
                      <button
                        key={def.id}
                        onClick={() => ajouterElement(def)}
                        className="group w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-700 transition-colors"
                      >
                        <div
                          className="h-6 w-6 shrink-0 rounded flex items-center justify-center text-xs"
                          style={{ backgroundColor: def.couleur + "33" }}
                        >
                          <span style={{ color: def.couleur }}>{def.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-300 truncate group-hover:text-white">{def.nom}</p>
                          <p className="text-[9px] text-slate-500">{def.dim[0]}×{def.dim[1]}×{def.dim[2]}m</p>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Canvas 3D */}
        <div className="flex-1 relative">
          <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: false }}
            style={{ background: topView ? "#F0F4F8" : "#1a1f2e" }}
          >
            {topView ? (
              <OrthographicCamera makeDefault position={[0, 30, 0]} zoom={30} />
            ) : (
              <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={50} />
            )}
            <Suspense fallback={null}>
              <Scene
                elements={elements}
                selectedUid={selectedUid}
                onSelect={setSelectedUid}
                settings={settings}
                plan2DUrl={plan2DUrl}
                topView={topView}
              />
              {!topView && <Environment preset="city" />}
            </Suspense>
          </Canvas>

          {/* Badge info barre de statut */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
            <span className="rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
              {elements.length} élément{elements.length !== 1 ? "s" : ""}
              {" · "}
              {settings.longueur}×{settings.largeur}m · H{settings.hauteur}m
            </span>
            {topView && (
              <span className="rounded-full bg-violet-700/80 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
                Vue de dessus — Plan 2D
              </span>
            )}
          </div>

          {/* Tip */}
          <div className="absolute top-3 left-3 text-[10px] text-white/40 pointer-events-none">
            Clic gauche : sélectionner · Scroll : zoom · Clic droit : orbite
          </div>
        </div>

        {/* Panneau droit — Propriétés / BIM / Paramètres */}
        <div className="flex w-64 shrink-0 flex-col border-l border-slate-700 bg-slate-800 overflow-hidden">

          {/* Onglets */}
          <div className="flex border-b border-slate-700">
            {(["proprietes", "bim", "parametres"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPanelDroit(tab)}
                className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors ${panelDroit === tab ? "bg-slate-700 text-violet-400 border-b-2 border-violet-500" : "text-slate-500 hover:text-slate-300"}`}
              >
                {tab === "proprietes" ? "Propriétés" : tab === "bim" ? "BIM" : "Scène"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">

            {/* ── Propriétés ── */}
            {panelDroit === "proprietes" && (
              <>
                {selectedEl && selectedDef ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedDef.emoji}</span>
                      <div>
                        <p className="text-xs font-semibold text-white">{selectedDef.nom}</p>
                        <p className="text-[10px] text-slate-400">{selectedDef.sousCategorie}</p>
                      </div>
                    </div>

                    {/* Étiquette */}
                    <div>
                      <label className="block mb-1 text-[10px] text-slate-400 uppercase tracking-wide">Étiquette</label>
                      <input
                        value={selectedEl.label ?? ""}
                        onChange={(e) => updateEl(selectedEl.uid, { label: e.target.value })}
                        className="w-full rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    {/* Dimensions */}
                    <div>
                      <label className="block mb-1 text-[10px] text-slate-400 uppercase tracking-wide">Dimensions (m)</label>
                      <div className="grid grid-cols-3 gap-1">
                        {["L","H","P"].map((axis, i) => (
                          <div key={axis}>
                            <p className="text-[9px] text-slate-500 text-center mb-0.5">{axis}</p>
                            <input
                              type="number"
                              step={0.01}
                              value={selectedEl.dim[i]}
                              onChange={(e) => {
                                const newDim = [...selectedEl.dim] as [number, number, number];
                                newDim[i] = parseFloat(e.target.value) || 0.1;
                                // Ajuster position Y si hauteur change
                                const newPos = [...selectedEl.pos] as [number, number, number];
                                if (i === 1) newPos[1] = newDim[1] / 2;
                                updateEl(selectedEl.uid, { dim: newDim, pos: newPos });
                              }}
                              className="w-full rounded bg-slate-700 px-1 py-1 text-center text-xs text-slate-200 outline-none focus:ring-1 focus:ring-violet-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Position */}
                    <div>
                      <label className="block mb-1 text-[10px] text-slate-400 uppercase tracking-wide">Position (m)</label>
                      <div className="grid grid-cols-3 gap-1">
                        {["X","Y","Z"].map((axis, i) => (
                          <div key={axis}>
                            <p className="text-[9px] text-slate-500 text-center mb-0.5">{axis}</p>
                            <input
                              type="number"
                              step={0.1}
                              value={selectedEl.pos[i].toFixed(2)}
                              onChange={(e) => {
                                const newPos = [...selectedEl.pos] as [number, number, number];
                                newPos[i] = parseFloat(e.target.value) || 0;
                                updateEl(selectedEl.uid, { pos: newPos });
                              }}
                              className="w-full rounded bg-slate-700 px-1 py-1 text-center text-xs text-slate-200 outline-none focus:ring-1 focus:ring-violet-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rotation */}
                    <div>
                      <label className="block mb-1 text-[10px] text-slate-400 uppercase tracking-wide">Rotation (°)</label>
                      <div className="grid grid-cols-3 gap-1">
                        {["X","Y","Z"].map((axis, i) => (
                          <div key={axis}>
                            <p className="text-[9px] text-slate-500 text-center mb-0.5">{axis}</p>
                            <input
                              type="number"
                              step={5}
                              value={Math.round((selectedEl.rot[i] * 180) / Math.PI)}
                              onChange={(e) => {
                                const newRot = [...selectedEl.rot] as [number, number, number];
                                newRot[i] = (parseFloat(e.target.value) || 0) * (Math.PI / 180);
                                updateEl(selectedEl.uid, { rot: newRot });
                              }}
                              className="w-full rounded bg-slate-700 px-1 py-1 text-center text-xs text-slate-200 outline-none focus:ring-1 focus:ring-violet-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Couleur */}
                    <div>
                      <label className="block mb-1 text-[10px] text-slate-400 uppercase tracking-wide">Couleur</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedEl.couleur}
                          onChange={(e) => updateEl(selectedEl.uid, { couleur: e.target.value })}
                          className="h-8 w-14 cursor-pointer rounded border-0 bg-transparent"
                        />
                        <span className="text-xs text-slate-400 font-mono">{selectedEl.couleur}</span>
                      </div>
                    </div>

                    {/* Visibilité */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">Visible</span>
                      <button
                        onClick={() => updateEl(selectedEl.uid, { visible: !selectedEl.visible })}
                        className={`rounded-lg px-2 py-1 text-xs flex items-center gap-1 ${selectedEl.visible ? "bg-emerald-700 text-emerald-200" : "bg-slate-700 text-slate-400"}`}
                      >
                        {selectedEl.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {selectedEl.visible ? "Oui" : "Non"}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1 border-t border-slate-700">
                      <button onClick={dupliquerElement} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-slate-700 py-1.5 text-xs text-slate-300 hover:bg-slate-600">
                        <Copy className="h-3.5 w-3.5" /> Dupliquer
                      </button>
                      <button onClick={supprimerElement} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-900/50 py-1.5 text-xs text-red-400 hover:bg-red-900">
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Box className="mb-2 h-8 w-8 text-slate-600" />
                    <p className="text-xs text-slate-500">Sélectionnez un élément<br />ou ajoutez-en un depuis la bibliothèque</p>
                  </div>
                )}

                {/* Liste éléments scène */}
                {elements.length > 0 && (
                  <div className="mt-4 border-t border-slate-700 pt-3">
                    <p className="mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Scène ({elements.length})</p>
                    <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                      {elements.map((el) => {
                        const def = getElement3D(el.elementId);
                        return (
                          <button
                            key={el.uid}
                            onClick={() => setSelectedUid(el.uid === selectedUid ? null : el.uid)}
                            className={`flex items-center gap-2 rounded px-2 py-1 text-left text-[11px] transition-colors ${el.uid === selectedUid ? "bg-violet-700 text-white" : "text-slate-400 hover:bg-slate-700"}`}
                          >
                            <span>{def?.emoji ?? "📦"}</span>
                            <span className="truncate">{el.label ?? def?.nom ?? el.elementId}</span>
                            {!el.visible && <EyeOff className="ml-auto h-3 w-3 shrink-0 text-slate-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── BIM ── */}
            {panelDroit === "bim" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-white">Données BIM</p>
                {selectedEl && selectedDef ? (
                  <>
                    <div className="rounded-lg bg-slate-700 p-3 flex flex-col gap-2 text-xs">
                      {[
                        ["Élément", selectedDef.nom],
                        ["Catégorie", CATEGORIES_3D[selectedDef.categorie]?.label ?? selectedDef.categorie],
                        ["Matériau", selectedDef.bim.materiau],
                        ["Fabricant", selectedDef.bim.fabricant ?? "—"],
                        ["Référence", selectedDef.bim.reference ?? "—"],
                        ["Norme", selectedDef.bim.norme ?? "—"],
                        ["Prix unitaire HT", selectedDef.bim.coutUHT ? `${selectedDef.bim.coutUHT} €/${selectedDef.bim.unite}` : "—"],
                        ["L × H × P", `${selectedEl.dim[0]}m × ${selectedEl.dim[1]}m × ${selectedEl.dim[2]}m`],
                        ["Roughness", selectedDef.roughness.toFixed(2)],
                        ["Metalness", selectedDef.metalness.toFixed(2)],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-slate-400 shrink-0">{k}</span>
                          <span className="text-slate-200 text-right">{v}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={exportBIM}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-700 py-2 text-xs font-semibold text-white hover:bg-violet-600"
                    >
                      <Download className="h-3.5 w-3.5" /> Exporter tous les BIM CSV
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Sélectionnez un élément pour voir sa fiche BIM</p>
                )}

                {/* Récap coût total */}
                {elements.length > 0 && (
                  <div className="mt-2 rounded-lg bg-slate-700 p-3">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-2">Récapitulatif coûts estimatifs</p>
                    {(() => {
                      let total = 0;
                      const lignes: { nom: string; cout: number }[] = [];
                      elements.forEach((el) => {
                        const def = getElement3D(el.elementId);
                        if (def?.bim.coutUHT) {
                          const cout = def.bim.coutUHT;
                          total += cout;
                          lignes.push({ nom: el.label ?? def.nom, cout });
                        }
                      });
                      return (
                        <>
                          {lignes.slice(0, 6).map((l, i) => (
                            <div key={i} className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                              <span className="truncate">{l.nom}</span>
                              <span className="ml-2 shrink-0 text-amber-400">{l.cout.toLocaleString("fr-FR")} €</span>
                            </div>
                          ))}
                          {lignes.length > 6 && <p className="text-[10px] text-slate-500">+{lignes.length - 6} autres…</p>}
                          <div className="mt-2 border-t border-slate-600 pt-2 flex justify-between text-xs font-bold text-white">
                            <span>Total estimatif HT</span>
                            <span className="text-amber-400">{total.toLocaleString("fr-FR")} €</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ── Paramètres scène ── */}
            {panelDroit === "parametres" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-white">Paramètres de la pièce</p>

                {[
                  { key: "longueur", label: "Longueur (m)", min: 1, max: 100 },
                  { key: "largeur", label: "Largeur (m)", min: 1, max: 100 },
                  { key: "hauteur", label: "Hauteur (m)", min: 1.5, max: 10 },
                ].map((p) => (
                  <div key={p.key}>
                    <label className="block mb-1 text-[10px] text-slate-400 uppercase tracking-wide">{p.label}</label>
                    <input
                      type="number"
                      step={0.5}
                      min={p.min}
                      max={p.max}
                      value={(settings as Record<string, number>)[p.key]}
                      onChange={(e) => setSettings((s: Record<string, number>) => ({ ...s, [p.key]: parseFloat(e.target.value) || p.min }))}
                      className="w-full rounded bg-slate-700 px-2 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                ))}

                <div className="mt-2 rounded-lg bg-slate-700 p-3 text-xs text-slate-300 space-y-1">
                  <p>Surface sol : <strong>{(settings.longueur * settings.largeur).toFixed(1)} m²</strong></p>
                  <p>Volume : <strong>{(settings.longueur * settings.largeur * settings.hauteur).toFixed(1)} m³</strong></p>
                </div>

                <div className="mt-2 border-t border-slate-700 pt-3 flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm("Dupliquer ce projet ?")) return;
                      await dupliquerProjet3D(projet.id);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-700 py-2 text-xs text-slate-300 hover:bg-slate-600"
                  >
                    <Copy className="h-3.5 w-3.5" /> Dupliquer le projet
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Supprimer définitivement ce projet 3D ?")) return;
                      await supprimerProjet3D(projet.id);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-red-900/50 py-2 text-xs text-red-400 hover:bg-red-900"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer le projet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

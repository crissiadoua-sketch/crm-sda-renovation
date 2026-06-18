"use client";

import { useState, useRef, useTransition, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  BookMarked, ChevronLeft, Save, Printer, Send, CheckCircle2,
  Plus, Trash2, GripVertical, Eye, EyeOff, FileText, Paperclip,
  Building2, Euro, Calendar, User, AlertCircle, Copy, X,
  RotateCcw, Download, Mail,
} from "lucide-react";
import {
  sauvegarderToutesSections,
  changerStatut,
  ajouterSection,
  supprimerSection,
  ajouterAnnexe,
  supprimerAnnexe,
  mettreAJourMetadonnees,
  dupliquerMemoire,
  supprimerMemoire,
} from "@/lib/actions/memoire-technique";
import { TYPE_LABELS, MODELE_LABELS, STATUT_LABELS, STATUT_COLORS } from "@/lib/memoire-technique";
import type { TypeMemoire, ModeleMemoire } from "@/lib/memoire-technique";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectionData {
  titre: string;
  contenu: string;
  visible: boolean;
  ordre: number;
  nbPages: number;
  custom?: boolean;
}

interface AnnexeData {
  id: string;
  titre: string;
  fichier: string;
  type: string;
  taille?: number;
  createdAt: string;
}

interface MtData {
  id: string;
  reference: string;
  titre: string;
  type: string;
  modele: string;
  statut: string;
  maitreOuvrage: string | null;
  objetMarche: string | null;
  lotNumero: string | null;
  lotDesignation: string | null;
  montantEstime: number | null;
  dateRemise: string | null;
  sections: Record<string, SectionData>;
  annexes: AnnexeData[];
  chantier: {
    id: string;
    nom: string;
    adresse: string | null;
    description: string | null;
    dateDebut: string | null;
    dateFin: string | null;
    client: { nom: string; prenom: string | null; raisonSociale: string | null; email: string | null; telephone: string | null } | null;
  };
  devis: { id: string; numero: string; objet: string | null; totalHT: number | null } | null;
}

// ---------------------------------------------------------------------------
// Constantes couleurs SDA
// ---------------------------------------------------------------------------

const COULEUR_NAVY   = "#1E2F6E";
const COULEUR_ORANGE = "#F7941E";
const COULEUR_BLUE   = "#29ABE2";

// ---------------------------------------------------------------------------
// Composant éditeur principal
// ---------------------------------------------------------------------------

export function EditeurMemoire({
  mt: initialMt,
  devisDisponibles,
}: {
  mt: MtData;
  devisDisponibles: { id: string; numero: string; objet: string | null }[];
}) {
  const [mt] = useState<MtData>(initialMt);
  const [sections, setSections] = useState<Record<string, SectionData>>(initialMt.sections);
  const [annexes, setAnnexes] = useState<AnnexeData[]>(initialMt.annexes);
  const [activeSection, setActiveSection] = useState<string | null>(() => {
    const keys = Object.keys(initialMt.sections).sort(
      (a, b) => (initialMt.sections[a].ordre ?? 0) - (initialMt.sections[b].ordre ?? 0)
    );
    return keys.find((k) => k !== "s11_annexes") ?? keys[0] ?? null;
  });
  const [activeTab, setActiveTab] = useState<"sections" | "annexes" | "infos">("sections");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [nouvelleSection, setNouvelleSection] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tri des sections par ordre
  const sectionKeys = Object.keys(sections).sort(
    (a, b) => (sections[a]?.ordre ?? 0) - (sections[b]?.ordre ?? 0)
  );
  const mainSections = sectionKeys.filter((k) => (sections[k]?.ordre ?? 0) < 99);
  const annexeSectionKey = sectionKeys.find((k) => (sections[k]?.ordre ?? 0) >= 99);

  // Auto-save toutes les 45s
  useEffect(() => {
    const timer = setInterval(async () => {
      await sauvegarderToutesSections(mt.id, sections as Record<string, unknown>);
    }, 45_000);
    return () => clearInterval(timer);
  }, [mt.id, sections]);

  const handleContenuChange = useCallback((key: string, contenu: string) => {
    setSections((prev) => ({
      ...prev,
      [key]: { ...prev[key], contenu },
    }));
    setSaved(false);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      await sauvegarderToutesSections(mt.id, {
        ...sections,
        [key]: { ...sections[key], contenu },
      } as Record<string, unknown>);
      setSaved(true);
    }, 2000);
  }, [mt.id, sections]);

  const handleSaveAll = async () => {
    setSaving(true);
    await sauvegarderToutesSections(mt.id, sections as Record<string, unknown>);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleVisible = (key: string) => {
    setSections((prev) => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible },
    }));
  };

  const handleAjouterSection = () => {
    if (!nouvelleSection.trim()) return;
    startTransition(async () => {
      await ajouterSection(mt.id, nouvelleSection.trim());
      setNouvelleSection("");
      setShowAddSection(false);
    });
  };

  const handleSupprimerSection = (key: string) => {
    if (!confirm(`Supprimer la section "${sections[key]?.titre}" ?`)) return;
    startTransition(async () => {
      await supprimerSection(mt.id, key);
      setSections((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (activeSection === key) setActiveSection(mainSections[0] ?? null);
    });
  };

  const handleStatut = (statut: "BROUILLON" | "FINALISE" | "ENVOYE") => {
    startTransition(async () => {
      await changerStatut(mt.id, statut);
    });
  };

  const handleAnnexeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("memoireId", mt.id);
    const res = await fetch("/api/upload-annexe", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json() as { fichier: string; taille: number };
      const annexe: AnnexeData = {
        id: `annx_${Date.now()}`,
        titre: file.name,
        fichier: data.fichier,
        type: file.type || "application/octet-stream",
        taille: data.taille,
        createdAt: new Date().toISOString(),
      };
      await ajouterAnnexe(mt.id, annexe);
      setAnnexes((prev) => [...prev, annexe]);
    }
  };

  const handleSupprimerAnnexe = async (annexeId: string) => {
    if (!confirm("Supprimer cette annexe ?")) return;
    await supprimerAnnexe(mt.id, annexeId);
    setAnnexes((prev) => prev.filter((a) => a.id !== annexeId));
  };

  const handleDupliquer = () => {
    if (!confirm("Dupliquer ce mémoire technique ?")) return;
    startTransition(async () => { await dupliquerMemoire(mt.id); });
  };

  const handleSupprimer = () => {
    if (!confirm(`Supprimer définitivement "${mt.titre}" ? Cette action est irréversible.`)) return;
    startTransition(async () => { await supprimerMemoire(mt.id); });
  };

  const currentSection = activeSection ? sections[activeSection] : null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      {/* ─── PANNEAU GAUCHE — Navigation sections ─── */}
      <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-y-auto">
        {/* Header */}
        <div className="p-3 border-b border-slate-100">
          <Link
            href="/memoires-techniques"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-navy mb-2"
          >
            <ChevronLeft className="h-3 w-3" /> Retour
          </Link>
          <div className="flex items-center gap-1.5 mb-0.5">
            <BookMarked className="h-4 w-4 text-brand-navy" />
            <span className="text-xs font-bold text-brand-navy truncate">{mt.reference}</span>
          </div>
          <p className="text-[11px] text-slate-500 line-clamp-2 font-medium">{mt.titre}</p>

          {/* Statut */}
          <div className="mt-2 flex gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUT_COLORS[mt.statut] ?? ""}`}>
              {STATUT_LABELS[mt.statut] ?? mt.statut}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
              {TYPE_LABELS[mt.type as TypeMemoire]?.split("—")[0].trim()}
            </span>
          </div>
        </div>

        {/* Onglets nav */}
        <div className="flex border-b border-slate-100">
          {(["sections", "annexes", "infos"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 text-[11px] font-semibold transition-colors ${
                activeTab === t
                  ? "border-b-2 border-brand-navy text-brand-navy"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "sections" ? "Sections" : t === "annexes" ? `Annexes (${annexes.length})` : "Infos"}
            </button>
          ))}
        </div>

        {/* Contenu panneau gauche */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "sections" && (
            <nav className="p-2 flex flex-col gap-0.5">
              {mainSections.map((key) => {
                const s = sections[key];
                if (!s) return null;
                return (
                  <button
                    key={key}
                    onClick={() => { setActiveSection(key); setActiveTab("sections"); }}
                    className={`w-full flex items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      activeSection === key
                        ? "bg-brand-navy text-white"
                        : s.visible
                        ? "text-slate-700 hover:bg-slate-50"
                        : "text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {s.visible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3 opacity-50" />
                      )}
                    </span>
                    <span className="text-[11px] font-medium leading-snug">{s.titre}</span>
                    {s.nbPages > 0 && (
                      <span className={`ml-auto shrink-0 text-[10px] ${activeSection === key ? "text-white/70" : "text-slate-400"}`}>
                        {s.nbPages}p
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Bouton ajouter section */}
              {showAddSection ? (
                <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    autoFocus
                    value={nouvelleSection}
                    onChange={(e) => setNouvelleSection(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAjouterSection(); if (e.key === "Escape") setShowAddSection(false); }}
                    placeholder="Titre de la section…"
                    className="w-full text-xs px-2 py-1 border border-slate-200 rounded mb-1.5 focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <button onClick={handleAjouterSection} disabled={isPending} className="flex-1 bg-brand-navy text-white text-[10px] rounded py-1 font-semibold">
                      Ajouter
                    </button>
                    <button onClick={() => setShowAddSection(false)} className="px-2 text-slate-400 hover:text-slate-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddSection(true)}
                  className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-2.5 py-2 text-[11px] text-slate-400 hover:border-brand-navy/40 hover:text-brand-navy w-full"
                >
                  <Plus className="h-3 w-3" /> Ajouter une section
                </button>
              )}
            </nav>
          )}

          {activeTab === "annexes" && (
            <div className="p-2 flex flex-col gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-[11px] text-slate-500 hover:border-brand-orange/60 hover:text-brand-orange transition-colors">
                <Paperclip className="h-3.5 w-3.5" />
                Ajouter un fichier
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mpp,.csv" onChange={handleAnnexeUpload} />
              </label>
              <p className="text-[10px] text-slate-400 px-1">PDF, Word, Excel, Canva, MS Project, Photos…</p>

              {annexes.length === 0 ? (
                <p className="text-[11px] text-slate-400 px-2 py-3 text-center">Aucune annexe</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {annexes.map((a) => (
                    <div key={a.id} className="group flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 border border-slate-100">
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-700 truncate">{a.titre}</p>
                        {a.taille && (
                          <p className="text-[10px] text-slate-400">{Math.round(a.taille / 1024)} Ko</p>
                        )}
                      </div>
                      <a href={`/storage/uploads/${a.fichier}`} download className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="h-3 w-3 text-slate-400 hover:text-brand-blue" />
                      </a>
                      <button onClick={() => handleSupprimerAnnexe(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3 w-3 text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "infos" && (
            <div className="p-3 flex flex-col gap-3 text-[11px]">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 uppercase tracking-wide font-semibold text-[10px]">Chantier</span>
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Building2 className="h-3 w-3 text-brand-navy" />
                  {mt.chantier.nom}
                </span>
                {mt.chantier.adresse && <span className="text-slate-500 pl-4">{mt.chantier.adresse}</span>}
              </div>

              {mt.chantier.client && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 uppercase tracking-wide font-semibold text-[10px]">Client</span>
                  <span className="flex items-center gap-1 text-slate-700">
                    <User className="h-3 w-3 text-brand-navy" />
                    {mt.chantier.client.raisonSociale || `${mt.chantier.client.prenom ?? ""} ${mt.chantier.client.nom}`.trim()}
                  </span>
                </div>
              )}

              {mt.maitreOuvrage && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 uppercase tracking-wide font-semibold text-[10px]">Maître d'ouvrage</span>
                  <span className="text-slate-700">{mt.maitreOuvrage}</span>
                </div>
              )}

              {mt.objetMarche && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 uppercase tracking-wide font-semibold text-[10px]">Objet du marché</span>
                  <span className="text-slate-700">{mt.objetMarche}</span>
                </div>
              )}

              {mt.lotNumero && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 uppercase tracking-wide font-semibold text-[10px]">Lot</span>
                  <span className="text-slate-700">N°{mt.lotNumero} — {mt.lotDesignation}</span>
                </div>
              )}

              {mt.montantEstime && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 uppercase tracking-wide font-semibold text-[10px]">Montant estimé</span>
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <Euro className="h-3 w-3" />
                    {mt.montantEstime.toLocaleString("fr-FR")} HT
                  </span>
                </div>
              )}

              {mt.dateRemise && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 uppercase tracking-wide font-semibold text-[10px]">Date de remise</span>
                  <span className="flex items-center gap-1 text-slate-700">
                    <Calendar className="h-3 w-3" />
                    {new Date(mt.dateRemise).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}

              {mt.devis && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 uppercase tracking-wide font-semibold text-[10px]">Devis lié</span>
                  <span className="flex items-center gap-1 text-slate-700">
                    <FileText className="h-3 w-3" />
                    {mt.devis.numero} {mt.devis.totalHT ? `— ${mt.devis.totalHT.toLocaleString("fr-FR")} € HT` : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ─── CONTENU CENTRAL — Éditeur de section ─── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Barre d'outils */}
        <div className="flex items-center gap-2 bg-white border-b border-slate-200 px-4 py-2.5 shrink-0">
          <div className="flex-1 flex items-center gap-2">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue transition-colors disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Sauvegarde…" : "Enregistrer"}
            </button>

            {saved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sauvegardé
              </span>
            )}

            {/* Toggle visibilité section */}
            {activeSection && sections[activeSection] && (
              <button
                onClick={() => toggleVisible(activeSection)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-slate-300"
              >
                {sections[activeSection].visible ? (
                  <><Eye className="h-3.5 w-3.5" /> Visible</>
                ) : (
                  <><EyeOff className="h-3.5 w-3.5 text-slate-400" /> Masquée</>
                )}
              </button>
            )}

            {/* Supprimer section custom */}
            {activeSection && sections[activeSection]?.custom && (
              <button
                onClick={() => handleSupprimerSection(activeSection)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Statuts */}
            <div className="flex items-center gap-1">
              {(["BROUILLON", "FINALISE", "ENVOYE"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatut(s)}
                  disabled={mt.statut === s || isPending}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all disabled:opacity-50 ${
                    mt.statut === s
                      ? STATUT_COLORS[s]
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {STATUT_LABELS[s]}
                </button>
              ))}
            </div>

            {/* Aperçu PDF */}
            <Link
              href={`/apercu/memoire-technique/${mt.id}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-brand-navy/40 hover:text-brand-navy transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> PDF / Imprimer
            </Link>

            {/* Dupliquer */}
            <button
              onClick={handleDupliquer}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-slate-300"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            {/* Supprimer */}
            <button
              onClick={handleSupprimer}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Zone d'édition */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentSection ? (
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
              {/* Titre de la section */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-brand-navy">{currentSection.titre}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {currentSection.nbPages > 0 && (
                    <span>{currentSection.nbPages} page{currentSection.nbPages > 1 ? "s" : ""} prévue{currentSection.nbPages > 1 ? "s" : ""}</span>
                  )}
                  {!currentSection.visible && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <EyeOff className="h-3.5 w-3.5" /> Section masquée dans le PDF
                    </span>
                  )}
                </div>
              </div>

              {/* Barre de mise en forme */}
              <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-100 p-2">
                {[
                  { label: "**Gras**", insert: "**texte**" },
                  { label: "*Italique*", insert: "*texte*" },
                  { label: "• Liste", insert: "\n• Élément 1\n• Élément 2" },
                  { label: "Tableau", insert: "\n| Colonne 1 | Colonne 2 |\n|-----------|----------|\n| Valeur 1  | Valeur 2 |" },
                  { label: "Titre", insert: "\n**Titre de rubrique**\n" },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={() => {
                      if (!activeSection) return;
                      const current = sections[activeSection]?.contenu ?? "";
                      handleContenuChange(activeSection, current + btn.insert);
                    }}
                    className="rounded px-2 py-1 text-xs bg-white border border-slate-200 text-slate-600 hover:border-brand-navy/40 hover:text-brand-navy transition-colors"
                  >
                    {btn.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    if (!activeSection) return;
                    const typeDef = TYPE_LABELS[mt.type as TypeMemoire];
                    const info = `\n[Mémoire ${typeDef} — ${MODELE_LABELS[mt.modele as ModeleMemoire]}]\n`;
                    handleContenuChange(activeSection, (sections[activeSection]?.contenu ?? "") + info);
                  }}
                  className="ml-auto rounded px-2 py-1 text-[10px] bg-white border border-slate-200 text-slate-400 hover:border-brand-orange/40 hover:text-brand-orange"
                >
                  <RotateCcw className="h-3 w-3 inline mr-1" />
                  Reset
                </button>
              </div>

              {/* Textarea principale */}
              <textarea
                value={currentSection.contenu}
                onChange={(e) => {
                  if (activeSection) handleContenuChange(activeSection, e.target.value);
                }}
                spellCheck
                lang="fr"
                className="w-full min-h-[520px] rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 font-mono leading-relaxed resize-y focus:border-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-navy/10 shadow-sm"
                placeholder="Saisissez le contenu de cette section…&#10;&#10;Utilisez **gras**, *italique* et • pour les listes.&#10;&#10;Le contenu est pré-rempli selon votre type de mémoire et vos données chantier."
              />

              <p className="text-[11px] text-slate-400 text-right">
                {currentSection.contenu.length} caractères · Sauvegarde automatique toutes les 45 s
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <BookMarked className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Sélectionnez une section dans le panneau gauche</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── PANNEAU DROIT — Aperçu / Actions ─── */}
      <aside className="w-64 shrink-0 flex flex-col bg-white border-l border-slate-200 overflow-y-auto">
        <div className="p-3 border-b border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Actions</p>
        </div>

        <div className="p-3 flex flex-col gap-2">
          {/* PDF / Impression */}
          <Link
            href={`/apercu/memoire-technique/${mt.id}`}
            target="_blank"
            className="flex items-center gap-2 rounded-lg bg-brand-navy px-3 py-2.5 text-xs font-semibold text-white hover:bg-brand-blue transition-colors"
          >
            <Printer className="h-4 w-4" />
            Aperçu PDF &amp; Imprimer
          </Link>

          {/* Email */}
          <a
            href={`mailto:?subject=${encodeURIComponent(`Mémoire technique — ${mt.titre}`)}&body=${encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint notre mémoire technique pour : ${mt.objetMarche ?? mt.titre}.\n\nCordialement,\nSDA Rénovation`)}`}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:border-brand-orange/50 hover:text-brand-orange transition-colors"
          >
            <Mail className="h-4 w-4" />
            Envoyer par email
          </a>

          <hr className="border-slate-100 my-1" />

          {/* Sections résumé */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Progression</p>
            <div className="flex flex-col gap-1">
              {mainSections.map((key) => {
                const s = sections[key];
                if (!s) return null;
                const rempli = (s.contenu || "").length > 100;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${rempli ? "bg-emerald-400" : "bg-slate-200"}`} />
                    <span className={`text-[10px] truncate ${rempli ? "text-slate-600" : "text-slate-400"}`}>
                      {s.titre.replace(/^\d+\.\s*/, "")}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              {mainSections.filter((k) => (sections[k]?.contenu ?? "").length > 100).length} / {mainSections.length} sections remplies
            </p>
          </div>

          <hr className="border-slate-100 my-1" />

          {/* Infos document */}
          <div className="flex flex-col gap-2 text-[11px]">
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5">
              <AlertCircle className="h-3.5 w-3.5 text-brand-orange shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">{TYPE_LABELS[mt.type as TypeMemoire]}</p>
                <p className="text-slate-500">{MODELE_LABELS[mt.modele as ModeleMemoire]}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg bg-slate-50 p-2 text-center">
                <p className="text-base font-bold text-brand-navy">{mainSections.length}</p>
                <p className="text-[10px] text-slate-400">Sections</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 text-center">
                <p className="text-base font-bold text-brand-navy">{annexes.length}</p>
                <p className="text-[10px] text-slate-400">Annexes</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-100 my-1" />

          {/* Actions danger */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleDupliquer}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:border-slate-300 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" /> Dupliquer
            </button>
            <button
              onClick={handleSupprimer}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

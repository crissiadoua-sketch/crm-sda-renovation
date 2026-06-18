"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { sauvegarderEtudeDebourse, supprimerEtudeDebourse } from "@/lib/actions/etudes-debourse";

// ─── Types ──────────────────────────────────────────────────────────────────

type ElementLocal = {
  _key: string;
  ordre: number;
  designation: string;
  unite: string;
  quantite: number;
  prixUnitaire: number;
  // type pilote la colonne cible
  type: "MATERIAU" | "MATERIEL" | "MO";
  montantMateriaux: number;
  montantMateriel: number;
  montantMO: number;
};

type PosteLocal = {
  _key: string;
  ordre: number;
  codeOuvrage: string;
  unite: string;
  designation: string;
  ouvrageId: string;
  elements: ElementLocal[];
};

type SdpLigne = {
  id: string;
  ordre: number;
  nature: string;
  designation: string;
  unite: string;
  quantite: number;
  prixUnitaireHT: number;
  totalHT: number;
};

type Ouvrage = {
  id: string;
  code: string;
  designation: string;
  unite: string | null;
  corpsEtat: string;
  sousDetailPrix: { id: string; lignes: SdpLigne[] } | null;
};

type EtudeData = {
  id: string;
  numero: string;
  titre: string | null;
  chantierId: string | null;
  devisId: string | null;
  responsable: string | null;
  coeffK: number;
  notes: string | null;
  date: string;
  totalMateriauxHT: number;
  totalMaterielHT: number;
  totalMOHT: number;
  totalDSHT: number;
  chantier: { id: string; nom: string; reference: string } | null;
  devis: { id: string; numero: string; objet: string | null } | null;
  postes: {
    id: string;
    ordre: number;
    codeOuvrage: string | null;
    unite: string | null;
    designation: string;
    ouvrageId: string | null;
    totalMateriauxHT: number;
    totalMaterielHT: number;
    totalMOHT: number;
    totalDSPoste: number;
    elements: {
      id: string;
      ordre: number;
      designation: string;
      unite: string | null;
      quantite: number;
      prixUnitaire: number;
      montantMateriaux: number;
      montantMateriel: number;
      montantMO: number;
    }[];
  }[];
};

type Props = {
  etude: EtudeData;
  chantiers: { id: string; nom: string; reference: string }[];
  devisList: { id: string; numero: string; objet: string | null }[];
  ouvrages: Ouvrage[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

let _keyCounter = 0;
function nextKey() {
  return `k${++_keyCounter}`;
}

function euro(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
}

function natureToType(nature: string): "MATERIAU" | "MATERIEL" | "MO" {
  if (nature === "MAIN_OEUVRE") return "MO";
  if (nature === "MATERIEL" || nature === "LOCATION" || nature === "SOUS_TRAITANCE") return "MATERIEL";
  return "MATERIAU";
}

function buildElement(partial: Partial<ElementLocal>): ElementLocal {
  const type = partial.type ?? "MATERIAU";
  const quantite = partial.quantite ?? 0;
  const prixUnitaire = partial.prixUnitaire ?? 0;
  const montant = quantite * prixUnitaire;
  return {
    _key: nextKey(),
    ordre: partial.ordre ?? 0,
    designation: partial.designation ?? "",
    unite: partial.unite ?? "",
    quantite,
    prixUnitaire,
    type,
    montantMateriaux: type === "MATERIAU" ? montant : 0,
    montantMateriel: type === "MATERIEL" ? montant : 0,
    montantMO: type === "MO" ? montant : 0,
  };
}

// ─── Couleurs SDA ───────────────────────────────────────────────────────────

const NAVY = "#1E2F6E";
const ORANGE = "#F7941E";
const BLUE = "#29ABE2";

// ─── Composant principal ─────────────────────────────────────────────────────

export function EdsEditor({ etude, chantiers, devisList, ouvrages }: Props) {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"synthese" | "detail">("synthese");

  // ── Champs en-tête
  const [titre, setTitre] = useState(etude.titre ?? "");
  const [chantierId, setChantierId] = useState(etude.chantierId ?? "");
  const [devisId, setDevisId] = useState(etude.devisId ?? "");
  const [responsable, setResponsable] = useState(etude.responsable ?? "");
  const [coeffK, setCoeffK] = useState(etude.coeffK);
  const [notes, setNotes] = useState(etude.notes ?? "");

  // ── Postes
  const [postes, setPostes] = useState<PosteLocal[]>(() =>
    etude.postes.map((p) => ({
      _key: nextKey(),
      ordre: p.ordre,
      codeOuvrage: p.codeOuvrage ?? "",
      unite: p.unite ?? "",
      designation: p.designation,
      ouvrageId: p.ouvrageId ?? "",
      elements: p.elements.map((e) => {
        const type: "MATERIAU" | "MATERIEL" | "MO" =
          e.montantMO > 0 ? "MO" : e.montantMateriel > 0 ? "MATERIEL" : "MATERIAU";
        return {
          _key: nextKey(),
          ordre: e.ordre,
          designation: e.designation,
          unite: e.unite ?? "",
          quantite: e.quantite,
          prixUnitaire: e.prixUnitaire,
          type,
          montantMateriaux: e.montantMateriaux,
          montantMateriel: e.montantMateriel,
          montantMO: e.montantMO,
        };
      }),
    })),
  );

  // ── Suppression confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // ─── Calculs globaux ─────────────────────────────────────────────────────

  const totaux = postes.reduce(
    (acc, p) => {
      const mat = p.elements.reduce((s, e) => s + e.montantMateriaux, 0);
      const mtl = p.elements.reduce((s, e) => s + e.montantMateriel, 0);
      const mo = p.elements.reduce((s, e) => s + e.montantMO, 0);
      return {
        mat: acc.mat + mat,
        mtl: acc.mtl + mtl,
        mo: acc.mo + mo,
      };
    },
    { mat: 0, mtl: 0, mo: 0 },
  );
  const totalDS = totaux.mat + totaux.mtl + totaux.mo;
  const totalPVHT = totalDS * coeffK;

  // ─── Mutations postes ────────────────────────────────────────────────────

  const ajouterPoste = useCallback(() => {
    setPostes((prev) => [
      ...prev,
      {
        _key: nextKey(),
        ordre: prev.length + 1,
        codeOuvrage: "",
        unite: "",
        designation: "Nouvel ouvrage",
        ouvrageId: "",
        elements: [],
      },
    ]);
  }, []);

  const supprimerPoste = useCallback((key: string) => {
    setPostes((prev) => prev.filter((p) => p._key !== key));
  }, []);

  const mettreAJourPoste = useCallback(
    (key: string, field: keyof PosteLocal, value: string) => {
      setPostes((prev) =>
        prev.map((p) => (p._key === key ? { ...p, [field]: value } : p)),
      );
    },
    [],
  );

  const appliquerOuvrage = useCallback(
    (posteKey: string, ouvrageId: string) => {
      const ouvrage = ouvrages.find((o) => o.id === ouvrageId);
      if (!ouvrage) return;
      const elementsFromSDP: ElementLocal[] = ouvrage.sousDetailPrix
        ? ouvrage.sousDetailPrix.lignes
            .sort((a, b) => a.ordre - b.ordre)
            .map((l, idx) =>
              buildElement({
                ordre: idx + 1,
                designation: l.designation,
                unite: l.unite,
                quantite: l.quantite,
                prixUnitaire: l.prixUnitaireHT,
                type: natureToType(l.nature),
              }),
            )
        : [];
      setPostes((prev) =>
        prev.map((p) =>
          p._key === posteKey
            ? {
                ...p,
                ouvrageId: ouvrage.id,
                codeOuvrage: ouvrage.code,
                designation: ouvrage.designation,
                unite: ouvrage.unite ?? "",
                elements: elementsFromSDP,
              }
            : p,
        ),
      );
    },
    [ouvrages],
  );

  // ─── Mutations éléments ──────────────────────────────────────────────────

  const ajouterElement = useCallback((posteKey: string) => {
    setPostes((prev) =>
      prev.map((p) =>
        p._key === posteKey
          ? {
              ...p,
              elements: [
                ...p.elements,
                buildElement({ ordre: p.elements.length + 1 }),
              ],
            }
          : p,
      ),
    );
  }, []);

  const supprimerElement = useCallback((posteKey: string, elemKey: string) => {
    setPostes((prev) =>
      prev.map((p) =>
        p._key === posteKey
          ? { ...p, elements: p.elements.filter((e) => e._key !== elemKey) }
          : p,
      ),
    );
  }, []);

  const mettreAJourElement = useCallback(
    (
      posteKey: string,
      elemKey: string,
      field: string,
      value: string | number,
    ) => {
      setPostes((prev) =>
        prev.map((p) => {
          if (p._key !== posteKey) return p;
          return {
            ...p,
            elements: p.elements.map((e) => {
              if (e._key !== elemKey) return e;
              const updated = { ...e, [field]: value };
              // Recalculer montant
              const montant = updated.quantite * updated.prixUnitaire;
              return {
                ...updated,
                montantMateriaux: updated.type === "MATERIAU" ? montant : 0,
                montantMateriel: updated.type === "MATERIEL" ? montant : 0,
                montantMO: updated.type === "MO" ? montant : 0,
              };
            }),
          };
        }),
      );
    },
    [],
  );

  // ─── Sauvegarde ──────────────────────────────────────────────────────────

  const handleSave = () => {
    startTransition(async () => {
      await sauvegarderEtudeDebourse(etude.id, {
        titre: titre || null,
        chantierId: chantierId || null,
        devisId: devisId || null,
        responsable: responsable || null,
        coeffK,
        notes: notes || null,
        postes: postes.map((p, pi) => ({
          ordre: pi + 1,
          codeOuvrage: p.codeOuvrage || undefined,
          unite: p.unite || undefined,
          designation: p.designation,
          ouvrageId: p.ouvrageId || undefined,
          elements: p.elements.map((e, ei) => ({
            ordre: ei + 1,
            designation: e.designation,
            unite: e.unite || undefined,
            quantite: e.quantite,
            prixUnitaire: e.prixUnitaire,
            montantMateriaux: e.montantMateriaux,
            montantMateriel: e.montantMateriel,
            montantMO: e.montantMO,
          })),
        })),
      });
      setSaveMsg("Enregistré !");
      setTimeout(() => setSaveMsg(""), 2500);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await supprimerEtudeDebourse(etude.id);
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/etude-prix/debourses-secs"
          className="text-sm text-brand-blue hover:underline"
        >
          ← Retour aux études déboursés secs
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── Contenu principal ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {/* En-tête */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-bold text-brand-navy">{etude.numero}</span>
              <span className="text-slate-400">·</span>
              <span className="text-sm text-slate-500">{etude.date}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Titre</label>
                <input
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  placeholder="Titre de l'étude"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Chantier</label>
                <select
                  value={chantierId}
                  onChange={(e) => setChantierId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="">— Chantier —</option>
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.reference} — {c.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Devis</label>
                <select
                  value={devisId}
                  onChange={(e) => setDevisId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="">— Devis —</option>
                  {devisList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.numero}{d.objet ? ` — ${d.objet}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Responsable</label>
                <input
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  placeholder="Nom du responsable"
                />
              </div>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex gap-2 border-b border-slate-200 pb-0">
            {(["synthese", "detail"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  tab === t
                    ? "border-b-2 border-brand-navy bg-white text-brand-navy"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "synthese" ? "Vue synthèse" : "Détail par poste"}
              </button>
            ))}
          </div>

          {/* ── Vue Synthèse ──────────────────────────────────────────────── */}
          {tab === "synthese" && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="text-left text-xs font-semibold uppercase tracking-wider text-white"
                      style={{ background: NAVY }}
                    >
                      <th className="px-3 py-3">Code Ouvrage</th>
                      <th className="px-3 py-3">Unité</th>
                      <th className="px-3 py-3">Désignation</th>
                      <th className="px-3 py-3 text-right">Total Matériaux</th>
                      <th className="px-3 py-3 text-right">Total Matériel/Conso</th>
                      <th className="px-3 py-3 text-right">Total MO</th>
                      <th className="px-3 py-3 text-right font-bold">DS Poste</th>
                      <th className="px-3 py-3 text-right" style={{ color: ORANGE }}>
                        PVHT = DS × K
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {postes.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                          Aucun poste. Ajoutez un ouvrage ci-dessous.
                        </td>
                      </tr>
                    )}
                    {postes.map((p) => {
                      const mat = p.elements.reduce((s, e) => s + e.montantMateriaux, 0);
                      const mtl = p.elements.reduce((s, e) => s + e.montantMateriel, 0);
                      const mo = p.elements.reduce((s, e) => s + e.montantMO, 0);
                      const ds = mat + mtl + mo;
                      const pv = ds * coeffK;
                      return (
                        <tr key={p._key} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{p.codeOuvrage || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{p.unite || "—"}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-700">{p.designation}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{euro(mat)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{euro(mtl)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{euro(mo)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-brand-navy">{euro(ds)}</td>
                          <td className="px-3 py-2.5 text-right font-bold" style={{ color: ORANGE }}>
                            {euro(pv)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {postes.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                        <td colSpan={3} className="px-3 py-3 text-sm text-slate-600">
                          TOTAUX
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-slate-700">{euro(totaux.mat)}</td>
                        <td className="px-3 py-3 text-right text-sm text-slate-700">{euro(totaux.mtl)}</td>
                        <td className="px-3 py-3 text-right text-sm text-slate-700">{euro(totaux.mo)}</td>
                        <td className="px-3 py-3 text-right text-brand-navy">{euro(totalDS)}</td>
                        <td className="px-3 py-3 text-right" style={{ color: ORANGE }}>
                          {euro(totalPVHT)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ── Vue Détail ────────────────────────────────────────────────── */}
          {tab === "detail" && (
            <div className="flex flex-col gap-4">
              {postes.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-400 italic">
                  Aucun poste. Cliquez sur « + Ajouter un ouvrage/poste ».
                </div>
              )}

              {postes.map((p, pi) => {
                const mat = p.elements.reduce((s, e) => s + e.montantMateriaux, 0);
                const mtl = p.elements.reduce((s, e) => s + e.montantMateriel, 0);
                const mo = p.elements.reduce((s, e) => s + e.montantMO, 0);
                const ds = mat + mtl + mo;

                return (
                  <div
                    key={p._key}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                  >
                    {/* En-tête poste */}
                    <div
                      className="flex flex-wrap items-center gap-3 px-4 py-3"
                      style={{ background: `${NAVY}10`, borderBottom: `2px solid ${NAVY}20` }}
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: NAVY }}
                      >
                        {pi + 1}
                      </span>
                      {/* Sélecteur ouvrage */}
                      <select
                        value={p.ouvrageId}
                        onChange={(e) => appliquerOuvrage(p._key, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none"
                      >
                        <option value="">— Choisir un ouvrage BDD —</option>
                        {ouvrages.map((o) => (
                          <option key={o.id} value={o.id}>
                            [{o.code}] {o.designation}
                          </option>
                        ))}
                      </select>
                      <input
                        value={p.codeOuvrage}
                        onChange={(e) => mettreAJourPoste(p._key, "codeOuvrage", e.target.value)}
                        placeholder="Code"
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-mono focus:border-brand-blue focus:outline-none"
                      />
                      <input
                        value={p.designation}
                        onChange={(e) => mettreAJourPoste(p._key, "designation", e.target.value)}
                        placeholder="Désignation"
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium focus:border-brand-blue focus:outline-none"
                      />
                      <input
                        value={p.unite}
                        onChange={(e) => mettreAJourPoste(p._key, "unite", e.target.value)}
                        placeholder="Unité"
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-center focus:border-brand-blue focus:outline-none"
                      />
                      <button
                        onClick={() => supprimerPoste(p._key)}
                        className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                      >
                        ✕ Supprimer poste
                      </button>
                    </div>

                    {/* Tableau éléments */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-left font-semibold uppercase tracking-wider text-slate-500">
                            <th className="px-3 py-2">Désignation</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2 w-16 text-center">Unité</th>
                            <th className="px-3 py-2 w-20 text-right">Quantité</th>
                            <th className="px-3 py-2 w-24 text-right">Prix unit.</th>
                            <th className="px-3 py-2 w-24 text-right text-emerald-700">Matériaux</th>
                            <th className="px-3 py-2 w-24 text-right text-blue-700">Matériel/Conso</th>
                            <th className="px-3 py-2 w-24 text-right text-orange-700">MO</th>
                            <th className="px-3 py-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {p.elements.length === 0 && (
                            <tr>
                              <td colSpan={9} className="px-4 py-4 text-center text-slate-300 italic">
                                Aucun élément — cliquez « + Ajouter élément »
                              </td>
                            </tr>
                          )}
                          {p.elements.map((e) => (
                            <tr key={e._key} className="hover:bg-slate-50/60">
                              <td className="px-3 py-1.5">
                                <input
                                  value={e.designation}
                                  onChange={(ev) =>
                                    mettreAJourElement(p._key, e._key, "designation", ev.target.value)
                                  }
                                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand-blue focus:outline-none"
                                  placeholder="Désignation"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <select
                                  value={e.type}
                                  onChange={(ev) =>
                                    mettreAJourElement(p._key, e._key, "type", ev.target.value)
                                  }
                                  className="rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-brand-blue focus:outline-none"
                                >
                                  <option value="MATERIAU">Matériau</option>
                                  <option value="MATERIEL">Matériel</option>
                                  <option value="MO">Main d&apos;œuvre</option>
                                </select>
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  value={e.unite}
                                  onChange={(ev) =>
                                    mettreAJourElement(p._key, e._key, "unite", ev.target.value)
                                  }
                                  className="w-16 rounded border border-slate-200 px-2 py-1 text-xs text-center focus:border-brand-blue focus:outline-none"
                                  placeholder="u"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  type="number"
                                  value={e.quantite}
                                  onChange={(ev) =>
                                    mettreAJourElement(
                                      p._key,
                                      e._key,
                                      "quantite",
                                      parseFloat(ev.target.value) || 0,
                                    )
                                  }
                                  step="0.001"
                                  min="0"
                                  className="w-20 rounded border border-slate-200 px-2 py-1 text-xs text-right font-mono focus:border-brand-blue focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  type="number"
                                  value={e.prixUnitaire}
                                  onChange={(ev) =>
                                    mettreAJourElement(
                                      p._key,
                                      e._key,
                                      "prixUnitaire",
                                      parseFloat(ev.target.value) || 0,
                                    )
                                  }
                                  step="0.01"
                                  min="0"
                                  className="w-24 rounded border border-slate-200 px-2 py-1 text-xs text-right font-mono focus:border-brand-blue focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                {e.type === "MATERIAU" ? (
                                  <span className="font-mono font-semibold text-emerald-700">
                                    {euro(e.montantMateriaux)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                {e.type === "MATERIEL" ? (
                                  <span className="font-mono font-semibold text-blue-700">
                                    {euro(e.montantMateriel)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                {e.type === "MO" ? (
                                  <span className="font-mono font-semibold text-orange-700">
                                    {euro(e.montantMO)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5">
                                <button
                                  onClick={() => supprimerElement(p._key, e._key)}
                                  className="text-red-400 hover:text-red-600 transition-colors text-base leading-none"
                                  title="Supprimer cet élément"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200 bg-slate-50">
                            <td
                              colSpan={5}
                              className="px-3 py-2 text-xs font-semibold text-slate-600"
                            >
                              Sous-total DS poste
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-semibold text-emerald-700">
                              {euro(mat)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-semibold text-blue-700">
                              {euro(mtl)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-semibold text-orange-700">
                              {euro(mo)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-bold text-brand-navy">
                              {euro(ds)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={9} className="px-3 py-2">
                              <button
                                onClick={() => ajouterElement(p._key)}
                                className="text-xs font-semibold text-brand-blue hover:underline"
                              >
                                + Ajouter élément
                              </button>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={ajouterPoste}
                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/40 px-5 py-3.5 text-sm font-semibold text-brand-blue hover:border-brand-blue hover:bg-brand-blue/5 transition-colors"
              >
                + Ajouter un ouvrage / poste
              </button>
            </div>
          )}

          {/* Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-brand-navy">Notes internes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              placeholder="Remarques, hypothèses, conditions particulières…"
            />
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="w-full lg:w-72 flex flex-col gap-4 lg:sticky lg:top-6">
          {/* Coefficient K — très visible */}
          <div
            className="rounded-xl p-5 shadow-sm text-white"
            style={{ background: NAVY }}
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider opacity-70">
              Coefficient K (PVHT = DS × K)
            </p>
            <input
              type="number"
              value={coeffK}
              onChange={(e) => setCoeffK(parseFloat(e.target.value) || 1)}
              step="0.001"
              min="0"
              className="w-full rounded-lg border-2 border-white/30 bg-white/10 px-3 py-2 text-3xl font-bold text-white text-center focus:border-white focus:outline-none"
            />
            <p className="mt-2 text-center text-xs opacity-60">
              PVHT = {euro(totalPVHT)}
            </p>
          </div>

          {/* Totaux */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total DS HT
            </p>
            <p className="text-2xl font-bold text-brand-navy">{euro(totalDS)}</p>

            <div className="mt-4 flex flex-col gap-2">
              {/* Matériaux */}
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-500">Matériaux</span>
                  <span className="font-semibold text-emerald-700">{euro(totaux.mat)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: totalDS > 0 ? `${(totaux.mat / totalDS) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              {/* Matériel */}
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-500">Matériel/Conso</span>
                  <span className="font-semibold text-blue-700">{euro(totaux.mtl)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: totalDS > 0 ? `${(totaux.mtl / totalDS) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              {/* MO */}
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-500">Main d&apos;œuvre</span>
                  <span className="font-semibold text-orange-700">{euro(totaux.mo)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: totalDS > 0 ? `${(totaux.mo / totalDS) * 100}%` : "0%",
                      background: ORANGE,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-700">PVHT (DS × K)</span>
                <span className="font-bold" style={{ color: ORANGE }}>
                  {euro(totalPVHT)}
                </span>
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition-opacity disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {isPending ? "Enregistrement…" : "💾 Enregistrer"}
            </button>
            {saveMsg && (
              <p className="text-center text-xs font-semibold text-emerald-600">{saveMsg}</p>
            )}

            <button
              type="button"
              onClick={() => window.open(`/apercu/debourse-sec/${etude.id}`, '_blank')}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 justify-center"
            >
              🖨 Imprimer
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
              >
                🗑️ Supprimer
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="mb-2 text-xs font-semibold text-red-700">
                  Confirmer la suppression ?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Oui, supprimer
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Infos postes */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
            <p>
              <span className="font-semibold text-slate-700">{postes.length}</span> poste
              {postes.length > 1 ? "s" : ""}
              {" · "}
              <span className="font-semibold text-slate-700">
                {postes.reduce((s, p) => s + p.elements.length, 0)}
              </span>{" "}
              élément
              {postes.reduce((s, p) => s + p.elements.length, 0) > 1 ? "s" : ""}
            </p>
            {etude.chantier && (
              <p className="mt-1">
                Chantier :{" "}
                <Link href={`/chantiers/${etude.chantier.id}`} className="text-brand-blue hover:underline">
                  {etude.chantier.reference}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

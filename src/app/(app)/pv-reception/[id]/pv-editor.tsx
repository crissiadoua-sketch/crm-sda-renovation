"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  sauvegarderPvReception,
  finaliserPvReception,
  genererLienPartage,
  supprimerPvReception,
} from "@/lib/actions/pv-reception";

// ── Types ─────────────────────────────────────────────────────────────────────

type Ligne = {
  designation:  string;
  reference:    string;
  quantite:     string;
  unite:        string;
  conformite:   string;
  observations: string;
};

type Reserve = {
  description:       string;
  delaiLevee:        string;
  responsable:       string;
  statut:            string;
  commentaireLevee:  string;
};

type PVR = {
  id: string; numero: string; statut: string; typeSupport: string;
  objet: string | null; descriptionPrestations: string | null;
  dateReception: string | null; lieuReception: string | null;
  periodeDebut: string | null; periodeFin: string | null;
  refContrat: string | null; refDevis: string | null;
  refCommande: string | null; refBonLivraison: string | null;
  clientId: string | null; chantierId: string | null; fournisseurId: string | null;
  repMO: string | null; fonctionRepMO: string | null; emailRepMO: string | null;
  repPrestataire: string | null; fonctionPrestataire: string | null; emailPrestataire: string | null;
  resultat: string | null; motifRefus: string | null; dateEffet: string | null;
  garantieConformite: boolean; dureeGarantie: string | null;
  shareToken: string | null; notes: string | null;
  fournisseur: { id: string; nom: string; siret?: string | null; adresse?: string | null; codePostal?: string | null; ville?: string | null; telephone?: string | null; email?: string | null } | null;
  chantier: { id: string; nom: string; adresse?: string | null; reference?: string | null } | null;
  client: { id: string; nom: string; prenom?: string | null; raisonSociale?: string | null; adresse?: string | null; codePostal?: string | null; ville?: string | null; siret?: string | null } | null;
  lignes: { designation: string; reference: string | null; quantite: number | null; unite: string | null; conformite: string; observations: string | null }[];
  reserves: { description: string; delaiLevee: string | null; responsable: string | null; statut: string; commentaireLevee: string | null }[];
};

const TYPES = [
  { value: "PRESTATION",  label: "Prestation de service" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "FORMATION",   label: "Formation / transfert de compétences" },
  { value: "LIVRAISON",   label: "Livraison de fournitures" },
  { value: "ETUDE",       label: "Étude / Prestation intellectuelle" },
  { value: "AUTRE",       label: "Autre" },
];

const CONFORMITES = [
  { value: "CONFORME",     label: "Conforme ✓",     cls: "text-green-700 bg-green-100" },
  { value: "NON_CONFORME", label: "Non conforme ✗",  cls: "text-red-700 bg-red-100"   },
  { value: "SANS_OBJET",  label: "Sans objet —",    cls: "text-slate-500 bg-slate-100" },
];

const RESULTATS = [
  { value: "ACCEPTE",          label: "Réception prononcée sans réserve",   cls: "border-green-300 bg-green-50 text-green-700" },
  { value: "ACCEPTE_RESERVES", label: "Réception prononcée avec réserves",  cls: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: "REFUSE",           label: "Réception refusée",                  cls: "border-red-300 bg-red-50 text-red-700"       },
];

const STATUTS = ["BROUILLON", "FINALISE", "SIGNE", "ARCHIVE"];
const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", FINALISE: "Finalisé", SIGNE: "Signé", ARCHIVE: "Archivé",
};

export function PvReceptionEditor({
  pvr, fournisseurs, chantiers, clients,
}: {
  pvr: PVR;
  fournisseurs: { id: string; nom: string }[];
  chantiers:    { id: string; nom: string; adresse?: string | null }[];
  clients:      { id: string; nom: string; raisonSociale?: string | null }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved]               = useState(false);
  const [activeTab, setActiveTab]       = useState<"identite" | "prestations" | "controle" | "reserves" | "resultat">("identite");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareUrl, setShareUrl]         = useState<string | null>(pvr.shareToken ? `/pv-public/${pvr.shareToken}` : null);
  const [copied, setCopied]             = useState(false);

  const [form, setForm] = useState({
    statut:          pvr.statut,
    typeSupport:     pvr.typeSupport,
    objet:           pvr.objet ?? "",
    descriptionPrestations: pvr.descriptionPrestations ?? "",
    dateReception:   pvr.dateReception ?? "",
    lieuReception:   pvr.lieuReception ?? "",
    periodeDebut:    pvr.periodeDebut ?? "",
    periodeFin:      pvr.periodeFin ?? "",
    refContrat:      pvr.refContrat ?? "",
    refDevis:        pvr.refDevis ?? "",
    refCommande:     pvr.refCommande ?? "",
    refBonLivraison: pvr.refBonLivraison ?? "",
    clientId:        pvr.clientId ?? "",
    chantierId:      pvr.chantierId ?? "",
    fournisseurId:   pvr.fournisseurId ?? "",
    repMO:           pvr.repMO ?? "",
    fonctionRepMO:   pvr.fonctionRepMO ?? "",
    emailRepMO:      pvr.emailRepMO ?? "",
    repPrestataire:       pvr.repPrestataire ?? "",
    fonctionPrestataire:  pvr.fonctionPrestataire ?? "",
    emailPrestataire:     pvr.emailPrestataire ?? "",
    resultat:        pvr.resultat ?? "",
    motifRefus:      pvr.motifRefus ?? "",
    dateEffet:       pvr.dateEffet ?? "",
    garantieConformite: pvr.garantieConformite,
    dureeGarantie:   pvr.dureeGarantie ?? "",
    notes:           pvr.notes ?? "",
  });

  const [lignes, setLignes] = useState<Ligne[]>(
    pvr.lignes.length > 0
      ? pvr.lignes.map(l => ({
          designation: l.designation,
          reference:   l.reference ?? "",
          quantite:    l.quantite?.toString() ?? "",
          unite:       l.unite ?? "",
          conformite:  l.conformite,
          observations: l.observations ?? "",
        }))
      : [{ designation: "", reference: "", quantite: "", unite: "", conformite: "CONFORME", observations: "" }]
  );

  const [reserves, setReserves] = useState<Reserve[]>(
    pvr.reserves.map(r => ({
      description:      r.description,
      delaiLevee:       r.delaiLevee ?? "",
      responsable:      r.responsable ?? "",
      statut:           r.statut,
      commentaireLevee: r.commentaireLevee ?? "",
    }))
  );

  const set = (f: string, v: string | boolean) => setForm(p => ({ ...p, [f]: v }));

  // ── Lignes helpers ────────────────────────────────────────────────────────
  const addLigne = () => setLignes(l => [...l, { designation: "", reference: "", quantite: "", unite: "", conformite: "CONFORME", observations: "" }]);
  const removeLigne = (i: number) => setLignes(l => l.filter((_, idx) => idx !== i));
  const updateLigne = (i: number, f: keyof Ligne, v: string) =>
    setLignes(l => l.map((item, idx) => idx === i ? { ...item, [f]: v } : item));

  // ── Réserves helpers ──────────────────────────────────────────────────────
  const addReserve = () => setReserves(r => [...r, { description: "", delaiLevee: "", responsable: "", statut: "OUVERTE", commentaireLevee: "" }]);
  const removeReserve = (i: number) => setReserves(r => r.filter((_, idx) => idx !== i));
  const updateReserve = (i: number, f: keyof Reserve, v: string) =>
    setReserves(r => r.map((item, idx) => idx === i ? { ...item, [f]: v } : item));

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const buildPayload = () => ({
    statut: form.statut,
    typeSupport: form.typeSupport,
    objet: form.objet || undefined,
    descriptionPrestations: form.descriptionPrestations || undefined,
    dateReception: form.dateReception || undefined,
    lieuReception: form.lieuReception || undefined,
    periodeDebut:  form.periodeDebut || undefined,
    periodeFin:    form.periodeFin || undefined,
    refContrat:    form.refContrat || undefined,
    refDevis:      form.refDevis || undefined,
    refCommande:   form.refCommande || undefined,
    refBonLivraison: form.refBonLivraison || undefined,
    clientId:      form.clientId || undefined,
    chantierId:    form.chantierId || undefined,
    fournisseurId: form.fournisseurId || undefined,
    repMO: form.repMO || undefined,
    fonctionRepMO: form.fonctionRepMO || undefined,
    emailRepMO:    form.emailRepMO || undefined,
    repPrestataire:      form.repPrestataire || undefined,
    fonctionPrestataire: form.fonctionPrestataire || undefined,
    emailPrestataire:    form.emailPrestataire || undefined,
    resultat:      form.resultat || undefined,
    motifRefus:    form.motifRefus || undefined,
    dateEffet:     form.dateEffet || undefined,
    garantieConformite: form.garantieConformite,
    dureeGarantie: form.dureeGarantie || undefined,
    notes:         form.notes || undefined,
    lignes: lignes.filter(l => l.designation.trim()).map(l => ({
      designation:  l.designation,
      reference:    l.reference || undefined,
      quantite:     l.quantite ? parseFloat(l.quantite) : undefined,
      unite:        l.unite || undefined,
      conformite:   l.conformite,
      observations: l.observations || undefined,
    })),
    reserves: reserves.filter(r => r.description.trim()).map(r => ({
      description:      r.description,
      delaiLevee:       r.delaiLevee || undefined,
      responsable:      r.responsable || undefined,
      statut:           r.statut,
      commentaireLevee: r.commentaireLevee || undefined,
    })),
  });

  const handleSave = () => {
    startTransition(async () => {
      await sauvegarderPvReception(pvr.id, buildPayload());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const handleFinaliser = () => {
    startTransition(async () => {
      await sauvegarderPvReception(pvr.id, { ...buildPayload(), statut: "FINALISE" });
      await finaliserPvReception(pvr.id);
      setForm(f => ({ ...f, statut: "FINALISE" }));
      setShareUrl(`/pv-public/${pvr.id}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const handleGenererLien = () => {
    startTransition(async () => {
      const token = await genererLienPartage(pvr.id);
      const url = `${window.location.origin}/pv-public/${token}`;
      setShareUrl(url);
    });
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    const fullUrl = shareUrl.startsWith("http") ? shareUrl : `${window.location.origin}${shareUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDelete = () => {
    startTransition(async () => { await supprimerPvReception(pvr.id); });
  };

  const nonConformes  = lignes.filter(l => l.conformite === "NON_CONFORME").length;
  const reservesOuv   = reserves.filter(r => r.statut === "OUVERTE").length;

  // ── Pré-remplissage auto depuis les relations CRM ─────────────────────────
  const handleChantierChange = (chantierId: string) => {
    set("chantierId", chantierId);
    const ch = chantiers.find(c => c.id === chantierId);
    if (ch && !form.lieuReception) set("lieuReception", ch.adresse ?? "");
  };

  const TABS = [
    { key: "identite",    label: "Identification",  badge: null },
    { key: "prestations", label: "Prestation",       badge: null },
    { key: "controle",    label: "Contrôle",         badge: nonConformes > 0 ? nonConformes : null },
    { key: "reserves",    label: "Réserves",         badge: reservesOuv > 0 ? reservesOuv : null },
    { key: "resultat",    label: "Résultat & Envoi", badge: null },
  ] as const;

  return (
    <div className="flex flex-col gap-5 pb-12">

      {/* ── Breadcrumb + titre ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/pv-reception" className="hover:text-brand-blue">PV de Réception</Link>
        <span>/</span>
        <span className="font-mono text-brand-navy font-semibold">{pvr.numero}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-navy">{pvr.numero}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            PV de Réception · {TYPES.find(t => t.value === form.typeSupport)?.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={form.statut} onChange={e => set("statut", e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">
            {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
          </select>
          <Link href={`/apercu/pv-reception/${pvr.id}`} target="_blank"
            className="rounded-lg border border-brand-navy px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-navy/5 transition">
            PDF
          </Link>
          <a href={`/api/pv-reception/${pvr.id}/word`}
            className="rounded-lg border border-[#29ABE2] px-4 py-2 text-sm font-medium text-[#29ABE2] hover:bg-blue-50 transition">
            Word
          </a>
          <button onClick={handleSave} disabled={isPending}
            className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50">
            {isPending ? "…" : saved ? "✓ Enregistré" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* ── Onglets ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-brand-navy text-brand-navy"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {tab.label}
            {tab.badge != null && (
              <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Onglet : Identification ─────────────────────────────────────────── */}
      {activeTab === "identite" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Général */}
          <Section title="Général" icon="📄">
            <div className="flex flex-col gap-4">
              <Field label="Type de support *">
                <select value={form.typeSupport} onChange={e => set("typeSupport", e.target.value)} className={inp}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Objet de la réception *">
                <input value={form.objet} onChange={e => set("objet", e.target.value)}
                  className={inp} placeholder="Ex: Réception de la prestation de maintenance préventive" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de réception *">
                  <input type="date" value={form.dateReception} onChange={e => set("dateReception", e.target.value)} className={inp} />
                </Field>
                <Field label="Lieu de réception">
                  <input value={form.lieuReception} onChange={e => set("lieuReception", e.target.value)}
                    className={inp} placeholder="Adresse chantier" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Période — Début prestation">
                  <input type="date" value={form.periodeDebut} onChange={e => set("periodeDebut", e.target.value)} className={inp} />
                </Field>
                <Field label="Période — Fin prestation">
                  <input type="date" value={form.periodeFin} onChange={e => set("periodeFin", e.target.value)} className={inp} />
                </Field>
              </div>
            </div>
          </Section>

          {/* Références */}
          <Section title="Références documentaires" icon="🔗">
            <div className="grid grid-cols-2 gap-3">
              <Field label="N° Contrat">
                <input value={form.refContrat} onChange={e => set("refContrat", e.target.value)} className={inp} placeholder="CTR-2025-001" />
              </Field>
              <Field label="N° Devis">
                <input value={form.refDevis} onChange={e => set("refDevis", e.target.value)} className={inp} placeholder="DEV-2025-001" />
              </Field>
              <Field label="N° Bon de commande">
                <input value={form.refCommande} onChange={e => set("refCommande", e.target.value)} className={inp} placeholder="BC-2025-001" />
              </Field>
              <Field label="N° Bon de livraison">
                <input value={form.refBonLivraison} onChange={e => set("refBonLivraison", e.target.value)} className={inp} placeholder="BL-2025-001" />
              </Field>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Chantier (CRM)">
                <select value={form.chantierId} onChange={e => handleChantierChange(e.target.value)} className={inp}>
                  <option value="">— aucun —</option>
                  {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </Field>
              <Field label="Client (CRM)">
                <select value={form.clientId} onChange={e => set("clientId", e.target.value)} className={inp}>
                  <option value="">— aucun —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.raisonSociale ?? c.nom}</option>)}
                </select>
              </Field>
              <Field label="Prestataire (CRM)">
                <select value={form.fournisseurId} onChange={e => set("fournisseurId", e.target.value)} className={inp}>
                  <option value="">— aucun —</option>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* Représentants maître d'ouvrage */}
          <Section title="Représentant — Maître d'ouvrage (SDA Rénovation)" icon="🏢">
            <div className="flex flex-col gap-3">
              <Field label="Nom et prénom *">
                <input value={form.repMO} onChange={e => set("repMO", e.target.value)}
                  className={inp} placeholder="Ex: Jean DUPONT" />
              </Field>
              <Field label="Fonction / Qualité">
                <input value={form.fonctionRepMO} onChange={e => set("fonctionRepMO", e.target.value)}
                  className={inp} placeholder="Ex: Responsable production" />
              </Field>
              <Field label="Email">
                <input type="email" value={form.emailRepMO} onChange={e => set("emailRepMO", e.target.value)}
                  className={inp} placeholder="prenom.nom@sda-renovation.com" />
              </Field>
            </div>
          </Section>

          {/* Représentants prestataire */}
          <Section title="Représentant — Prestataire" icon="🔧">
            <div className="flex flex-col gap-3">
              <Field label="Nom et prénom *">
                <input value={form.repPrestataire} onChange={e => set("repPrestataire", e.target.value)}
                  className={inp} placeholder="Ex: Marie MARTIN" />
              </Field>
              <Field label="Fonction / Qualité">
                <input value={form.fonctionPrestataire} onChange={e => set("fonctionPrestataire", e.target.value)}
                  className={inp} placeholder="Ex: Chef de projet" />
              </Field>
              <Field label="Email">
                <input type="email" value={form.emailPrestataire} onChange={e => set("emailPrestataire", e.target.value)}
                  className={inp} placeholder="contact@prestataire.com" />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* ── Onglet : Prestation ─────────────────────────────────────────────── */}
      {activeTab === "prestations" && (
        <Section title="Description de la prestation réceptionnée" icon="📝">
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <strong>Rappel juridique :</strong> La description doit être suffisamment précise pour définir
            exactement ce qui est réceptionné. Elle constitue la référence en cas de litige.
          </div>
          <textarea
            value={form.descriptionPrestations}
            onChange={e => set("descriptionPrestations", e.target.value)}
            rows={10}
            className={`${inp} resize-y w-full`}
            placeholder={`Décrivez ici en détail les prestations réceptionnées :

- Nature des travaux / services effectués
- Périmètre d'intervention
- Livrables remis (documents, rapports, équipements...)
- Conditions d'exécution
- Normes et référentiels appliqués
- Résultats attendus vs réalisés`}
          />
          <p className="mt-2 text-xs text-slate-400">
            Ce champ alimente directement la section "Objet de la réception" du document officiel.
          </p>
        </Section>
      )}

      {/* ── Onglet : Contrôle ──────────────────────────────────────────────── */}
      {activeTab === "controle" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-brand-navy">Tableau de vérification des livrables</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cochez la conformité de chaque prestation / livrable réceptionné.
              </p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="text-green-600 font-semibold">{lignes.filter(l => l.conformite === "CONFORME").length} conformes</span>
              <span className="text-red-600 font-semibold">{nonConformes} non conformes</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-navy text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 text-left w-8">#</th>
                  <th className="px-3 py-2.5 text-left">Désignation / Livrable</th>
                  <th className="px-3 py-2.5 text-left w-28">Référence</th>
                  <th className="px-3 py-2.5 text-right w-16">Qté</th>
                  <th className="px-3 py-2.5 text-left w-20">Unité</th>
                  <th className="px-3 py-2.5 text-center w-36">Conformité</th>
                  <th className="px-3 py-2.5 text-left">Observations</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lignes.map((l, i) => (
                  <tr key={i} className={`${
                    l.conformite === "NON_CONFORME" ? "bg-red-50" :
                    l.conformite === "CONFORME" ? "hover:bg-green-50/30" : "hover:bg-slate-50"
                  } transition-colors`}>
                    <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      <input value={l.designation} onChange={e => updateLigne(i, "designation", e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:border-brand-blue"
                        placeholder="Désignation du livrable…" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={l.reference} onChange={e => updateLigne(i, "reference", e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Réf." />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={l.quantite} onChange={e => updateLigne(i, "quantite", e.target.value)}
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-xs text-right" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={l.unite} onChange={e => updateLigne(i, "unite", e.target.value)}
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-xs" placeholder="u" />
                    </td>
                    <td className="px-3 py-2">
                      <select value={l.conformite} onChange={e => updateLigne(i, "conformite", e.target.value)}
                        className={`w-full rounded border px-2 py-1 text-xs font-semibold ${
                          l.conformite === "CONFORME" ? "border-green-300 bg-green-50 text-green-700" :
                          l.conformite === "NON_CONFORME" ? "border-red-300 bg-red-50 text-red-700" :
                          "border-slate-200 bg-slate-50 text-slate-500"
                        }`}>
                        {CONFORMITES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input value={l.observations} onChange={e => updateLigne(i, "observations", e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Commentaire…" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeLigne(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-4 py-2.5">
              <button onClick={addLigne} type="button"
                className="text-xs font-medium text-brand-blue hover:underline">
                + Ajouter un livrable
              </button>
            </div>
          </div>

          {nonConformes > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>⚠ {nonConformes} non-conformité(s) détectée(s).</strong>{" "}
              Il est recommandé d'émettre des réserves dans l'onglet Réserves ou de refuser la réception.
            </div>
          )}
        </div>
      )}

      {/* ── Onglet : Réserves ──────────────────────────────────────────────── */}
      {activeTab === "reserves" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-brand-navy">Réserves émises</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque réserve doit être décrite précisément avec un délai de levée.
                Elle engage contractuellement le prestataire.
              </p>
            </div>
            <button onClick={addReserve} type="button"
              className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
              + Ajouter une réserve
            </button>
          </div>

          {reserves.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-slate-400 text-sm">Aucune réserve — la réception est sans réserve.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reserves.map((r, i) => (
                <div key={i} className={`rounded-xl border p-4 ${
                  r.statut === "LEVEE" ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="rounded-full bg-brand-navy text-white text-xs font-bold px-2 py-0.5">
                      Réserve {i + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <select value={r.statut} onChange={e => updateReserve(i, "statut", e.target.value)}
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                          r.statut === "LEVEE" ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"
                        }`}>
                        <option value="OUVERTE">Ouverte</option>
                        <option value="LEVEE">Levée ✓</option>
                      </select>
                      <button onClick={() => removeReserve(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <Field label="Description de la réserve *">
                        <textarea value={r.description} onChange={e => updateReserve(i, "description", e.target.value)}
                          rows={2} className={`${inp} resize-none`}
                          placeholder="Décrivez précisément la non-conformité ou le point à corriger…" />
                      </Field>
                    </div>
                    <Field label="Délai de levée">
                      <input type="date" value={r.delaiLevee} onChange={e => updateReserve(i, "delaiLevee", e.target.value)}
                        className={inp} />
                    </Field>
                    <Field label="Responsable">
                      <input value={r.responsable} onChange={e => updateReserve(i, "responsable", e.target.value)}
                        className={inp} placeholder="Nom du responsable de la levée" />
                    </Field>
                    {r.statut === "LEVEE" && (
                      <div className="sm:col-span-2">
                        <Field label="Commentaire de levée">
                          <input value={r.commentaireLevee} onChange={e => updateReserve(i, "commentaireLevee", e.target.value)}
                            className={inp} placeholder="Comment la réserve a-t-elle été levée ?" />
                        </Field>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet : Résultat & Envoi ────────────────────────────────────────── */}
      {activeTab === "resultat" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Résultat */}
          <Section title="Décision de réception" icon="⚖️">
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <strong>Valeur juridique :</strong> La décision de réception constitue l'acte juridique principal
              du PV. Elle déclenche le point de départ des délais de garantie (art. 1792-6 C. civ. par analogie).
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {RESULTATS.map(r => (
                <label key={r.value}
                  className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition ${
                    form.resultat === r.value ? r.cls + " border-2" : "border-slate-200 bg-white"
                  }`}>
                  <input type="radio" name="resultat" value={r.value}
                    checked={form.resultat === r.value}
                    onChange={e => set("resultat", e.target.value)}
                    className="accent-brand-navy" />
                  <span className="font-semibold text-sm">{r.label}</span>
                </label>
              ))}
            </div>

            {form.resultat === "REFUSE" && (
              <Field label="Motif de refus *">
                <textarea value={form.motifRefus} onChange={e => set("motifRefus", e.target.value)}
                  rows={3} className={`${inp} resize-none`}
                  placeholder="Détaillez les raisons du refus de réception et les conditions à remplir pour une nouvelle présentation…" />
              </Field>
            )}

            <div className="mt-4 flex flex-col gap-3">
              <Field label="Date de prise d'effet">
                <input type="date" value={form.dateEffet} onChange={e => set("dateEffet", e.target.value)} className={inp} />
              </Field>
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
                <input type="checkbox" id="garantie" checked={form.garantieConformite}
                  onChange={e => set("garantieConformite", e.target.checked)}
                  className="mt-0.5 accent-brand-navy" />
                <div>
                  <label htmlFor="garantie" className="text-sm font-medium cursor-pointer">
                    Garantie de conformité applicable
                  </label>
                  <p className="text-xs text-slate-400">Déclenche la période de garantie contractuelle</p>
                  {form.garantieConformite && (
                    <div className="mt-2">
                      <input value={form.dureeGarantie} onChange={e => set("dureeGarantie", e.target.value)}
                        className={inp} placeholder="Ex: 12 mois à compter de la date d'effet" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* Export et partage */}
          <div className="flex flex-col gap-4">
            <Section title="Export du document" icon="📤">
              <div className="flex flex-col gap-3">
                <Link href={`/apercu/pv-reception/${pvr.id}`} target="_blank"
                  className="flex items-center gap-3 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition">
                  <span className="text-xl">📄</span>
                  <div>
                    <p>Exporter en PDF</p>
                    <p className="text-xs font-normal text-red-500">Document A4 prêt à imprimer et signer</p>
                  </div>
                </Link>
                <a href={`/api/pv-reception/${pvr.id}/word`}
                  className="flex items-center gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition">
                  <span className="text-xl">📝</span>
                  <div>
                    <p>Exporter en Word (.docx)</p>
                    <p className="text-xs font-normal text-blue-500">Document modifiable · format .docx</p>
                  </div>
                </a>
              </div>
            </Section>

            <Section title="Lien de partage / Envoi par email" icon="📧">
              <div className="flex flex-col gap-3">
                {!shareUrl ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500 mb-3">
                      Finalisez le PV pour générer un lien partageable sécurisé.
                    </p>
                    <button onClick={handleFinaliser} disabled={isPending || !form.resultat}
                      className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition">
                      {isPending ? "Finalisation…" : "Finaliser et générer le lien"}
                    </button>
                    {!form.resultat && (
                      <p className="text-xs text-red-500 mt-2">⚠ Sélectionnez un résultat d'abord.</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-slate-500">Lien de lecture sécurisé (valable 30 jours) :</p>
                    <div className="flex gap-2">
                      <input readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}${shareUrl}`}
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600" />
                      <button onClick={handleCopy}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          copied ? "bg-green-600 text-white" : "bg-brand-navy text-white hover:opacity-90"
                        }`}>
                        {copied ? "Copié ✓" : "Copier"}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {form.emailPrestataire && (
                        <a href={`mailto:${form.emailPrestataire}?subject=PV de Réception ${pvr.numero}&body=Bonjour,%0A%0AVeuillez trouver ci-dessous le lien vers le PV de Réception ${pvr.numero} :%0A%0A${typeof window !== "undefined" ? window.location.origin : ""}${shareUrl}%0A%0ACordialement,%0ASDA Rénovation`}
                          className="flex-1 rounded-lg bg-[#29ABE2] py-2 text-center text-xs font-semibold text-white hover:opacity-90 transition">
                          ✉ Envoyer au prestataire
                        </a>
                      )}
                      {form.emailRepMO && (
                        <a href={`mailto:${form.emailRepMO}?subject=PV de Réception ${pvr.numero}&body=Bonjour,%0A%0AVeuillez trouver le PV de Réception ${pvr.numero} :%0A%0A${typeof window !== "undefined" ? window.location.origin : ""}${shareUrl}%0A%0ACordialement`}
                          className="flex-1 rounded-lg bg-brand-navy py-2 text-center text-xs font-semibold text-white hover:opacity-90 transition">
                          ✉ Envoyer en interne
                        </a>
                      )}
                    </div>
                    <button onClick={handleGenererLien} disabled={isPending}
                      className="text-xs text-slate-400 hover:text-slate-600 underline text-center">
                      Regénérer le lien
                    </button>
                  </div>
                )}
              </div>
            </Section>

            {/* Notes internes */}
            <Section title="Notes internes" icon="📝">
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                rows={3} className={`${inp} resize-none w-full`}
                placeholder="Notes confidentielles, suivi, historique…" />
            </Section>

            {/* Danger zone */}
            <div className="rounded-xl border border-red-200 p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Zone de danger</p>
              <button onClick={handleSave} disabled={isPending}
                className="w-full rounded-lg bg-brand-orange py-2.5 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50">
                💾 Enregistrer
              </button>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} type="button"
                  className="w-full rounded-lg border border-red-200 py-2 text-sm text-red-500 hover:bg-red-50 transition">
                  Supprimer ce PV
                </button>
              ) : (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-center">
                  <p className="text-xs text-red-700 mb-2 font-medium">Cette action est irréversible.</p>
                  <div className="flex gap-2">
                    <button onClick={handleDelete} disabled={isPending}
                      className="flex-1 rounded bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                      Oui, supprimer
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded border border-red-200 py-1.5 text-xs text-red-600">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────────────

const inp = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30";

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span>{icon}</span>
        <h3 className="text-sm font-bold text-brand-navy">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}

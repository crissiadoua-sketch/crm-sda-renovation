"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  sauvegarderPvReception,
  supprimerPvReception,
} from "@/lib/actions/pv-reception";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";

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
  id: string; numero: string; statut: string; typeSupport: string; categorie: string;
  objet: string | null; descriptionPrestations: string | null;
  dateReception: string | null; lieuReception: string | null;
  periodeDebut: string | null; periodeFin: string | null;
  refContrat: string | null; refDevis: string | null;
  refCommande: string | null; refBonLivraison: string | null;
  clientId: string | null; chantierId: string | null;
  fournisseurId: string | null; sousTraitantId: string | null;
  repMO: string | null; fonctionRepMO: string | null; emailRepMO: string | null;
  repPrestataire: string | null; fonctionPrestataire: string | null; emailPrestataire: string | null;
  resultat: string | null; motifRefus: string | null; dateEffet: string | null;
  // BTP
  garantiePerfaitAchevement: boolean; garantieBiennale: boolean; garantieDecennale: boolean;
  dateFinParfaitAchevement: string | null; dateFinBiennale: string | null; dateFinDecennale: string | null;
  assuranceDecennaleNo: string | null; assuranceDONo: string | null;
  maitreOeuvreNom: string | null; maitreOeuvreEmail: string | null;
  // Support
  garantieConformite: boolean; dureeGarantie: string | null;
  shareToken: string | null; notes: string | null;
  fournisseur: { id: string; nom: string; siret?: string | null; adresse?: string | null; codePostal?: string | null; ville?: string | null; telephone?: string | null; email?: string | null } | null;
  sousTraitant: { id: string; nom: string; specialite?: string | null; contact?: string | null; email?: string | null; telephone?: string | null; siret?: string | null; adresse?: string | null; representant?: string | null; qualiteRepresentant?: string | null } | null;
  chantier: { id: string; nom: string; adresse?: string | null; reference?: string | null; clientId?: string | null } | null;
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

// Labels dynamiques selon la catégorie
function getLabels(categorie: string) {
  if (categorie === "TRAVAUX_CLIENT") return {
    titre: "PV de Réception de Travaux — Client",
    partieMO: "Maître d'ouvrage (Client)",
    partieExecutant: "Entreprise (SDA Rénovation)",
    emailExecutant: "contact@sda-renovation.com",
  };
  if (categorie === "TRAVAUX_SOUS_TRAITANT") return {
    titre: "PV de Réception de Travaux — Sous-traitant",
    partieMO: "Maître d'ouvrage (SDA Rénovation)",
    partieExecutant: "Sous-traitant",
    emailExecutant: "",
  };
  return {
    titre: "PV de Réception de Support",
    partieMO: "Maître d'ouvrage (SDA Rénovation)",
    partieExecutant: "Prestataire",
    emailExecutant: "",
  };
}

type EmailAction = (prev: unknown, formData: FormData) => Promise<{ ok: boolean; error?: string }>;

export function PvReceptionEditor({
  pvr, fournisseurs, chantiers, clients, sousTraitants, contratsSTR, currentUser, envoyerParEmail,
}: {
  pvr: PVR;
  fournisseurs: { id: string; nom: string; email?: string | null; telephone?: string | null; contact?: string | null }[];
  chantiers:    { id: string; nom: string; adresse?: string | null; clientId?: string | null; dateDebut?: Date | null; dateFin?: Date | null; client?: { id: string; nom: string; prenom?: string | null; raisonSociale?: string | null; email?: string | null; telephone?: string | null; adresse?: string | null; codePostal?: string | null; ville?: string | null } | null; devis?: { numero: string; objet: string | null; lignes?: { designation: string; unite: string | null; quantite: number | null; codeArticle: string | null }[] }[]; bonsCommande?: { numero: string }[] }[];
  clients:      { id: string; nom: string; raisonSociale?: string | null }[];
  sousTraitants: { id: string; nom: string; specialite?: string | null; contact?: string | null; email?: string | null; telephone?: string | null; representant?: string | null; qualiteRepresentant?: string | null }[];
  contratsSTR:  { id: string; reference: string; objet: string | null; sousTraitantId: string; chantierId: string | null; montantHT: number | null; sousTraitant: { id: string; nom: string }; chantier: { id: string; nom: string } | null }[];
  currentUser:  { name: string; role: string; email: string };
  envoyerParEmail?: EmailAction;
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved]               = useState(false);
  const [activeTab, setActiveTab]       = useState<"identite" | "prestations" | "controle" | "reserves" | "garanties" | "resultat">("identite");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categorie = pvr.categorie;
  const labels = getLabels(categorie);
  const isTravaux = categorie === "TRAVAUX_CLIENT" || categorie === "TRAVAUX_SOUS_TRAITANT";

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
    sousTraitantId:  pvr.sousTraitantId ?? "",
    repMO:           pvr.repMO ?? "",
    fonctionRepMO:   pvr.fonctionRepMO ?? "",
    emailRepMO:      pvr.emailRepMO ?? "",
    repPrestataire:       pvr.repPrestataire ?? "",
    fonctionPrestataire:  pvr.fonctionPrestataire ?? "",
    emailPrestataire:     pvr.emailPrestataire ?? "",
    resultat:        pvr.resultat ?? "",
    motifRefus:      pvr.motifRefus ?? "",
    dateEffet:       pvr.dateEffet ?? "",
    // BTP
    garantiePerfaitAchevement: pvr.garantiePerfaitAchevement,
    garantieBiennale:           pvr.garantieBiennale,
    garantieDecennale:          pvr.garantieDecennale,
    dateFinParfaitAchevement:   pvr.dateFinParfaitAchevement ?? "",
    dateFinBiennale:            pvr.dateFinBiennale ?? "",
    dateFinDecennale:           pvr.dateFinDecennale ?? "",
    assuranceDecennaleNo:       pvr.assuranceDecennaleNo ?? "",
    assuranceDONo:              pvr.assuranceDONo ?? "",
    maitreOeuvreNom:            pvr.maitreOeuvreNom ?? "",
    maitreOeuvreEmail:          pvr.maitreOeuvreEmail ?? "",
    // Support
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

  // ── Auto-calcul des dates de fin de garantie BTP ─────────────────────────
  const calcDatesFin = (dateEffetStr: string) => {
    if (!dateEffetStr) return;
    const base = new Date(dateEffetStr);
    const pa = new Date(base); pa.setFullYear(pa.getFullYear() + 1);
    const bi = new Date(base); bi.setFullYear(bi.getFullYear() + 2);
    const de = new Date(base); de.setFullYear(de.getFullYear() + 10);
    setForm(prev => ({
      ...prev,
      dateEffet: dateEffetStr,
      dateFinParfaitAchevement: pa.toISOString().slice(0, 10),
      dateFinBiennale: bi.toISOString().slice(0, 10),
      dateFinDecennale: de.toISOString().slice(0, 10),
    }));
  };

  // ── Pré-remplissage depuis chantier ──────────────────────────────────────
  const handleChantierChange = (chantierId: string) => {
    const ch = chantiers.find(c => c.id === chantierId);
    if (!ch) { set("chantierId", chantierId); return; }

    const devis0      = ch.devis?.[0];
    const devisNum    = devis0?.numero ?? "";
    const devisObjet  = devis0?.objet ?? "";
    const bcNum       = ch.bonsCommande?.[0]?.numero ?? "";
    const clientNom   = ch.client?.raisonSociale
      ?? (ch.client ? `${ch.client.prenom ?? ""} ${ch.client.nom}`.trim() : "");
    const toDate = (d: Date | null | undefined) =>
      d ? new Date(d).toISOString().slice(0, 10) : "";

    setForm(prev => ({
      ...prev,
      chantierId,
      // Chantier prime toujours sur l'ancienne valeur — sinon on garde l'ancienne
      objet:                  (ch.nom ? `Réception des travaux — ${ch.nom}` : "") || prev.objet,
      lieuReception:          ch.adresse                 || prev.lieuReception,
      periodeDebut:           toDate(ch.dateDebut)       || prev.periodeDebut,
      periodeFin:             toDate(ch.dateFin)         || prev.periodeFin,
      refDevis:               devisNum                   || prev.refDevis,
      refCommande:            bcNum                      || prev.refCommande,
      descriptionPrestations: devisObjet                 || prev.descriptionPrestations,
      ...(categorie === "TRAVAUX_CLIENT" ? {
        clientId:   ch.clientId         || prev.clientId,
        repMO:      clientNom           || prev.repMO,
        emailRepMO: ch.client?.email    || prev.emailRepMO,
      } : {}),
    }));

    // Lignes : toujours remplacer par celles du nouveau devis si disponibles
    const devisLignes = devis0?.lignes;
    if (devisLignes && devisLignes.length > 0) {
      setLignes(devisLignes.map(l => ({
        designation:  l.designation,
        reference:    l.codeArticle ?? "",
        quantite:     l.quantite?.toString() ?? "",
        unite:        l.unite ?? "",
        conformite:   "CONFORME",
        observations: "",
      })));
    }
  };

  // ── Pré-remplissage depuis sous-traitant ─────────────────────────────────
  const handleSousTraitantChange = (sousTraitantId: string) => {
    set("sousTraitantId", sousTraitantId);
    if (!sousTraitantId) return;
    const st = sousTraitants.find(s => s.id === sousTraitantId);
    if (!st) return;
    setForm(prev => ({
      ...prev,
      sousTraitantId,
      repPrestataire:      st.representant || st.contact || prev.repPrestataire,
      fonctionPrestataire: st.qualiteRepresentant       || prev.fonctionPrestataire,
      emailPrestataire:    st.email                     || prev.emailPrestataire,
    }));
  };

  // ── Pré-remplissage depuis contrat ST ────────────────────────────────────
  const handleContratSTRChange = (contratId: string) => {
    const cst = contratsSTR.find(c => c.id === contratId);
    if (!cst) return;
    setForm(prev => ({
      ...prev,
      refContrat: prev.refContrat || cst.reference,
      chantierId: prev.chantierId || cst.chantierId || "",
      sousTraitantId: prev.sousTraitantId || cst.sousTraitantId,
      objet: prev.objet || cst.objet || "",
      lieuReception: prev.lieuReception || (cst.chantier ? "" : ""),
    }));
    if (!form.sousTraitantId && cst.sousTraitantId) {
      handleSousTraitantChange(cst.sousTraitantId);
    }
    if (!form.chantierId && cst.chantierId) {
      handleChantierChange(cst.chantierId);
    }
  };

  // ── SDA Rénovation autofill (pour l'exécutant quand TRAVAUX_CLIENT) ──────
  const autoFillExecutantSDA = () => {
    setForm(prev => ({
      ...prev,
      repPrestataire:      prev.repPrestataire || currentUser.name,
      fonctionPrestataire: prev.fonctionPrestataire || currentUser.role,
      emailPrestataire:    prev.emailPrestataire || currentUser.email,
    }));
  };

  // ── Pré-remplir représentant MO (SDA pour les ST, client pour CLIENT) ────
  const autoFillRepMO = () => {
    if (categorie === "TRAVAUX_CLIENT") {
      // MO = le client → on ne peut pas autofill son nom, on laisse l'utilisateur le saisir
      return;
    }
    setForm(prev => ({
      ...prev,
      repMO: prev.repMO || currentUser.name,
      fonctionRepMO: prev.fonctionRepMO || currentUser.role,
      emailRepMO: prev.emailRepMO || currentUser.email,
    }));
  };

  // ── Pré-remplir prestataire depuis fournisseur ───────────────────────────
  const handleFournisseurChange = (fournisseurId: string) => {
    set("fournisseurId", fournisseurId);
    if (!fournisseurId) return;
    const f = fournisseurs.find(x => x.id === fournisseurId);
    if (!f) return;
    setForm(prev => ({
      ...prev,
      repPrestataire: prev.repPrestataire || f.contact || "",
      emailPrestataire: prev.emailPrestataire || f.email || "",
    }));
  };

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
    sousTraitantId: form.sousTraitantId || undefined,
    repMO: form.repMO || undefined,
    fonctionRepMO: form.fonctionRepMO || undefined,
    emailRepMO:    form.emailRepMO || undefined,
    repPrestataire:      form.repPrestataire || undefined,
    fonctionPrestataire: form.fonctionPrestataire || undefined,
    emailPrestataire:    form.emailPrestataire || undefined,
    resultat:      form.resultat || undefined,
    motifRefus:    form.motifRefus || undefined,
    dateEffet:     form.dateEffet || undefined,
    garantiePerfaitAchevement: form.garantiePerfaitAchevement,
    garantieBiennale:           form.garantieBiennale,
    garantieDecennale:          form.garantieDecennale,
    dateFinParfaitAchevement:   form.dateFinParfaitAchevement || undefined,
    dateFinBiennale:            form.dateFinBiennale || undefined,
    dateFinDecennale:           form.dateFinDecennale || undefined,
    assuranceDecennaleNo:       form.assuranceDecennaleNo || undefined,
    assuranceDONo:              form.assuranceDONo || undefined,
    maitreOeuvreNom:            form.maitreOeuvreNom || undefined,
    maitreOeuvreEmail:          form.maitreOeuvreEmail || undefined,
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

  const handleDelete = () => {
    startTransition(async () => { await supprimerPvReception(pvr.id); });
  };

  const nonConformes  = lignes.filter(l => l.conformite === "NON_CONFORME").length;
  const reservesOuv   = reserves.filter(r => r.statut === "OUVERTE").length;

  const TABS = [
    { key: "identite",    label: "Identification",  badge: null },
    { key: "prestations", label: isTravaux ? "Travaux" : "Prestation", badge: null },
    { key: "controle",    label: "Contrôle",         badge: nonConformes > 0 ? nonConformes : null },
    { key: "reserves",    label: "Réserves",         badge: reservesOuv > 0 ? reservesOuv : null },
    ...(isTravaux ? [{ key: "garanties", label: "Garanties BTP", badge: null }] : []),
    { key: "resultat",    label: "Résultat & Envoi", badge: null },
  ] as const;

  const catBadge =
    categorie === "TRAVAUX_CLIENT"        ? "bg-emerald-100 text-emerald-700" :
    categorie === "TRAVAUX_SOUS_TRAITANT" ? "bg-amber-100 text-amber-700" :
    "bg-slate-100 text-slate-600";
  const catLabel =
    categorie === "TRAVAUX_CLIENT"        ? "🏗 Travaux Client" :
    categorie === "TRAVAUX_SOUS_TRAITANT" ? "🔧 Travaux Sous-traitant" :
    "📋 Support";

  return (
    <FullscreenToggle>
    <div className="flex flex-col gap-5 pb-12">

      {/* ── Breadcrumb + titre ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/pv-reception" className="hover:text-brand-blue">PV de Réception</Link>
        <span>/</span>
        <span className="font-mono text-brand-navy font-semibold">{pvr.numero}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${catBadge}`}>{catLabel}</span>
          </div>
          <h2 className="text-2xl font-bold text-brand-navy">{pvr.numero}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{labels.titre}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={form.statut} onChange={e => set("statut", e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">
            {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
          </select>
          <Link href={`/apercu/pv-reception/${pvr.id}`} target="_blank"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition">
            📄 Aperçu PDF
          </Link>
          <button
            onClick={() => { window.open(`/apercu/pv-reception/${pvr.id}`, "_blank"); }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            🖨 Imprimer
          </button>
          {envoyerParEmail && (
            <EnvoyerEmailModal
              action={envoyerParEmail}
              defaultTo={pvr.emailPrestataire ?? pvr.emailRepMO ?? ""}
              documentLabel="le PV de réception"
              defaultSubject={`PV de réception ${pvr.numero} — SDA Rénovation`}
            />
          )}
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
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`relative flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
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
              {categorie === "SUPPORT" && (
                <Field label="Type de support *">
                  <select value={form.typeSupport} onChange={e => set("typeSupport", e.target.value)} className={inp}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Objet de la réception *">
                <input value={form.objet} onChange={e => set("objet", e.target.value)}
                  className={inp} placeholder={
                    categorie === "TRAVAUX_CLIENT" ? "Ex: Réception des travaux de rénovation — Appartement T3, 12 rue des Lilas" :
                    categorie === "TRAVAUX_SOUS_TRAITANT" ? "Ex: Réception des travaux de carrelage — Chantier La Touche" :
                    "Ex: Réception de la prestation de maintenance préventive"
                  } />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de réception *">
                  <input type="date" value={form.dateReception} onChange={e => set("dateReception", e.target.value)} className={inp} />
                </Field>
                <Field label="Lieu de réception / Adresse chantier">
                  <input value={form.lieuReception} onChange={e => set("lieuReception", e.target.value)}
                    className={inp} placeholder="Adresse" />
                </Field>
              </div>
              {isTravaux && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Début des travaux">
                    <input type="date" value={form.periodeDebut} onChange={e => set("periodeDebut", e.target.value)} className={inp} />
                  </Field>
                  <Field label="Fin des travaux">
                    <input type="date" value={form.periodeFin} onChange={e => set("periodeFin", e.target.value)} className={inp} />
                  </Field>
                </div>
              )}
              {!isTravaux && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Période — Début prestation">
                    <input type="date" value={form.periodeDebut} onChange={e => set("periodeDebut", e.target.value)} className={inp} />
                  </Field>
                  <Field label="Période — Fin prestation">
                    <input type="date" value={form.periodeFin} onChange={e => set("periodeFin", e.target.value)} className={inp} />
                  </Field>
                </div>
              )}
            </div>
          </Section>

          {/* Références + liens CRM */}
          <Section title="Références & Liens CRM" icon="🔗">
            <div className="flex flex-col gap-3">

              {/* Pré-remplissage depuis contrat ST */}
              {categorie === "TRAVAUX_SOUS_TRAITANT" && contratsSTR.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-2">✨ Pré-remplir depuis un contrat</p>
                  <select
                    onChange={e => handleContratSTRChange(e.target.value)}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs">
                    <option value="">— Choisir un contrat de sous-traitance —</option>
                    {contratsSTR.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.reference} — {c.sousTraitant.nom}{c.chantier ? ` / ${c.chantier.nom}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Field label="Chantier (CRM)">
                <select value={form.chantierId} onChange={e => handleChantierChange(e.target.value)} className={inp}>
                  <option value="">— aucun —</option>
                  {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </Field>

              {categorie === "TRAVAUX_CLIENT" && (
                <Field label="Client (CRM) *">
                  <select value={form.clientId} onChange={e => set("clientId", e.target.value)} className={inp}>
                    <option value="">— sélectionner —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.raisonSociale ?? c.nom}</option>)}
                  </select>
                </Field>
              )}

              {categorie === "TRAVAUX_SOUS_TRAITANT" && (
                <Field label="Sous-traitant (CRM) *">
                  <select value={form.sousTraitantId} onChange={e => handleSousTraitantChange(e.target.value)} className={inp}>
                    <option value="">— sélectionner —</option>
                    {sousTraitants.map(s => <option key={s.id} value={s.id}>{s.nom}{s.specialite ? ` — ${s.specialite}` : ""}</option>)}
                  </select>
                </Field>
              )}

              {categorie === "SUPPORT" && (
                <>
                  <Field label="Client (CRM)">
                    <select value={form.clientId} onChange={e => set("clientId", e.target.value)} className={inp}>
                      <option value="">— aucun —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.raisonSociale ?? c.nom}</option>)}
                    </select>
                  </Field>
                  <Field label="Prestataire (CRM)">
                    <select value={form.fournisseurId} onChange={e => handleFournisseurChange(e.target.value)} className={inp}>
                      <option value="">— aucun —</option>
                      {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                    </select>
                  </Field>
                </>
              )}

              <div className="grid grid-cols-2 gap-3 mt-1">
                <Field label="N° Devis / Contrat">
                  <input value={form.refDevis} onChange={e => set("refDevis", e.target.value)} className={inp} placeholder="DEV-2025-001" />
                </Field>
                <Field label="N° Bon de commande">
                  <input value={form.refCommande} onChange={e => set("refCommande", e.target.value)} className={inp} placeholder="BC-2025-001" />
                </Field>
              </div>
            </div>
          </Section>

          {/* Représentant MO */}
          <Section title={`Représentant — ${labels.partieMO}`} icon="🏢">
            <div className="flex flex-col gap-3">
              {categorie !== "TRAVAUX_CLIENT" && (
                <div className="flex justify-end">
                  <button type="button" onClick={autoFillRepMO}
                    className="flex items-center gap-1.5 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue/10 transition">
                    ✨ Remplir avec mon profil
                  </button>
                </div>
              )}
              <Field label="Nom et prénom *">
                <input value={form.repMO} onChange={e => set("repMO", e.target.value)}
                  className={inp} placeholder={categorie === "TRAVAUX_CLIENT" ? "Nom du maître d'ouvrage" : "Ex: Jean DUPONT"} />
              </Field>
              <Field label="Fonction / Qualité">
                <input value={form.fonctionRepMO} onChange={e => set("fonctionRepMO", e.target.value)}
                  className={inp} placeholder={categorie === "TRAVAUX_CLIENT" ? "Propriétaire / Responsable" : "Ex: Conducteur de travaux"} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.emailRepMO} onChange={e => set("emailRepMO", e.target.value)}
                  className={inp} placeholder={categorie === "TRAVAUX_CLIENT" ? "email@client.com" : "prenom.nom@sda-renovation.com"} />
              </Field>
              {isTravaux && categorie === "TRAVAUX_CLIENT" && (
                <Field label="Maître d'œuvre / Architecte (si applicable)">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={form.maitreOeuvreNom} onChange={e => set("maitreOeuvreNom", e.target.value)}
                      className={inp} placeholder="Nom architecte / MOE" />
                    <input type="email" value={form.maitreOeuvreEmail} onChange={e => set("maitreOeuvreEmail", e.target.value)}
                      className={inp} placeholder="Email MOE" />
                  </div>
                </Field>
              )}
            </div>
          </Section>

          {/* Représentant exécutant */}
          <Section title={`Représentant — ${labels.partieExecutant}`} icon="🔧">
            <div className="flex flex-col gap-3">
              {categorie === "TRAVAUX_CLIENT" && (
                <div className="flex justify-end">
                  <button type="button" onClick={autoFillExecutantSDA}
                    className="flex items-center gap-1.5 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue/10 transition">
                    ✨ Remplir avec mon profil (SDA)
                  </button>
                </div>
              )}
              <Field label="Nom et prénom *">
                <input value={form.repPrestataire} onChange={e => set("repPrestataire", e.target.value)}
                  className={inp} placeholder={
                    categorie === "TRAVAUX_CLIENT" ? "Représentant SDA Rénovation" :
                    categorie === "TRAVAUX_SOUS_TRAITANT" ? "Représentant sous-traitant" :
                    "Ex: Marie MARTIN"
                  } />
              </Field>
              <Field label="Fonction / Qualité">
                <input value={form.fonctionPrestataire} onChange={e => set("fonctionPrestataire", e.target.value)}
                  className={inp} placeholder="Ex: Gérant / Chef de chantier" />
              </Field>
              <Field label="Email">
                <input type="email" value={form.emailPrestataire} onChange={e => set("emailPrestataire", e.target.value)}
                  className={inp} placeholder={categorie === "TRAVAUX_CLIENT" ? "contact@sda-renovation.com" : "contact@sous-traitant.com"} />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* ── Onglet : Travaux / Prestation ──────────────────────────────────── */}
      {activeTab === "prestations" && (
        <Section title={isTravaux ? "Description des travaux réceptionnés" : "Description de la prestation réceptionnée"} icon="📝">
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            {isTravaux ? (
              <><strong>Base légale BTP :</strong> La description doit permettre d'identifier précisément les travaux réceptionnés (nature, périmètre, localisation). Elle constitue la référence pour les garanties légales (parfait achèvement, biennale, décennale).</>
            ) : (
              <><strong>Rappel juridique :</strong> La description doit être suffisamment précise pour définir exactement ce qui est réceptionné. Elle constitue la référence en cas de litige.</>
            )}
          </div>
          <textarea
            value={form.descriptionPrestations}
            onChange={e => set("descriptionPrestations", e.target.value)}
            rows={12}
            className={`${inp} resize-y w-full`}
            placeholder={isTravaux ? `Décrivez ici les travaux réceptionnés :\n\n- Nature et localisation des travaux\n- Corps d'état concernés\n- Normes et DTU applicables\n- Matériaux et produits mis en œuvre\n- Prestations exclues de la présente réception` : `Décrivez ici en détail les prestations réceptionnées :\n\n- Nature des travaux / services effectués\n- Périmètre d'intervention\n- Livrables remis`}
          />
        </Section>
      )}

      {/* ── Onglet : Contrôle ──────────────────────────────────────────────── */}
      {activeTab === "controle" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-brand-navy">{isTravaux ? "Points de contrôle des travaux" : "Tableau de vérification des livrables"}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTravaux ? "Vérifiez chaque point de contrôle (lot par lot, ouvrage par ouvrage)." : "Cochez la conformité de chaque prestation / livrable réceptionné."}
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
                  <th className="px-3 py-2.5 text-left">{isTravaux ? "Ouvrage / Lot" : "Désignation / Livrable"}</th>
                  <th className="px-3 py-2.5 text-left w-28">Référence / DTU</th>
                  <th className="px-3 py-2.5 text-right w-16">Qté</th>
                  <th className="px-3 py-2.5 text-left w-20">Unité</th>
                  <th className="px-3 py-2.5 text-center w-36">Conformité</th>
                  <th className="px-3 py-2.5 text-left">Observations / Réserves</th>
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
                        placeholder={isTravaux ? "Ex: Carrelage salle de bain…" : "Désignation du livrable…"} />
                    </td>
                    <td className="px-3 py-2">
                      <input value={l.reference} onChange={e => updateLigne(i, "reference", e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs" placeholder="DTU / Réf." />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={l.quantite} onChange={e => updateLigne(i, "quantite", e.target.value)}
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-xs text-right" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={l.unite} onChange={e => updateLigne(i, "unite", e.target.value)}
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-xs" placeholder="m²" />
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
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Commentaire, réserve…" />
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
                + Ajouter {isTravaux ? "un ouvrage / lot" : "un livrable"}
              </button>
            </div>
          </div>

          {nonConformes > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>⚠ {nonConformes} non-conformité(s) détectée(s).</strong>{" "}
              Émettez les réserves correspondantes dans l'onglet Réserves.
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
                {isTravaux
                  ? "Chaque réserve identifie un désordre ou une non-conformité à lever dans le délai de parfait achèvement."
                  : "Chaque réserve doit être décrite précisément avec un délai de levée. Elle engage contractuellement le prestataire."}
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
                <div key={i} className={`rounded-xl border p-4 ${r.statut === "LEVEE" ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="rounded-full bg-brand-navy text-white text-xs font-bold px-2 py-0.5">Réserve {i + 1}</span>
                    <div className="flex items-center gap-2">
                      <select value={r.statut} onChange={e => updateReserve(i, "statut", e.target.value)}
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${r.statut === "LEVEE" ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}`}>
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
                          placeholder={isTravaux ? "Ex: Défaut de planéité du carrelage salle de bain (lot 4) — écart > 5 mm sous règle de 2 m" : "Décrivez précisément la non-conformité…"} />
                      </Field>
                    </div>
                    <Field label="Délai de levée">
                      <input type="date" value={r.delaiLevee} onChange={e => updateReserve(i, "delaiLevee", e.target.value)} className={inp} />
                    </Field>
                    <Field label="Responsable">
                      <input value={r.responsable} onChange={e => updateReserve(i, "responsable", e.target.value)}
                        className={inp} placeholder="Nom du responsable" />
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

      {/* ── Onglet : Garanties BTP ──────────────────────────────────────────── */}
      {activeTab === "garanties" && isTravaux && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Section title="Garanties légales BTP" icon="🛡">
            <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <strong>Art. 1792 et suivants du Code Civil :</strong> La réception des travaux déclenche le point de départ des garanties légales BTP. Renseignez la date d'effet (= date de réception ou prise d'effet) pour calculer automatiquement les échéances.
            </div>

            <div className="flex flex-col gap-4">
              <Field label="Date de prise d'effet des garanties *">
                <input type="date" value={form.dateEffet}
                  onChange={e => calcDatesFin(e.target.value)} className={inp} />
                <p className="text-[11px] text-slate-400 mt-0.5">En général = date de réception. Remplit automatiquement les dates de fin de garantie.</p>
              </Field>

              <div className="flex flex-col gap-3">
                <GarantieRow
                  label="Garantie de parfait achèvement (1 an)"
                  sublabel="Levée de toutes les réserves émises à la réception + désordres signalés dans l'année"
                  checked={form.garantiePerfaitAchevement}
                  onCheck={v => set("garantiePerfaitAchevement", v)}
                  dateLabel="Fin le"
                  dateValue={form.dateFinParfaitAchevement}
                  onDate={v => set("dateFinParfaitAchevement", v)}
                  colorCls="border-blue-300 bg-blue-50"
                />
                <GarantieRow
                  label="Garantie biennale (2 ans)"
                  sublabel="Éléments d'équipement dissociables (art. 1792-3 C.civ.)"
                  checked={form.garantieBiennale}
                  onCheck={v => set("garantieBiennale", v)}
                  dateLabel="Fin le"
                  dateValue={form.dateFinBiennale}
                  onDate={v => set("dateFinBiennale", v)}
                  colorCls="border-amber-300 bg-amber-50"
                />
                <GarantieRow
                  label="Garantie décennale (10 ans)"
                  sublabel="Solidité de l'ouvrage + éléments indissociables (art. 1792 C.civ.)"
                  checked={form.garantieDecennale}
                  onCheck={v => set("garantieDecennale", v)}
                  dateLabel="Fin le"
                  dateValue={form.dateFinDecennale}
                  onDate={v => set("dateFinDecennale", v)}
                  colorCls="border-red-300 bg-red-50"
                />
              </div>
            </div>
          </Section>

          <Section title="Assurances" icon="📋">
            <div className="flex flex-col gap-4">
              <Field label="N° police assurance décennale (SDA Rénovation)">
                <input value={form.assuranceDecennaleNo} onChange={e => set("assuranceDecennaleNo", e.target.value)}
                  className={inp} placeholder="Ex: MAAF PRO - Police n° 12345678" />
              </Field>
              {categorie === "TRAVAUX_CLIENT" && (
                <Field label="N° police dommages-ouvrage (Client)">
                  <input value={form.assuranceDONo} onChange={e => set("assuranceDONo", e.target.value)}
                    className={inp} placeholder="Police DO client" />
                </Field>
              )}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Rappel :</strong> Pour les travaux soumis à l'obligation d'assurance décennale (art. L241-1 C.assur.), une attestation d'assurance en cours de validité doit être jointe au PV ou remise préalablement à la réception.
              </div>
              <Field label="Notes internes">
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                  rows={3} className={`${inp} resize-none w-full`}
                  placeholder="Observations, suivi post-réception…" />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* ── Onglet : Résultat & Envoi ────────────────────────────────────────── */}
      {activeTab === "resultat" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Résultat */}
          <Section title="Décision de réception" icon="⚖️">
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {isTravaux
                ? <><strong>Base légale :</strong> Art. 1792-6 C.civ. — La réception déclenche le point de départ des garanties légales (parfait achèvement, biennale, décennale). Les réserves doivent être levées dans le délai imparti.</>
                : <><strong>Valeur juridique :</strong> La décision de réception constitue l'acte juridique principal du PV. Elle déclenche les délais de garantie contractuels.</>}
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {RESULTATS.map(r => (
                <label key={r.value}
                  className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition ${form.resultat === r.value ? r.cls + " border-2" : "border-slate-200 bg-white"}`}>
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
                  placeholder="Détaillez les raisons du refus et les conditions pour une nouvelle présentation…" />
              </Field>
            )}

            {!isTravaux && (
              <div className="mt-4 flex flex-col gap-3">
                <Field label="Date de prise d'effet">
                  <input type="date" value={form.dateEffet} onChange={e => set("dateEffet", e.target.value)} className={inp} />
                </Field>
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
                  <input type="checkbox" id="garantie" checked={form.garantieConformite}
                    onChange={e => set("garantieConformite", e.target.checked)}
                    className="mt-0.5 accent-brand-navy" />
                  <div>
                    <label htmlFor="garantie" className="text-sm font-medium cursor-pointer">Garantie de conformité applicable</label>
                    {form.garantieConformite && (
                      <div className="mt-2">
                        <input value={form.dureeGarantie} onChange={e => set("dureeGarantie", e.target.value)}
                          className={inp} placeholder="Ex: 12 mois à compter de la date d'effet" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Export et partage */}
          <div className="flex flex-col gap-4">
            <Section title="Export du document" icon="📤">
              <div className="flex flex-col gap-3">
                <a href={`/apercu/pv-reception/${pvr.id}`} target="_blank"
                  className="flex items-center gap-3 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition">
                  <span className="text-xl">📄</span>
                  <div>
                    <p>Aperçu & Impression PDF</p>
                    <p className="text-xs font-normal text-red-500">Ouvre dans un nouvel onglet → Imprimer ou Enregistrer en PDF</p>
                  </div>
                </a>
                <a href={`/api/pv-reception/${pvr.id}/word`}
                  className="flex items-center gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition">
                  <span className="text-xl">📝</span>
                  <div>
                    <p>Exporter en Word (.docx)</p>
                    <p className="text-xs font-normal text-blue-500">Document modifiable</p>
                  </div>
                </a>
              </div>
            </Section>

            {!isTravaux && (
              <Section title="Notes internes" icon="📝">
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                  rows={3} className={`${inp} resize-none w-full`}
                  placeholder="Notes confidentielles, suivi, historique…" />
              </Section>
            )}

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
    </FullscreenToggle>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────────────

const inp = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30";

function GarantieRow({ label, sublabel, checked, onCheck, dateLabel, dateValue, onDate, colorCls }: {
  label: string; sublabel: string; checked: boolean; onCheck: (v: boolean) => void;
  dateLabel: string; dateValue: string; onDate: (v: string) => void; colorCls: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${checked ? colorCls : "border-slate-200 bg-white"}`}>
      <div className="flex items-start gap-2 mb-2">
        <input type="checkbox" checked={checked} onChange={e => onCheck(e.target.checked)}
          className="mt-0.5 accent-brand-navy" />
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-[11px] text-slate-500">{sublabel}</p>
        </div>
      </div>
      {checked && (
        <div className="flex items-center gap-2 mt-1 ml-5">
          <span className="text-xs text-slate-500 shrink-0">{dateLabel}</span>
          <input type="date" value={dateValue} onChange={e => onDate(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none" />
        </div>
      )}
    </div>
  );
}

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

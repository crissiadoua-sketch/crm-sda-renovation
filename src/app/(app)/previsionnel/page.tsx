export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";
import { DepensePrevRow } from "@/components/previsionnel/depense-prev-row";
import { PrevToolbar } from "@/components/previsionnel/prev-toolbar";
import { PrevFormAutoFill } from "@/components/previsionnel/prev-form-autofill";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  AlertTriangle,
  CalendarClock,
  BarChart3,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function pct(val: number, base: number): number {
  return base > 0 ? (val / base) * 100 : 0;
}

const CAT_LABELS: Record<string, string> = {
  MATERIAUX: "Matériaux", MAIN_OEUVRE: "Main d'œuvre",
  SOUS_TRAITANCE: "Sous-traitance", TRANSPORT: "Transport",
  ADMINISTRATIF: "Administratif", AUTRE: "Autre",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PrevisionelPage({
  searchParams,
}: {
  searchParams: Promise<{ chantierId?: string }>;
}) {
  const { chantierId } = await searchParams;
  const now = new Date();
  const nowKey = monthKey(now);

  const [factures, bcs, bcbs, bcfs, depensesPrev, chantiers, fournisseurs, chantiersMarges, depensesRecentes, devisAcceptes, csts, notesFrais] =
    await Promise.all([
      // Factures non entièrement payées
      prisma.facture.findMany({
        where: {
          statut: { in: ["ENVOYEE", "PAYEE_PARTIELLE", "EN_RETARD"] },
          ...(chantierId ? { chantierId } : {}),
        },
        include: {
          chantier: { select: { id: true, nom: true } },
          client: { select: { nom: true, prenom: true, raisonSociale: true } },
        },
        orderBy: { dateEcheance: "asc" },
      }),
      // BC non reçus
      prisma.bonCommande.findMany({
        where: { statut: { in: ["BROUILLON", "ENVOYE", "CONFIRME", "RECU_PARTIEL"] }, ...(chantierId ? { chantierId } : {}) },
        include: { fournisseur: { select: { nom: true } }, chantier: { select: { id: true, nom: true } } },
        orderBy: { createdAt: "asc" },
      }),
      // BCB non livrés
      prisma.bonCommandeBeton.findMany({
        where: { statut: { in: ["BROUILLON", "ENVOYE", "CONFIRME"] }, ...(chantierId ? { chantierId } : {}) },
        include: { fournisseur: { select: { nom: true } }, chantier: { select: { id: true, nom: true } } },
        orderBy: { dateLivraison: "asc" },
      }),
      // BCF non reçus
      prisma.bonCommandeFournitures.findMany({
        where: { statut: { in: ["BROUILLON", "EN_ATTENTE", "VALIDE", "ENVOYE", "RECU_PARTIEL"] }, ...(chantierId ? { chantierId } : {}) },
        include: { fournisseur: { select: { nom: true } }, chantier: { select: { id: true, nom: true } } },
        orderBy: { dateSouhaitee: "asc" },
      }),
      // Dépenses prévisionnelles
      prisma.depense.findMany({
        where: { type: "PREVISIONNEL", ...(chantierId ? { chantierId } : {}) },
        include: { chantier: { select: { id: true, nom: true } }, fournisseur: { select: { nom: true } } },
        orderBy: { date: "asc" },
      }),
      // Tous les chantiers (filtre)
      prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true } }),
      // Fournisseurs (formulaire)
      prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
      // Chantiers actifs avec données financières (marge)

      prisma.chantier.findMany({
        where: {
          statut: { not: "ANNULE" },
          ...(chantierId ? { id: chantierId } : {}),
          OR: [
            { factures: { some: {} } },
            { bonsCommande: { some: {} } },
            { bonsCommandeBeton: { some: {} } },
            { depenses: { some: {} } },
          ],
        },
        select: {
          id: true, nom: true, reference: true, statut: true, budgetEstime: true,
          factures: {
            where: { statut: { not: "ANNULEE" } },
            select: { totalHT: true, statut: true },
          },
          bonsCommande: {
            where: { statut: { not: "ANNULE" } },
            select: { totalHT: true, statut: true },
          },
          bonsCommandeBeton: {
            where: { statut: { not: "ANNULE" } },
            select: { totalHT: true, statut: true },
          },
          bonsCommandeFournitures: {
            where: { statut: { not: "ANNULE" } },
            select: { totalHT: true, statut: true },
          },
          depenses: { select: { montant: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Dépenses réelles récentes pour auto-fill
      prisma.depense.findMany({
        where: { type: "REEL" },
        select: { id: true, libelle: true, montant: true, categorie: true, chantierId: true, fournisseurId: true },
        orderBy: { date: "desc" },
        take: 30,
      }),
      // Devis acceptés non entièrement facturés (CA restant à facturer)
      prisma.devis.findMany({
        where: { statut: "ACCEPTE", ...(chantierId ? { chantierId } : {}) },
        include: {
          chantier: { select: { id: true, nom: true } },
          client: { select: { nom: true, prenom: true, raisonSociale: true } },
          factures: { where: { statut: { not: "ANNULEE" } }, select: { totalTTC: true } },
        },
      }),
      // Contrats de sous-traitance signés non terminés
      prisma.contratSousTraitance.findMany({
        where: { statut: "SIGNE", montantHT: { gt: 0 }, ...(chantierId ? { chantierId } : {}) },
        include: {
          sousTraitant: { select: { nom: true } },
          chantier: { select: { id: true, nom: true } },
        },
      }),
      // Notes de frais en attente de remboursement
      prisma.noteDeFrais.findMany({
        where: { statut: { in: ["EN_ATTENTE", "VALIDEE"] }, ...(chantierId ? { chantierId } : {}) },
        include: { chantier: { select: { id: true, nom: true } } },
        orderBy: { date: "asc" },
      }),
    ]);

  // ── Calculs de marge par chantier ─────────────────────────────────────────

  const margesChantiers = chantiersMarges.map((c) => {
    const budget = c.budgetEstime ?? 0;
    const caFact = c.factures.reduce((s, f) => s + f.totalHT, 0);

    // Coûts réellement dépensés (commandes livrées/reçues + dépenses réelles)
    const bcRecu   = c.bonsCommande.filter(b => ["RECU", "RECU_PARTIEL"].includes(b.statut)).reduce((s, b) => s + b.totalHT, 0);
    const bcbLivre = c.bonsCommandeBeton.filter(b => b.statut === "LIVRE").reduce((s, b) => s + b.totalHT, 0);
    const bcfRecu  = c.bonsCommandeFournitures.filter(b => ["RECU"].includes(b.statut)).reduce((s, b) => s + b.totalHT, 0);
    const depReel  = c.depenses.filter(d => d.type === "REEL").reduce((s, d) => s + d.montant, 0);
    const coutReels = bcRecu + bcbLivre + bcfRecu + depReel;

    // Coûts totaux engagés (tout ce qui est commandé, reçu ou non)
    const bcTout   = c.bonsCommande.reduce((s, b) => s + b.totalHT, 0);
    const bcbTout  = c.bonsCommandeBeton.reduce((s, b) => s + b.totalHT, 0);
    const bcfTout  = c.bonsCommandeFournitures.reduce((s, b) => s + b.totalHT, 0);
    const depPrev  = c.depenses.filter(d => d.type === "PREVISIONNEL").reduce((s, d) => s + d.montant, 0);
    const coutEngages = bcTout + bcbTout + bcfTout + depReel + depPrev;

    // Marges
    const base          = budget > 0 ? budget : caFact;  // référence : budget ou CA facturé
    const margeReelle   = caFact - coutReels;
    const margeEngagee  = base - coutEngages;
    const rentabilite   = base > 0 ? (margeEngagee / base) * 100 : null;
    const consommation  = base > 0 ? (coutEngages / base) * 100 : null;

    return {
      id: c.id, nom: c.nom, reference: c.reference, statut: c.statut,
      budget, caFact, coutReels, coutEngages, depReel, depPrev,
      margeReelle, margeEngagee, rentabilite, consommation,
    };
  });

  // ── KPIs globaux ─────────────────────────────────────────────────────────

  const allFlowItems: Array<{
    id: string; label: string; montant: number;
    sens: "encaissement" | "decaissement";
    sous_type: "facture" | "bc" | "bcb" | "bcf" | "depense_prev" | "devis_accepte" | "cst" | "ndf";
    lien?: string; chantier?: string | null; tiers?: string | null;
    statut?: string; enRetard?: boolean; monthKey: string;
    dateISO?: string; // uniquement pour depense_prev (édition inline)
  }> = [];

  for (const f of factures) {
    const reste = f.totalTTC - f.montantPaye;
    if (reste <= 0) continue;
    const echeance = f.dateEcheance ?? new Date(f.dateEmission.getTime() + 30 * 86400000);
    const key = monthKey(echeance);
    const clientNom = f.client.raisonSociale ?? `${f.client.prenom ?? ""} ${f.client.nom}`.trim();
    allFlowItems.push({
      id: f.id, label: `${f.numero} — ${clientNom}`, montant: reste,
      sens: "encaissement", sous_type: "facture",
      lien: `/factures/${f.id}`, chantier: f.chantier?.nom, tiers: clientNom,
      statut: f.statut, enRetard: f.statut === "EN_RETARD" || echeance < now,
      monthKey: key < nowKey ? nowKey : key,
    });
  }
  for (const bc of bcs) {
    if (bc.totalHT <= 0) continue;
    const key = monthKey(bc.dateCreation ?? bc.createdAt);
    allFlowItems.push({
      id: bc.id, label: `${bc.numero} — ${bc.fournisseur.nom}`, montant: bc.totalHT,
      sens: "decaissement", sous_type: "bc",
      lien: `/bons-commande/${bc.id}`, chantier: bc.chantier?.nom, tiers: bc.fournisseur.nom,
      statut: bc.statut, monthKey: key < nowKey ? nowKey : key,
    });
  }
  for (const bcb of bcbs) {
    if (bcb.totalHT <= 0) continue;
    const key = monthKey(bcb.dateLivraison ?? bcb.createdAt);
    allFlowItems.push({
      id: bcb.id, label: `${bcb.numero} — ${bcb.fournisseur.nom}`, montant: bcb.totalHT,
      sens: "decaissement", sous_type: "bcb",
      lien: `/bons-commande/beton/${bcb.id}`, chantier: bcb.chantier?.nom, tiers: bcb.fournisseur.nom,
      statut: bcb.statut, monthKey: key < nowKey ? nowKey : key,
    });
  }
  for (const bcf of bcfs) {
    if (bcf.totalHT <= 0) continue;
    const key = monthKey(bcf.dateSouhaitee ?? bcf.dateCommande);
    allFlowItems.push({
      id: bcf.id, label: `${bcf.numero} — ${bcf.fournisseur.nom}`, montant: bcf.totalHT,
      sens: "decaissement", sous_type: "bcf",
      lien: `/bons-commande/fournitures/${bcf.id}`, chantier: bcf.chantier?.nom, tiers: bcf.fournisseur.nom,
      statut: bcf.statut, monthKey: key < nowKey ? nowKey : key,
    });
  }
  for (const dep of depensesPrev) {
    const key = monthKey(dep.date);
    allFlowItems.push({
      id: dep.id, label: dep.libelle, montant: dep.montant,
      sens: "decaissement", sous_type: "depense_prev",
      chantier: dep.chantier?.nom, tiers: dep.fournisseur?.nom,
      statut: dep.categorie, monthKey: key < nowKey ? nowKey : key,
      dateISO: dep.date.toISOString().slice(0, 10),
    });
  }
  for (const dv of devisAcceptes) {
    const dejaFactureTTC = dv.factures.reduce((s: number, f: { totalTTC: number }) => s + f.totalTTC, 0);
    const resteAFacturer = dv.totalTTC - dejaFactureTTC;
    if (resteAFacturer <= 0) continue;
    const clientNom = dv.client.raisonSociale ?? `${dv.client.prenom ?? ""} ${dv.client.nom}`.trim();
    allFlowItems.push({
      id: dv.id, label: `${dv.numero} — ${clientNom}`, montant: resteAFacturer,
      sens: "encaissement", sous_type: "devis_accepte",
      lien: `/devis/${dv.id}`, chantier: dv.chantier?.nom, tiers: clientNom,
      statut: "CA_RESTANT", monthKey: nowKey,
    });
  }
  for (const cst of csts) {
    allFlowItems.push({
      id: cst.id, label: `${cst.numero} — ${cst.sousTraitant.nom}`, montant: cst.montantHT ?? 0,
      sens: "decaissement", sous_type: "cst",
      lien: `/contrats-sous-traitance/${cst.id}`, chantier: cst.chantier?.nom, tiers: cst.sousTraitant.nom,
      statut: cst.statut, monthKey: nowKey,
    });
  }
  for (const ndf of notesFrais) {
    const ndfKey = monthKey(ndf.date);
    allFlowItems.push({
      id: ndf.id, label: ndf.description || ndf.fournisseur || "Note de frais", montant: ndf.montant,
      sens: "decaissement", sous_type: "ndf",
      chantier: ndf.chantier?.nom, tiers: ndf.fournisseur || undefined,
      statut: ndf.statut, monthKey: ndfKey < nowKey ? nowKey : ndfKey,
    });
  }

  const totalEncaissements = allFlowItems.filter(i => i.sens === "encaissement").reduce((s, i) => s + i.montant, 0);
  const totalDecaissements = allFlowItems.filter(i => i.sens === "decaissement").reduce((s, i) => s + i.montant, 0);
  const soldeNet = totalEncaissements - totalDecaissements;

  // ── Timeline ──────────────────────────────────────────────────────────────

  const bucketMap = new Map<string, typeof allFlowItems>();
  for (let i = 0; i <= 6; i++) {
    bucketMap.set(monthKey(new Date(now.getFullYear(), now.getMonth() + i, 1)), []);
  }
  for (const item of allFlowItems) {
    if (!bucketMap.has(item.monthKey)) bucketMap.set(item.monthKey, []);
    bucketMap.get(item.monthKey)!.push(item);
  }

  const timeline = Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key, label: monthLabel(key), items,
      enc: items.filter(i => i.sens === "encaissement").reduce((s, i) => s + i.montant, 0),
      dec: items.filter(i => i.sens === "decaissement").reduce((s, i) => s + i.montant, 0),
    }))
    .filter(b => b.key >= nowKey || b.items.length > 0);

  const SOUS_TYPE_CFG = {
    facture:      { icon: "💰", badge: "bg-emerald-100 text-emerald-700", label: "Facture" },
    bc:           { icon: "🏗",  badge: "bg-slate-100 text-slate-600",    label: "BC Matériaux" },
    bcb:          { icon: "🧱",  badge: "bg-blue-100 text-blue-700",      label: "BC Béton" },
    bcf:          { icon: "📦",  badge: "bg-amber-100 text-amber-700",    label: "BC Fournitures" },
    depense_prev: { icon: "📋",  badge: "bg-orange-100 text-orange-700",  label: "Prévisionnel" },
    devis_accepte: { icon: "✅", badge: "bg-teal-100 text-teal-700",      label: "CA à facturer" },
    cst:          { icon: "👷",  badge: "bg-indigo-100 text-indigo-700",  label: "Sous-traitance" },
    ndf:          { icon: "🧾",  badge: "bg-pink-100 text-pink-700",      label: "Note de frais" },
  } as const;

  // ── Couleur rentabilité ───────────────────────────────────────────────────

  function rentaCfg(r: number | null) {
    if (r === null) return { bar: "bg-slate-200", text: "text-slate-400", label: "—" };
    if (r >= 20)   return { bar: "bg-emerald-500", text: "text-emerald-600", label: `${r.toFixed(1)} %` };
    if (r >= 10)   return { bar: "bg-green-400",   text: "text-green-600",   label: `${r.toFixed(1)} %` };
    if (r >= 5)    return { bar: "bg-amber-400",   text: "text-amber-600",   label: `${r.toFixed(1)} %` };
    if (r >= 0)    return { bar: "bg-orange-400",  text: "text-orange-600",  label: `${r.toFixed(1)} %` };
    return              { bar: "bg-red-500",       text: "text-red-600",     label: `${r.toFixed(1)} %` };
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ── En-tête ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">Prévisionnel — Flux & Rentabilité</h2>
            <p className="mt-1 text-sm text-slate-500">Encaissements, décaissements et marges sur 7 mois</p>
          </div>
          <PrevToolbar exportUrl={`/api/previsionnel/export-excel${chantierId ? `?chantierId=${chantierId}` : ""}`} />
        </div>
        <form method="get" className="flex gap-2">
          <select name="chantierId" defaultValue={chantierId ?? ""}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Tous les chantiers</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">Filtrer</button>
          {chantierId && (
            <Link href="/previsionnel" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">✕</Link>
          )}
        </form>
      </div>

      {/* ── KPIs flux ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Encaissements à venir</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{formatEuros(totalEncaissements)}</p>
          <p className="mt-0.5 text-xs text-emerald-600">
            {factures.length} facture{factures.length > 1 ? "s" : ""} en attente
            {devisAcceptes.length > 0 && ` · ${devisAcceptes.length} devis accepté${devisAcceptes.length > 1 ? "s" : ""} à facturer`}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <TrendingDown className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Décaissements prévus</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatEuros(totalDecaissements)}</p>
          <p className="mt-0.5 text-xs text-red-600">
            {bcs.length + bcbs.length + bcfs.length} commande{bcs.length + bcbs.length + bcfs.length > 1 ? "s" : ""}
            {depensesPrev.length > 0 && ` · ${depensesPrev.length} prévis.`}
            {csts.length > 0 && ` · ${csts.length} CST`}
            {notesFrais.length > 0 && ` · ${notesFrais.length} NdF`}
          </p>
        </div>
        <div className={`rounded-xl border p-4 ${soldeNet >= 0 ? "border-brand-blue/30 bg-brand-blue/5" : "border-orange-200 bg-orange-50"}`}>
          <div className={`flex items-center gap-2 ${soldeNet >= 0 ? "text-brand-blue-dark" : "text-orange-700"}`}>
            <Scale className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Solde net prévisionnel</span>
          </div>
          <p className={`mt-2 text-2xl font-bold ${soldeNet >= 0 ? "text-brand-blue-dark" : "text-orange-700"}`}>
            {soldeNet >= 0 ? "+" : ""}{formatEuros(soldeNet)}
          </p>
          <p className={`mt-0.5 text-xs ${soldeNet >= 0 ? "text-brand-blue" : "text-orange-600"}`}>
            {soldeNet >= 0 ? "Solde positif ✓" : "Attention : sorties > entrées"}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION MARGE & RENTABILITÉ
      ═══════════════════════════════════════════════════════════════════════ */}
      {margesChantiers.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-brand-navy to-brand-blue-dark px-5 py-4">
            <BarChart3 className="h-5 w-5 text-white/70" />
            <div>
              <h3 className="font-semibold text-white">Marge & Rentabilité par chantier</h3>
              <p className="text-xs text-white/60">Coûts engagés vs budget — mise à jour en temps réel</p>
            </div>
          </div>

          {/* ── Alertes dépassement budget ── */}
          {(() => {
            const alertes = margesChantiers.filter(m => m.budget > 0 && m.coutEngages > m.budget);
            if (alertes.length === 0) return null;
            return (
              <div className="border-b border-red-200 bg-red-50 px-5 py-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      {alertes.length === 1
                        ? "1 chantier a dépassé son budget"
                        : `${alertes.length} chantiers ont dépassé leur budget`}
                    </p>
                    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {alertes.map(a => (
                        <li key={a.id} className="text-xs text-red-600">
                          <Link href={`/chantiers/${a.id}`} className="hover:underline font-medium">{a.nom}</Link>
                          {" "}— dépassement de{" "}
                          <span className="font-bold">{formatEuros(a.coutEngages - a.budget)}</span>
                          {" "}({((a.coutEngages / a.budget - 1) * 100).toFixed(0)} % au-dessus)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Légende */}
          <div className="flex flex-wrap gap-4 border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> ≥ 20 % — Excellent</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-400" /> 10-20 % — Bon</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> 5-10 % — Marginal</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" /> 0-5 % — Faible</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> &lt; 0 % — Perte</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Chantier</th>
                  <th className="px-4 py-3 text-right">Budget / CA</th>
                  <th className="px-4 py-3 text-right">Coûts réels</th>
                  <th className="px-4 py-3 text-right">Coûts engagés</th>
                  <th className="px-4 py-3 text-right">Marge engagée</th>
                  <th className="px-4 py-3 min-w-[160px]">Rentabilité</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {margesChantiers.map((m) => {
                  const cfg = rentaCfg(m.rentabilite);
                  const base = m.budget > 0 ? m.budget : m.caFact;
                  const consoPct = base > 0 ? (m.coutEngages / base) * 100 : 0;
                  const depassement = m.budget > 0 && m.coutEngages > m.budget;
                  return (
                    <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${depassement ? "bg-red-50/30" : ""}`}>
                      {/* Chantier */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-700 line-clamp-1">{m.nom}</p>
                          {depassement && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                              <AlertTriangle className="h-2.5 w-2.5" /> DÉPASSEMENT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{m.reference}</p>
                      </td>

                      {/* Budget / CA */}
                      <td className="px-4 py-3 text-right">
                        {m.budget > 0 ? (
                          <>
                            <p className="font-semibold text-brand-navy">{formatEuros(m.budget)}</p>
                            {m.caFact > 0 && m.caFact !== m.budget && (
                              <p className="text-xs text-slate-400">Facturé : {formatEuros(m.caFact)}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Coûts réels */}
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-slate-700">{formatEuros(m.coutReels)}</p>
                        {m.depReel > 0 && (
                          <p className="text-xs text-slate-400">dont {formatEuros(m.depReel)} dép.</p>
                        )}
                      </td>

                      {/* Coûts engagés */}
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-slate-700">{formatEuros(m.coutEngages)}</p>
                        {m.depPrev > 0 && (
                          <p className="text-xs text-orange-500">+ {formatEuros(m.depPrev)} prév.</p>
                        )}
                      </td>

                      {/* Marge engagée */}
                      <td className="px-4 py-3 text-right">
                        <p className={`font-bold ${m.margeEngagee >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {m.margeEngagee >= 0 ? "+" : ""}{formatEuros(m.margeEngagee)}
                        </p>
                        {m.caFact > 0 && m.coutReels > 0 && (
                          <p className={`text-xs ${m.margeReelle >= 0 ? "text-slate-400" : "text-red-400"}`}>
                            Réelle : {m.margeReelle >= 0 ? "+" : ""}{formatEuros(m.margeReelle)}
                          </p>
                        )}
                      </td>

                      {/* Rentabilité + barre */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-full bg-slate-100 h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all ${depassement ? "bg-red-500" : cfg.bar}`}
                              style={{ width: `${Math.min(Math.max(consoPct, 0), 100)}%` }}
                            />
                          </div>
                          <span className={`w-16 text-right text-xs font-bold ${depassement ? "text-red-600" : cfg.text}`}>
                            {depassement ? `${Math.round(consoPct)} %` : cfg.label}
                          </span>
                        </div>
                        {base > 0 && (
                          <p className={`mt-0.5 text-[10px] ${depassement ? "text-red-500 font-medium" : "text-slate-400"}`}>
                            {Math.round(consoPct)} % du budget consommé{depassement ? " ⚠️" : ""}
                          </p>
                        )}
                      </td>

                      {/* Lien chantier */}
                      <td className="px-4 py-3 text-right">
                        <Link href={`/chantiers/${m.id}`}
                          className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline">
                          Voir <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Pied de tableau : totaux */}
              {margesChantiers.length > 1 && (() => {
                const totBudget = margesChantiers.reduce((s, m) => s + (m.budget > 0 ? m.budget : m.caFact), 0);
                const totCoutReels = margesChantiers.reduce((s, m) => s + m.coutReels, 0);
                const totCoutEngage = margesChantiers.reduce((s, m) => s + m.coutEngages, 0);
                const totMargeEngage = totBudget - totCoutEngage;
                const totRenta = totBudget > 0 ? (totMargeEngage / totBudget) * 100 : null;
                const cfg = rentaCfg(totRenta);
                return (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                      <td className="px-4 py-3 text-xs uppercase text-slate-500">Total ({margesChantiers.length} chantiers)</td>
                      <td className="px-4 py-3 text-right font-bold text-brand-navy">{formatEuros(totBudget)}</td>
                      <td className="px-4 py-3 text-right">{formatEuros(totCoutReels)}</td>
                      <td className="px-4 py-3 text-right">{formatEuros(totCoutEngage)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${totMargeEngage >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {totMargeEngage >= 0 ? "+" : ""}{formatEuros(totMargeEngage)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      )}

      {/* ── Timeline par mois ── */}
      <div className="flex flex-col gap-4">
        {timeline.map((month) => {
          const isCurrent = month.key === nowKey;
          return (
            <div key={month.key}
              className={`overflow-hidden rounded-xl border bg-white shadow-sm ${isCurrent ? "border-brand-blue/40" : "border-slate-200"}`}>
              <div className={`flex items-center justify-between px-5 py-3 ${isCurrent ? "bg-brand-blue/5" : "bg-slate-50"}`}>
                <div className="flex items-center gap-2">
                  <CalendarClock className={`h-4 w-4 ${isCurrent ? "text-brand-blue" : "text-slate-400"}`} />
                  <span className={`font-semibold capitalize ${isCurrent ? "text-brand-blue-dark" : "text-slate-700"}`}>
                    {month.label}
                    {isCurrent && <span className="ml-2 rounded-full bg-brand-blue px-2 py-0.5 text-xs text-white">Mois en cours</span>}
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  {month.enc > 0 && <span className="font-semibold text-emerald-600">+{formatEuros(month.enc)}</span>}
                  {month.dec > 0 && <span className="font-semibold text-red-600">-{formatEuros(month.dec)}</span>}
                  {month.enc === 0 && month.dec === 0 && <span className="text-xs text-slate-400">Aucun flux</span>}
                </div>
              </div>

              {month.items.length === 0 ? (
                <div className="px-5 py-4 text-center text-sm text-slate-400">Aucun flux planifié ce mois</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {/* Encaissements */}
                  {month.items.filter(i => i.sens === "encaissement").map((item) => {
                    const cfg = SOUS_TYPE_CFG[item.sous_type];
                    return (
                      <div key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-emerald-50/30">
                        <span className="text-lg">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.lien
                              ? <Link href={item.lien} className="text-sm font-medium text-slate-700 hover:underline">{item.label}</Link>
                              : <span className="text-sm font-medium text-slate-700">{item.label}</span>
                            }
                            {item.enRetard && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                <AlertTriangle className="h-3 w-3" /> En retard
                              </span>
                            )}
                          </div>
                          {item.chantier && <p className="text-xs text-slate-400">{item.chantier}</p>}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
                        <span className="shrink-0 font-bold text-emerald-600">+{formatEuros(item.montant)}</span>
                      </div>
                    );
                  })}
                  {/* Décaissements */}
                  {month.items.filter(i => i.sens === "decaissement").map((item) => {
                    if (item.sous_type === "depense_prev") {
                      return (
                        <DepensePrevRow
                          key={item.id}
                          id={item.id}
                          libelle={item.label}
                          montant={item.montant}
                          categorie={item.statut ?? "AUTRE"}
                          dateISO={item.dateISO ?? new Date().toISOString().slice(0, 10)}
                          chantier={item.chantier}
                          tiers={item.tiers}
                        />
                      );
                    }
                    const cfg = SOUS_TYPE_CFG[item.sous_type];
                    return (
                      <div key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-red-50/20">
                        <span className="text-lg">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          {item.lien
                            ? <Link href={item.lien} className="text-sm font-medium text-slate-700 hover:underline">{item.label}</Link>
                            : <span className="text-sm font-medium text-slate-700">{item.label}</span>
                          }
                          {(item.chantier || (item.tiers && !item.lien)) && (
                            <p className="text-xs text-slate-400">
                              {[item.chantier, item.tiers && !item.lien ? item.tiers : null].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
                        <span className="shrink-0 font-bold text-red-600">-{formatEuros(item.montant)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Ajouter une dépense prévisionnelle ── */}
      <PrevFormAutoFill
        depensesRecentes={depensesRecentes}
        chantiers={chantiers}
        fournisseurs={fournisseurs}
      />

    </div>
  );
}

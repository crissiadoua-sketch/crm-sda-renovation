export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ChevronRight,
  ShoppingCart,
  Truck,
  Building2,
  Calendar,
  FileText,
  ArrowRight,
  Filter,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate } from "@/lib/format";

type Periode = "mois" | "trimestre" | "semestre" | "annee";

function getDateRange(
  periode: Periode,
  annee?: number,
): { debut: Date; fin: Date; label: string } {
  const now = new Date();
  const y = annee ?? now.getFullYear();
  const m = y === now.getFullYear() ? now.getMonth() : 0;

  switch (periode) {
    case "mois":
      return {
        debut: new Date(y, m, 1),
        fin: new Date(y, m + 1, 0, 23, 59, 59),
        label: new Date(y, m, 1).toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        }),
      };
    case "trimestre": {
      const t = Math.floor(m / 3);
      return {
        debut: new Date(y, t * 3, 1),
        fin: new Date(y, t * 3 + 3, 0, 23, 59, 59),
        label: `T${t + 1} ${y}`,
      };
    }
    case "semestre": {
      const s = m < 6 ? 0 : 1;
      return {
        debut: new Date(y, s * 6, 1),
        fin: new Date(y, s * 6 + 6, 0, 23, 59, 59),
        label: `S${s + 1} ${y}`,
      };
    }
    case "annee":
    default:
      return {
        debut: new Date(y, 0, 1),
        fin: new Date(y, 11, 31, 23, 59, 59),
        label: `Année ${y}`,
      };
  }
}

const PERIODES: { value: Periode; label: string }[] = [
  { value: "mois", label: "Ce mois" },
  { value: "trimestre", label: "Ce trimestre" },
  { value: "semestre", label: "Ce semestre" },
  { value: "annee", label: "Cette année" },
];

const STATUT_BC: Record<string, { label: string; cls: string }> = {
  BROUILLON:    { label: "Brouillon",    cls: "bg-slate-100 text-slate-600" },
  ENVOYE:       { label: "Envoyé",       cls: "bg-blue-100 text-blue-700" },
  CONFIRME:     { label: "Confirmé",     cls: "bg-indigo-100 text-indigo-700" },
  RECU_PARTIEL: { label: "Reçu partiel", cls: "bg-orange-100 text-orange-700" },
  RECU:         { label: "Reçu",         cls: "bg-emerald-100 text-emerald-700" },
  ANNULE:       { label: "Annulé",       cls: "bg-red-100 text-red-600" },
};

const STATUT_FF: Record<string, { label: string; cls: string }> = {
  A_PAYER:        { label: "À payer",   cls: "bg-blue-100 text-blue-700" },
  PAYEE_PARTIELLE:{ label: "Partielle", cls: "bg-orange-100 text-orange-700" },
  PAYEE:          { label: "Payée",     cls: "bg-emerald-100 text-emerald-700" },
  EN_RETARD:      { label: "En retard", cls: "bg-red-100 text-red-700" },
};

export default async function TableauAchatsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; fournisseurId?: string; annee?: string }>;
}) {
  const { periode: periodeParam, fournisseurId, annee: anneeParam } = await searchParams;
  const periode: Periode =
    (["mois", "trimestre", "semestre", "annee"] as Periode[]).includes(periodeParam as Periode)
      ? (periodeParam as Periode)
      : "annee";
  const annee = anneeParam ? parseInt(anneeParam, 10) : new Date().getFullYear();
  const { debut, fin, label: periodeLabel } = getDateRange(periode, annee);

  const now = new Date();
  const annees = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  // Charger la liste des fournisseurs pour le filtre
  const fournisseurs = await prisma.fournisseur.findMany({
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });

  const whereBase = fournisseurId ? { fournisseurId } : {};

  const [bonsCommande, facturesFournisseur] = await Promise.all([
    prisma.bonCommande.findMany({
      where: {
        ...whereBase,
        dateCreation: { gte: debut, lte: fin },
        statut: { not: "ANNULE" },
      },
      include: {
        fournisseur: { select: { id: true, nom: true } },
        chantier: { select: { id: true, nom: true, reference: true } },
        facturesFournisseur: {
          select: { id: true, numero: true, montantTTC: true, statut: true },
          take: 1,
        },
      },
      orderBy: { dateCreation: "desc" },
    }),
    prisma.factureFournisseur.findMany({
      where: {
        ...whereBase,
        dateReception: { gte: debut, lte: fin },
      },
      include: {
        fournisseur: { select: { id: true, nom: true } },
        chantier: { select: { id: true, nom: true, reference: true } },
        bonCommande: { select: { id: true, numero: true } },
      },
      orderBy: { dateReception: "desc" },
    }),
  ]);

  // ── TOTAUX ────────────────────────────────────────────────────────────
  const totalBCHT = bonsCommande.reduce((s, b) => s + b.totalHT, 0);
  const totalBCTTC = bonsCommande.reduce((s, b) => s + b.totalTTC, 0);
  const totalFFHT = facturesFournisseur.reduce((s, f) => s + f.montantHT, 0);
  const totalFFTTC = facturesFournisseur.reduce((s, f) => s + f.montantTTC, 0);
  const totalFFTVA = facturesFournisseur.reduce((s, f) => s + f.montantTVA, 0);
  const totalFFResteDu = facturesFournisseur.reduce((s, f) => s + Math.max(0, f.montantTTC - f.montantPaye), 0);

  // ── PAR FOURNISSEUR (BC + FF) ──────────────────────────────────────────
  const parFournisseur: Record<string, {
    id: string; nom: string; bcHT: number; nbBC: number; ffHT: number; nbFF: number; tvaFF: number;
  }> = {};

  for (const bc of bonsCommande) {
    const key = bc.fournisseur.id;
    if (!parFournisseur[key]) {
      parFournisseur[key] = { id: key, nom: bc.fournisseur.nom, bcHT: 0, nbBC: 0, ffHT: 0, nbFF: 0, tvaFF: 0 };
    }
    parFournisseur[key].bcHT += bc.totalHT;
    parFournisseur[key].nbBC += 1;
  }
  for (const ff of facturesFournisseur) {
    const key = ff.fournisseur.id;
    if (!parFournisseur[key]) {
      parFournisseur[key] = { id: key, nom: ff.fournisseur.nom, bcHT: 0, nbBC: 0, ffHT: 0, nbFF: 0, tvaFF: 0 };
    }
    parFournisseur[key].ffHT += ff.montantHT;
    parFournisseur[key].nbFF += 1;
    parFournisseur[key].tvaFF += ff.montantTVA;
  }
  const topFournisseurs = Object.values(parFournisseur).sort(
    (a, b) => (b.bcHT + b.ffHT) - (a.bcHT + a.ffHT),
  );

  const fournisseurActif = fournisseurs.find((f) => f.id === fournisseurId);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Tableau des achats</span>
          </nav>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-brand-orange" />
            <h2 className="text-xl font-bold text-brand-navy">Tableau des achats — {periodeLabel}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Bons de commande · Factures fournisseurs · Total par fournisseur
          </p>
        </div>
        <Link
          href="/bons-commande/nouveau"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark"
        >
          <ShoppingCart className="h-4 w-4" /> Nouveau BC
        </Link>
      </div>

      {/* Filtres */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Période */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Période
            </label>
            <div className="flex items-center gap-1">
              {PERIODES.map(({ value, label }) => (
                <Link
                  key={value}
                  href={`?periode=${value}&annee=${annee}${fournisseurId ? `&fournisseurId=${fournisseurId}` : ""}`}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    periode === value
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-slate-200 text-slate-600 hover:border-brand-blue/40"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Année */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Année
            </label>
            <div className="flex items-center gap-1">
              {annees.map((y) => (
                <Link
                  key={y}
                  href={`?periode=${periode}&annee=${y}${fournisseurId ? `&fournisseurId=${fournisseurId}` : ""}`}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    y === annee
                      ? "border-brand-navy bg-brand-navy text-white"
                      : "border-slate-200 text-slate-600 hover:border-brand-navy/40"
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          </div>

          {/* Fournisseur */}
          <form method="get" className="flex-1 min-w-48">
            <input type="hidden" name="periode" value={periode} />
            <input type="hidden" name="annee" value={annee} />
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Filter className="inline h-3 w-3 mr-1" />
              Fournisseur
            </label>
            <div className="flex items-center gap-2">
              <select
                name="fournisseurId"
                defaultValue={fournisseurId ?? ""}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              >
                <option value="">Tous les fournisseurs</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
              <button
                type="submit"
                className="whitespace-nowrap rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-navy/90"
              >
                Filtrer
              </button>
              {fournisseurId && (
                <Link
                  href={`?periode=${periode}&annee=${annee}`}
                  className="text-xs text-brand-blue hover:underline whitespace-nowrap"
                >
                  Effacer
                </Link>
              )}
            </div>
          </form>
        </div>
        {fournisseurActif && (
          <p className="mt-2 text-xs text-brand-blue">
            Filtré sur : <strong>{fournisseurActif.nom}</strong>
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">BCs engagés</p>
          <p className="mt-2 text-2xl font-bold text-brand-navy">{formatEuros(totalBCHT)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{bonsCommande.length} BC — {formatEuros(totalBCTTC)} TTC</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fact. fourn. HT</p>
          <p className="mt-2 text-2xl font-bold text-slate-700">{formatEuros(totalFFHT)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{facturesFournisseur.length} factures</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">TVA déductible</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{formatEuros(totalFFTVA)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Sur factures fournisseurs</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Reste à payer FF</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatEuros(totalFFResteDu)}</p>
          <p className="text-xs text-red-400 mt-0.5">Total TTC factures : {formatEuros(totalFFTTC)}</p>
        </div>
      </div>

      {/* Total par fournisseur */}
      {topFournisseurs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-brand-navy">Total achats par fournisseur</h3>
            <p className="text-xs text-slate-400 mt-0.5">Bons de commande + factures fournisseurs — {periodeLabel}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Fournisseur</th>
                  <th className="px-5 py-3 text-right">BC HT</th>
                  <th className="px-5 py-3 text-right">Fact. fourn. HT</th>
                  <th className="px-5 py-3 text-right">TVA déductible</th>
                  <th className="px-5 py-3 text-right font-bold">Total engagé HT</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topFournisseurs.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">{f.nom}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 pl-5">
                        {f.nbBC > 0 ? `${f.nbBC} BC` : ""}
                        {f.nbBC > 0 && f.nbFF > 0 ? " · " : ""}
                        {f.nbFF > 0 ? `${f.nbFF} fact.` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">{f.bcHT > 0 ? formatEuros(f.bcHT) : "—"}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{f.ffHT > 0 ? formatEuros(f.ffHT) : "—"}</td>
                    <td className="px-5 py-3 text-right text-blue-600 font-medium">{f.tvaFF > 0 ? formatEuros(f.tvaFF) : "—"}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800">{formatEuros(f.bcHT + f.ffHT)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`?periode=${periode}&annee=${annee}&fournisseurId=${f.id}`}
                        className="text-xs text-brand-blue hover:underline"
                      >
                        Filtrer
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-sm">
                <tr>
                  <td className="px-5 py-3 text-slate-700">TOTAL</td>
                  <td className="px-5 py-3 text-right text-slate-700">{formatEuros(totalBCHT)}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{formatEuros(totalFFHT)}</td>
                  <td className="px-5 py-3 text-right text-blue-700">{formatEuros(totalFFTVA)}</td>
                  <td className="px-5 py-3 text-right text-slate-900">{formatEuros(totalBCHT + totalFFHT)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tableau des bons de commande */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-brand-orange" />
            <h3 className="font-semibold text-brand-navy">Bons de commande — {periodeLabel}</h3>
          </div>
          <Link href="/bons-commande" className="text-xs text-brand-blue hover:underline">
            Gérer tous les BC <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
        {bonsCommande.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShoppingCart className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">Aucun bon de commande sur cette période.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">N° BC</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Fournisseur</th>
                  <th className="px-5 py-3">Chantier</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3 text-right">HT</th>
                  <th className="px-5 py-3 text-right">TTC</th>
                  <th className="px-5 py-3">Fact. fourn.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bonsCommande.map((bc) => {
                  const st = STATUT_BC[bc.statut] ?? { label: bc.statut, cls: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={bc.id} className="hover:bg-slate-50">
                      <td className="px-5 py-2.5">
                        <Link href={`/bons-commande/${bc.id}`} className="font-medium text-brand-navy hover:underline">
                          {bc.numero}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                        {formatDate(bc.dateCreation)}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-700">{bc.fournisseur.nom}</span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-slate-500">
                        {bc.chantier ? (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {bc.chantier.nom}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium text-slate-700">{formatEuros(bc.totalHT)}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-slate-800">{formatEuros(bc.totalTTC)}</td>
                      <td className="px-5 py-2.5">
                        {bc.facturesFournisseur.length > 0 ? (
                          <Link
                            href="/finances/fournisseurs-echeancier"
                            className="text-xs text-brand-blue hover:underline"
                          >
                            {bc.facturesFournisseur[0].numero}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-slate-700">Total BC</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatEuros(totalBCHT)}</td>
                  <td className="px-5 py-3 text-right text-slate-900">{formatEuros(totalBCTTC)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Tableau des factures fournisseurs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-blue" />
            <h3 className="font-semibold text-brand-navy">Factures fournisseurs reçues — {periodeLabel}</h3>
          </div>
          <Link href="/finances/fournisseurs-echeancier" className="text-xs text-brand-blue hover:underline">
            Échéancier fournisseurs <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
        {facturesFournisseur.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">Aucune facture fournisseur sur cette période.</p>
            <Link
              href="/finances/fournisseurs-echeancier"
              className="mt-2 inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
            >
              Saisir des factures fournisseurs <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">N° Facture</th>
                  <th className="px-5 py-3">Réception</th>
                  <th className="px-5 py-3">Fournisseur</th>
                  <th className="px-5 py-3">Chantier</th>
                  <th className="px-5 py-3">BC lié</th>
                  <th className="px-5 py-3 text-right">HT</th>
                  <th className="px-5 py-3 text-right">TVA</th>
                  <th className="px-5 py-3 text-right">TTC</th>
                  <th className="px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturesFournisseur.map((ff) => {
                  const st = STATUT_FF[ff.statut] ?? { label: ff.statut, cls: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={ff.id} className="hover:bg-slate-50">
                      <td className="px-5 py-2.5 font-medium text-slate-700">{ff.numero}</td>
                      <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                        {formatDate(ff.dateReception)}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-700">{ff.fournisseur.nom}</span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-slate-500">
                        {ff.chantier ? (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {ff.chantier.nom}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        {ff.bonCommande ? (
                          <Link
                            href={`/bons-commande/${ff.bonCommande.id}`}
                            className="text-xs text-brand-blue hover:underline"
                          >
                            {ff.bonCommande.numero}
                          </Link>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right text-slate-700">{formatEuros(ff.montantHT)}</td>
                      <td className="px-5 py-2.5 text-right text-blue-600 text-xs">{formatEuros(ff.montantTVA)}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-slate-800">{formatEuros(ff.montantTTC)}</td>
                      <td className="px-5 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-slate-700">Total factures fournisseurs</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatEuros(totalFFHT)}</td>
                  <td className="px-5 py-3 text-right text-blue-700">{formatEuros(totalFFTVA)}</td>
                  <td className="px-5 py-3 text-right text-slate-900">{formatEuros(totalFFTTC)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Liens */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <Link href="/finances" className="text-brand-blue hover:underline">
          ← Tableau des achats global (vue résumée)
        </Link>
        <Link href="/finances/tva" className="text-brand-blue hover:underline">
          → Suivi TVA (CA3)
        </Link>
        <Link href="/finances/fournisseurs-echeancier" className="text-brand-blue hover:underline">
          → Échéancier fournisseurs
        </Link>
      </div>
    </div>
  );
}

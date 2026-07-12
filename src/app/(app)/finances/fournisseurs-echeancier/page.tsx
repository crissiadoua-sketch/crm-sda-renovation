export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Truck,
  Building2,
  Plus,
  FileText,
  Calendar,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate } from "@/lib/format";
import { EcheancierActions } from "./echeancier-actions";
import { NouvelleFactureForm } from "./nouvelle-facture-form";

const STATUT_STYLES: Record<string, { label: string; cls: string }> = {
  A_PAYER:        { label: "À payer",         cls: "bg-blue-100 text-blue-700" },
  PAYEE_PARTIELLE:{ label: "Partielle",        cls: "bg-orange-100 text-orange-700" },
  PAYEE:          { label: "Payée",            cls: "bg-emerald-100 text-emerald-700" },
  EN_RETARD:      { label: "En retard",        cls: "bg-red-100 text-red-700" },
};

function jours(d: Date): number {
  return Math.floor((d.getTime() - Date.now()) / 86400000);
}

export default async function EcheancierFournisseursPage() {
  const today = new Date();

  // Mettre à jour les statuts retard
  await prisma.factureFournisseur.updateMany({
    where: { statut: "A_PAYER", dateEcheance: { lt: today } },
    data: { statut: "EN_RETARD" },
  });

  const [factures, fournisseurs, chantiers] = await Promise.all([
    prisma.factureFournisseur.findMany({
      where: { statut: { not: "PAYEE" } },
      include: {
        fournisseur: { select: { nom: true, id: true } },
        chantier: { select: { nom: true, reference: true } },
        bonCommande: { select: { numero: true } },
        paiements: { select: { montant: true, date: true, methode: true } },
      },
      orderBy: [
        { statut: "asc" },
        { dateEcheance: "asc" },
      ],
    }),
    prisma.fournisseur.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
    prisma.chantier.findMany({
      where: { statut: { in: ["EN_COURS", "PLANIFIE"] } },
      select: { id: true, nom: true, reference: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  // KPIs par vieillissement
  const en_retard = factures.filter((f) => f.statut === "EN_RETARD");
  const lt30 = factures.filter((f) => f.statut !== "EN_RETARD" && f.dateEcheance && jours(f.dateEcheance) >= 0 && jours(f.dateEcheance) <= 30);
  const lt60 = factures.filter((f) => f.statut !== "EN_RETARD" && f.dateEcheance && jours(f.dateEcheance) > 30 && jours(f.dateEcheance) <= 60);
  const gt60 = factures.filter((f) => f.statut !== "EN_RETARD" && f.dateEcheance && jours(f.dateEcheance) > 60);
  const sansEcheance = factures.filter((f) => !f.dateEcheance);

  const resteAPayerTotal = factures.reduce((s, f) => s + (f.montantTTC - f.montantPaye), 0);
  const montantRetard = en_retard.reduce((s, f) => s + (f.montantTTC - f.montantPaye), 0);
  const alertes7j = factures.filter((f) => f.dateEcheance && jours(f.dateEcheance) >= 0 && jours(f.dateEcheance) <= 7).length;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Échéancier fournisseurs</span>
          </nav>
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-brand-orange" />
            <h2 className="text-xl font-bold text-brand-navy">Échéancier fournisseurs</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Factures à payer, échéances, suivi des règlements
          </p>
        </div>
        <NouvelleFactureForm fournisseurs={fournisseurs} chantiers={chantiers} />
      </div>

      {/* Alerte échéances < 7 jours */}
      {alertes7j > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            <strong>{alertes7j} facture{alertes7j > 1 ? "s" : ""}</strong> arrivent à échéance dans les 7 prochains jours.
          </span>
        </div>
      )}

      {/* KPIs vieillissement */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600">En retard</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{formatEuros(montantRetard)}</p>
          <p className="text-xs text-red-500 mt-0.5">{en_retard.length} facture{en_retard.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Échéance &lt; 30j</p>
          <p className="mt-1 text-2xl font-bold text-orange-700">{formatEuros(lt30.reduce((s, f) => s + f.montantTTC - f.montantPaye, 0))}</p>
          <p className="text-xs text-orange-500 mt-0.5">{lt30.length} facture{lt30.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Échéance 30–60j</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{formatEuros(lt60.reduce((s, f) => s + f.montantTTC - f.montantPaye, 0))}</p>
          <p className="text-xs text-amber-500 mt-0.5">{lt60.length} facture{lt60.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total restant dû</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{formatEuros(resteAPayerTotal)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{factures.length} facture{factures.length > 1 ? "s" : ""} en cours</p>
        </div>
      </div>

      {/* Tableau des factures */}
      {factures.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">Aucune facture fournisseur en attente.</p>
          <p className="text-slate-300 text-xs mt-1">Saisissez vos factures fournisseurs pour suivre les échéances.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-brand-navy px-5 py-3">
            <h3 className="font-semibold text-white">Factures fournisseurs — à régler</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fournisseur</th>
                  <th className="px-4 py-3">N° facture</th>
                  <th className="px-4 py-3">Chantier</th>
                  <th className="px-4 py-3">Réception</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3 text-right">Reste dû</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {factures.map((f) => {
                  const restedu = f.montantTTC - f.montantPaye;
                  const style = STATUT_STYLES[f.statut] ?? STATUT_STYLES.A_PAYER;
                  const joursEch = f.dateEcheance ? jours(f.dateEcheance) : null;
                  const estUrgent = joursEch !== null && joursEch >= 0 && joursEch <= 7;
                  return (
                    <tr key={f.id} className={`hover:bg-slate-50/50 ${f.statut === "EN_RETARD" ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-700">{f.fournisseur.nom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        {f.numero}
                        {f.reference && <span className="block text-slate-400">{f.reference}</span>}
                        {f.bonCommande && (
                          <span className="block text-brand-blue/70">BC {f.bonCommande.numero}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {f.chantier ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            <span>{f.chantier.nom}</span>
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(f.dateReception)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {f.dateEcheance ? (
                          <div className={`flex items-center gap-1 ${f.statut === "EN_RETARD" ? "text-red-600" : estUrgent ? "text-orange-600" : "text-slate-500"}`}>
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>{formatDate(f.dateEcheance)}</span>
                            {f.statut === "EN_RETARD" && joursEch !== null && (
                              <span className="text-xs">({Math.abs(joursEch)}j)</span>
                            )}
                            {estUrgent && (
                              <span className="text-xs font-semibold">({joursEch}j)</span>
                            )}
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {formatEuros(f.montantTTC)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${restedu > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {formatEuros(restedu)}
                        </span>
                        {f.montantPaye > 0 && (
                          <p className="text-[10px] text-slate-400">{formatEuros(f.montantPaye)} payé</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.cls}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <EcheancierActions
                          factureId={f.id}
                          restedu={restedu}
                          fournisseurNom={f.fournisseur.nom}
                          numero={f.numero}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-slate-700">Total restant dû</td>
                  <td className="px-4 py-3 text-right text-red-700">{formatEuros(resteAPayerTotal)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Factures sans échéance */}
      {sansEcheance.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h3 className="font-semibold text-slate-600">Sans date d&apos;échéance ({sansEcheance.length})</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {sansEcheance.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{f.fournisseur.nom} — {f.numero}</p>
                  <p className="text-xs text-slate-400">Reçue le {formatDate(f.dateReception)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">{formatEuros(f.montantTTC)}</span>
                  <EcheancierActions
                    factureId={f.id}
                    restedu={f.montantTTC - f.montantPaye}
                    fournisseurNom={f.fournisseur.nom}
                    numero={f.numero}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lien rapprochement */}
      <div className="flex gap-3 text-xs text-slate-400">
        <Link href="/comptabilite/rapprochement" className="text-brand-blue hover:underline">
          → Rapprochement bancaire : les débits peuvent être liés directement à ces factures
        </Link>
      </div>
    </div>
  );
}

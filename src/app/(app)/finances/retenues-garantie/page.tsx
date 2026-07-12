export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight, ShieldCheck, AlertTriangle, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate } from "@/lib/format";
import { RGActions } from "./rg-actions";

export default async function RetenuesGarantiePage() {
  const contrats = await prisma.contratSousTraitance.findMany({
    where: {
      retenueGarantie: { gt: 0 },
      statut: { in: ["SIGNE", "EN_COURS", "TERMINE"] },
    },
    include: {
      sousTraitant: { select: { nom: true } },
      chantier: { select: { nom: true, reference: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const today = new Date();

  type RGItem = {
    id: string;
    numero: string;
    sousTraitantId: string;
    sousTraitant: string;
    chantierId: string;
    chantier: string;
    chantierRef: string;
    montantHT: number;
    tauxRG: number;
    montantRG: number;
    dateReception: Date | null;
    dateLiberationPrevue: Date | null;
    rgLiberee: boolean;
    statut: string;
    joursAvantLiberation: number | null;
  };

  const items: RGItem[] = contrats.map((c) => {
    const montantRG = (c.montantHT ?? 0) * ((c.retenueGarantie ?? 0) / 100);
    const dateRef = c.dateReception ?? c.dateFin;
    const dateLiberationPrevue = dateRef
      ? new Date(new Date(dateRef).getFullYear() + 1, new Date(dateRef).getMonth(), new Date(dateRef).getDate())
      : null;
    const joursAvantLiberation = dateLiberationPrevue
      ? Math.floor((dateLiberationPrevue.getTime() - today.getTime()) / 86400000)
      : null;

    return {
      id: c.id,
      numero: c.numero,
      sousTraitantId: c.sousTraitantId,
      sousTraitant: c.sousTraitant.nom,
      chantierId: c.chantierId,
      chantier: c.chantier.nom,
      chantierRef: c.chantier.reference ?? "",
      montantHT: c.montantHT ?? 0,
      tauxRG: c.retenueGarantie ?? 0,
      montantRG,
      dateReception: c.dateReception ? new Date(c.dateReception) : null,
      dateLiberationPrevue,
      rgLiberee: c.rgLiberee,
      statut: c.statut,
      joursAvantLiberation,
    };
  });

  const totalRGRetenues = items.filter((i) => !i.rgLiberee).reduce((s, i) => s + i.montantRG, 0);
  const totalRGLiberees = items.filter((i) => i.rgLiberee).reduce((s, i) => s + i.montantRG, 0);
  const aLibererUrgent = items.filter(
    (i) => !i.rgLiberee && i.joursAvantLiberation !== null && i.joursAvantLiberation <= 30 && i.joursAvantLiberation >= 0
  );
  const enRetard = items.filter(
    (i) => !i.rgLiberee && i.joursAvantLiberation !== null && i.joursAvantLiberation < 0
  );

  function statusBadge(item: RGItem) {
    if (item.rgLiberee) return { label: "Libérée", cls: "bg-emerald-100 text-emerald-700" };
    if (item.joursAvantLiberation === null) return { label: "Date inconnue", cls: "bg-slate-100 text-slate-500" };
    if (item.joursAvantLiberation < 0) return { label: `En retard ${Math.abs(item.joursAvantLiberation)}j`, cls: "bg-red-100 text-red-700" };
    if (item.joursAvantLiberation <= 30) return { label: `À libérer dans ${item.joursAvantLiberation}j`, cls: "bg-amber-100 text-amber-700" };
    return { label: `Dans ${item.joursAvantLiberation}j`, cls: "bg-blue-100 text-blue-700" };
  }

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">Retenues de garantie</span>
        </nav>
        <h2 className="text-xl font-bold text-brand-navy">Retenues de garantie (RG)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Montants retenus sur les contrats sous-traitance · Libération 1 an après réception des travaux
        </p>
      </div>

      {/* Alerte urgente */}
      {(enRetard.length > 0 || aLibererUrgent.length > 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            {enRetard.length > 0 && (
              <p className="font-semibold">
                {enRetard.length} retenue{enRetard.length > 1 ? "s" : ""} à libérer en retard
                — {formatEuros(enRetard.reduce((s, i) => s + i.montantRG, 0))}
              </p>
            )}
            {aLibererUrgent.length > 0 && (
              <p className="mt-0.5">
                {aLibererUrgent.length} libération{aLibererUrgent.length > 1 ? "s" : ""} dans les 30 prochains jours
                — {formatEuros(aLibererUrgent.reduce((s, i) => s + i.montantRG, 0))}
              </p>
            )}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total RG retenues</p>
          <p className="text-xl font-bold text-brand-navy mt-1">{formatEuros(totalRGRetenues)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{items.filter((i) => !i.rgLiberee).length} contrats</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs text-red-600">À libérer — en retard</p>
          <p className="text-xl font-bold text-red-700 mt-1">{formatEuros(enRetard.reduce((s, i) => s + i.montantRG, 0))}</p>
          <p className="text-xs text-red-500 mt-0.5">{enRetard.length} contrat{enRetard.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-600">À libérer dans 30j</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{formatEuros(aLibererUrgent.reduce((s, i) => s + i.montantRG, 0))}</p>
          <p className="text-xs text-amber-500 mt-0.5">{aLibererUrgent.length} contrat{aLibererUrgent.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-600">RG libérées (total)</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatEuros(totalRGLiberees)}</p>
          <p className="text-xs text-emerald-500 mt-0.5">{items.filter((i) => i.rgLiberee).length} contrat{items.filter((i) => i.rgLiberee).length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-sm">
          Aucun contrat de sous-traitance avec retenue de garantie.{" "}
          <Link href="/contrats-sous-traitance" className="text-brand-blue hover:underline">
            Gérer les contrats →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-brand-navy px-5 py-3">
            <h3 className="font-semibold text-white">Détail des retenues de garantie</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-5 py-2.5 text-left">Contrat / Sous-traitant</th>
                  <th className="px-4 py-2.5 text-left">Chantier</th>
                  <th className="px-4 py-2.5 text-right">Montant HT</th>
                  <th className="px-4 py-2.5 text-right">RG ({"{"}%{"}"})</th>
                  <th className="px-4 py-2.5 text-right">Montant RG</th>
                  <th className="px-4 py-2.5 text-left">Date réception</th>
                  <th className="px-4 py-2.5 text-left">Libération prévue</th>
                  <th className="px-4 py-2.5 text-center">Statut</th>
                  <th className="px-4 py-2.5 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => {
                  const badge = statusBadge(item);
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/50 ${item.rgLiberee ? "opacity-60" : ""}`}>
                      <td className="px-5 py-3">
                        <Link href={`/contrats-sous-traitance/${item.id}`} className="font-medium text-brand-navy hover:text-brand-blue hover:underline">
                          {item.numero}
                        </Link>
                        <p className="text-xs">
                          <Link href={`/sous-traitants/${item.sousTraitantId}`} className="text-slate-400 hover:text-brand-blue hover:underline">
                            {item.sousTraitant}
                          </Link>
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/chantiers/${item.chantierId}`} className="text-slate-600 truncate max-w-[160px] hover:underline block">
                          {item.chantier}
                        </Link>
                        <p className="text-xs text-slate-400">{item.chantierRef}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatEuros(item.montantHT)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.tauxRG} %</td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-navy">{formatEuros(item.montantRG)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {item.dateReception ? formatDate(item.dateReception) : (
                          <RGActions cstId={item.id} action="dateReception" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {item.dateLiberationPrevue ? formatDate(item.dateLiberationPrevue) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!item.rgLiberee && (
                          <RGActions cstId={item.id} action="liberer" />
                        )}
                        {item.rgLiberee && (
                          <span className="text-xs text-emerald-600 flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Libérée
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Link href="/contrats-sous-traitance" className="flex items-center gap-2 text-sm text-brand-blue hover:underline">
          Gérer les contrats de sous-traitance <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

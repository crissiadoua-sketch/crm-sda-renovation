export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight, AlertTriangle, Clock, Receipt, ArrowRight, CheckCircle2, Phone, Mail, FileText, Send } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate } from "@/lib/format";
import { ImpayeActions } from "./impayes-actions";

export default async function ImpayesPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const factures = await prisma.facture.findMany({
    where: {
      statut: { in: ["ENVOYEE", "PAYEE_PARTIELLE", "EN_RETARD"] },
      dateEcheance: { lt: today },
    },
    include: {
      client: { select: { id: true, nom: true, telephone: true, email: true } },
      chantier: { select: { id: true, nom: true, reference: true } },
      relances: { orderBy: { date: "desc" } },
    },
    orderBy: { dateEcheance: "asc" },
  });

  const totalImpayes = factures.reduce((s, f) => s + (f.totalTTC - f.montantPaye), 0);
  const now = new Date();

  type Tranche = { label: string; color: string; bg: string; items: typeof factures };
  const tranches: Tranche[] = [
    { label: "0–30 jours", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", items: [] },
    { label: "31–60 jours", color: "text-orange-600", bg: "bg-orange-50 border-orange-200", items: [] },
    { label: "61–90 jours", color: "text-red-500", bg: "bg-red-50 border-red-200", items: [] },
    { label: "> 90 jours", color: "text-red-800", bg: "bg-red-100 border-red-300", items: [] },
  ];

  factures.forEach((f) => {
    if (!f.dateEcheance) return;
    const jours = Math.floor((now.getTime() - new Date(f.dateEcheance).getTime()) / 86400000);
    if (jours <= 30) tranches[0].items.push(f);
    else if (jours <= 60) tranches[1].items.push(f);
    else if (jours <= 90) tranches[2].items.push(f);
    else tranches[3].items.push(f);
  });

  const typeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    EMAIL: { label: "Email", icon: <Mail className="h-3 w-3" /> },
    COURRIER: { label: "Courrier", icon: <FileText className="h-3 w-3" /> },
    TELEPHONE: { label: "Téléphone", icon: <Phone className="h-3 w-3" /> },
    LR: { label: "Lettre Recommandée", icon: <Send className="h-3 w-3" /> },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Impayés & Relances</span>
          </nav>
          <h2 className="text-xl font-bold text-brand-navy">Impayés & Relances</h2>
          <p className="mt-1 text-sm text-slate-500">
            Factures échues non réglées · Suivi du vieillissement · Historique des relances
          </p>
        </div>
        <Link href="/factures" className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:text-brand-blue transition">
          <Receipt className="h-4 w-4" /> Toutes les factures
        </Link>
      </div>

      {factures.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-emerald-700">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">Aucun impayé</p>
            <p className="text-sm mt-0.5">Toutes les factures échues ont été réglées.</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <p className="text-xs font-medium text-red-600">Total impayés TTC</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{formatEuros(totalImpayes)}</p>
              <p className="text-xs text-red-500 mt-0.5">{factures.length} facture{factures.length > 1 ? "s" : ""}</p>
            </div>
            {tranches.map((t) => (
              <div key={t.label} className={`rounded-xl border p-4 shadow-sm ${t.bg}`}>
                <p className={`text-xs font-medium ${t.color}`}>{t.label}</p>
                <p className={`text-2xl font-bold mt-1 ${t.color}`}>{t.items.length}</p>
                <p className={`text-xs mt-0.5 ${t.color} opacity-70`}>
                  {formatEuros(t.items.reduce((s, f) => s + (f.totalTTC - f.montantPaye), 0))}
                </p>
              </div>
            ))}
          </div>

          {/* Liste par tranche */}
          {tranches.map((t) =>
            t.items.length === 0 ? null : (
              <div key={t.label} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className={`px-5 py-3 border-b ${t.bg} flex items-center gap-2`}>
                  <Clock className={`h-4 w-4 ${t.color}`} />
                  <h3 className={`font-semibold ${t.color}`}>
                    En retard de {t.label} — {t.items.length} facture{t.items.length > 1 ? "s" : ""}
                  </h3>
                  <span className={`ml-auto text-sm font-bold ${t.color}`}>
                    {formatEuros(t.items.reduce((s, f) => s + (f.totalTTC - f.montantPaye), 0))}
                  </span>
                </div>

                <div className="divide-y divide-slate-50">
                  {t.items.map((f) => {
                    const jours = f.dateEcheance
                      ? Math.floor((now.getTime() - new Date(f.dateEcheance).getTime()) / 86400000)
                      : 0;
                    const resteATTC = f.totalTTC - f.montantPaye;
                    const derniereRelance = f.relances[0];

                    return (
                      <div key={f.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Link href={`/factures/${f.id}`} className="font-semibold text-brand-navy hover:text-brand-blue">
                                {f.numero}
                              </Link>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.bg} ${t.color}`}>
                                {jours}j de retard
                              </span>
                              {f.relances.length === 0 && (
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700">
                                  Non relancé
                                </span>
                              )}
                            </div>
                            <Link href={`/clients/${f.client.id}`} className="text-sm text-slate-600 mt-0.5 hover:text-brand-blue hover:underline">{f.client.nom}</Link>
                            <p className="text-xs text-slate-400">
                              <Link href={`/chantiers/${f.chantier.id}`} className="hover:text-brand-blue hover:underline">{f.chantier.nom}</Link>
                              {" · Échéance : "}{f.dateEcheance ? formatDate(new Date(f.dateEcheance)) : "—"}
                            </p>
                            {derniereRelance && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                Dernière relance : {typeLabels[derniereRelance.type]?.label ?? derniereRelance.type} — {formatDate(new Date(derniereRelance.date))}
                                {derniereRelance.notes && ` · ${derniereRelance.notes}`}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">{formatEuros(resteATTC)}</p>
                            {f.montantPaye > 0 && (
                              <p className="text-xs text-slate-400">Acompte reçu : {formatEuros(f.montantPaye)}</p>
                            )}
                            <p className="text-xs text-slate-400">Total TTC : {formatEuros(f.totalTTC)}</p>
                          </div>
                        </div>

                        {/* Actions relance */}
                        <ImpayeActions
                          factureId={f.id}
                          clientEmail={f.client.email ?? ""}
                          clientTel={f.client.telephone ?? ""}
                          relances={f.relances}
                          typeLabels={Object.fromEntries(
                            Object.entries(typeLabels).map(([k, v]) => [k, v.label])
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

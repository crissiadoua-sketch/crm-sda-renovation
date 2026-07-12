export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp, Calendar, Wallet, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=dim
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lundi
  const w = new Date(d);
  w.setDate(diff);
  w.setHours(0, 0, 0, 0);
  return w;
}

function addWeeks(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n * 7);
  return r;
}

function fmtWeek(d: Date): string {
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${d.toLocaleDateString("fr-FR", opts)} → ${end.toLocaleDateString("fr-FR", opts)}`;
}

export default async function TresorerieHebdoPage() {
  const today = new Date();
  const lundi = startOfWeek(today);
  const fin31 = new Date(lundi.getTime() + 31 * 86400000);

  const [factures, facturesFournisseur, salaires] = await Promise.all([
    // Factures à encaisser dans les 31 jours (dateEcheance dans la fenêtre)
    prisma.facture.findMany({
      where: {
        dateEcheance: { gte: lundi, lte: fin31 },
        statut: { in: ["ENVOYEE", "PAYEE_PARTIELLE", "EN_RETARD"] },
      },
      select: { totalTTC: true, montantPaye: true, dateEcheance: true, numero: true, client: { select: { nom: true } } },
    }),
    // Factures fournisseurs à régler dans les 31 jours (vraies échéances)
    prisma.factureFournisseur.findMany({
      where: {
        statut: { in: ["A_PAYER", "PAYEE_PARTIELLE", "EN_RETARD"] },
        dateEcheance: { lte: fin31 },
      },
      select: { montantTTC: true, montantPaye: true, dateEcheance: true, numero: true, fournisseur: { select: { nom: true } } },
    }),
    // Bulletins de paie du mois en cours et suivant
    prisma.bulletinDePaie.findMany({
      where: {
        statut: { in: ["VALIDE", "PAYE"] },
        periode: {
          in: [
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
            `${today.getFullYear()}-${String(today.getMonth() + 2).padStart(2, "0")}`,
          ],
        },
      },
      select: { netAPayer: true, periode: true },
    }),
  ]);

  // Regrouper les salaires par mois pour les répartir sur la semaine du 25
  const salairesParMois = new Map<string, number>();
  salaires.forEach((b) => {
    salairesParMois.set(b.periode, (salairesParMois.get(b.periode) ?? 0) + b.netAPayer);
  });

  // ── SEMAINES ──────────────────────────────────────────────────────────
  type Semaine = {
    debut: Date;
    label: string;
    entrees: { libelle: string; montant: number }[];
    sorties: { libelle: string; montant: number }[];
    totalEntrees: number;
    totalSorties: number;
    solde: number;
    soldeCumul: number;
  };

  const semaines: Semaine[] = [];
  let soldeCumul = 0;

  for (let i = 0; addWeeks(lundi, i) < fin31; i++) {
    const debut = addWeeks(lundi, i);
    const finSem = addWeeks(lundi, i + 1);

    const entrees: { libelle: string; montant: number }[] = [];
    const sorties: { libelle: string; montant: number }[] = [];

    // Factures à encaisser cette semaine
    factures.forEach((f) => {
      if (!f.dateEcheance) return;
      const ech = new Date(f.dateEcheance);
      if (ech >= debut && ech < finSem) {
        entrees.push({ libelle: `Fact. ${f.numero} – ${f.client?.nom ?? ""}`, montant: f.totalTTC - f.montantPaye });
      }
    });

    // Factures fournisseurs à régler cette semaine (vraies dates d'échéance)
    facturesFournisseur.forEach((ff) => {
      if (!ff.dateEcheance) return;
      const ech = new Date(ff.dateEcheance);
      if (ech >= debut && ech < finSem) {
        sorties.push({ libelle: `Fourn. ${ff.numero} – ${ff.fournisseur?.nom ?? ""}`, montant: ff.montantTTC - ff.montantPaye });
      }
    });
    // Factures fournisseurs en retard (dateEcheance < aujourd'hui) → regroupées dans la semaine courante
    if (i === 0) {
      facturesFournisseur.forEach((ff) => {
        if (!ff.dateEcheance || new Date(ff.dateEcheance) >= debut) return;
        sorties.push({ libelle: `Retard: ${ff.numero} – ${ff.fournisseur?.nom ?? ""}`, montant: ff.montantTTC - ff.montantPaye });
      });
    }

    // Salaires : semaine contenant le 25 du mois
    const yr = debut.getFullYear();
    const mo = debut.getMonth() + 1;
    const key25 = `${yr}-${String(mo).padStart(2, "0")}`;
    const d25 = new Date(yr, mo - 1, 25);
    if (d25 >= debut && d25 < finSem) {
      const montantSalaires = salairesParMois.get(key25);
      if (montantSalaires) {
        sorties.push({ libelle: `Salaires ${key25}`, montant: montantSalaires });
      }
    }

    const totalEntrees = entrees.reduce((s, e) => s + e.montant, 0);
    const totalSorties = sorties.reduce((s, e) => s + e.montant, 0);
    const solde = totalEntrees - totalSorties;
    soldeCumul += solde;

    semaines.push({
      debut,
      label: fmtWeek(debut),
      entrees,
      sorties,
      totalEntrees,
      totalSorties,
      solde,
      soldeCumul,
    });
  }

  const totalEntrees13 = semaines.reduce((s, w) => s + w.totalEntrees, 0);
  const totalSorties13 = semaines.reduce((s, w) => s + w.totalSorties, 0);
  const semainesNegatives = semaines.filter((w) => w.soldeCumul < 0).length;
  const nbSemaines = semaines.length;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">Trésorerie 31 jours</span>
        </nav>
        <h2 className="text-xl font-bold text-brand-navy">Plan de trésorerie — 31 jours glissants</h2>
        <p className="mt-1 text-sm text-slate-500">
          Encaissements prévus · Décaissements estimés · Solde prévisionnel cumulé
        </p>
      </div>

      {semainesNegatives > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            <strong>{semainesNegatives} semaine{semainesNegatives > 1 ? "s" : ""}</strong> avec solde cumulé négatif.
            Vérifiez votre trésorerie disponible.
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-600">Encaissements prévus (31 j.)</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatEuros(totalEntrees13)}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs text-red-600">Décaissements prévus (31 j.)</p>
          <p className="text-xl font-bold text-red-700 mt-1">{formatEuros(totalSorties13)}</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm col-span-2 lg:col-span-1 ${soldeCumul >= 0 ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}`}>
          <p className={`text-xs ${soldeCumul >= 0 ? "text-brand-blue" : "text-red-600"}`}>Solde net prévisionnel</p>
          <p className={`text-xl font-bold mt-1 ${soldeCumul >= 0 ? "text-brand-navy" : "text-red-700"}`}>
            {formatEuros(totalEntrees13 - totalSorties13)}
          </p>
        </div>
      </div>

      {/* Tableau 31 jours */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-brand-navy px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Détail semaine par semaine — {nbSemaines} semaines ({31} jours)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                <th className="px-5 py-2.5 text-left">Semaine</th>
                <th className="px-4 py-2.5 text-right text-emerald-600">Encaissements</th>
                <th className="px-4 py-2.5 text-right text-red-500">Décaissements</th>
                <th className="px-4 py-2.5 text-right">Solde sem.</th>
                <th className="px-4 py-2.5 text-right font-bold">Solde cumulé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {semaines.map((sem, i) => {
                const isCurrentWeek = i === 0;
                return (
                  <tr key={i} className={`${isCurrentWeek ? "bg-brand-blue/5 font-medium" : "hover:bg-slate-50/50"}`}>
                    <td className="px-5 py-2.5">
                      <span className="text-slate-700">{sem.label}</span>
                      {isCurrentWeek && (
                        <span className="ml-2 rounded-full bg-brand-blue px-1.5 py-0.5 text-[9px] font-bold text-white">EN COURS</span>
                      )}
                      {sem.entrees.length > 0 && (
                        <div className="mt-0.5">
                          {sem.entrees.map((e, j) => (
                            <p key={j} className="text-[10px] text-emerald-600">+ {e.libelle} ({formatEuros(e.montant)})</p>
                          ))}
                        </div>
                      )}
                      {sem.sorties.length > 0 && (
                        <div className="mt-0.5">
                          {sem.sorties.map((s, j) => (
                            <p key={j} className="text-[10px] text-red-500">− {s.libelle} ({formatEuros(s.montant)})</p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">
                      {sem.totalEntrees > 0 ? formatEuros(sem.totalEntrees) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-red-600">
                      {sem.totalSorties > 0 ? formatEuros(sem.totalSorties) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium ${sem.solde >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {sem.solde !== 0 ? (sem.solde > 0 ? "+" : "") + formatEuros(sem.solde) : <span className="text-slate-300">0</span>}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold ${sem.soldeCumul >= 0 ? "text-brand-navy" : "text-red-600"}`}>
                      {formatEuros(sem.soldeCumul)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Les décaissements fournisseurs sont positionnés sur leurs dates d&apos;échéance réelles ·
        Les salaires sont positionnés au 25 du mois · Ce plan est indicatif et ne tient pas compte du solde bancaire actuel.
      </p>
      <p className="text-xs text-center text-slate-400">
        <a href="/finances/fournisseurs-echeancier" className="text-brand-blue hover:underline">
          → Saisir des factures fournisseurs avec échéances
        </a>
      </p>
    </div>
  );
}

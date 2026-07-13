export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp, AlertTriangle, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";

function startOfWeek(d: Date): Date {
  const day = d.getDay();
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

export default async function Tresorerie13SemainesPage() {
  const today = new Date();
  const lundi = startOfWeek(today);
  const fin13 = addWeeks(lundi, 13);

  const [factures, facturesFournisseur, salaires, bonsCommandeConfirmes] = await Promise.all([
    // Factures clients à encaisser dans les 13 semaines (dateEcheance dans la fenêtre)
    prisma.facture.findMany({
      where: {
        dateEcheance: { gte: lundi, lte: fin13 },
        statut: { in: ["ENVOYEE", "PAYEE_PARTIELLE", "EN_RETARD"] },
      },
      select: {
        totalTTC: true,
        montantPaye: true,
        dateEcheance: true,
        numero: true,
        client: { select: { nom: true } },
      },
    }),
    // Factures fournisseurs à régler (vraies échéances)
    prisma.factureFournisseur.findMany({
      where: {
        statut: { in: ["A_PAYER", "PAYEE_PARTIELLE", "EN_RETARD"] },
        dateEcheance: { lte: fin13 },
      },
      select: {
        montantTTC: true,
        montantPaye: true,
        dateEcheance: true,
        numero: true,
        fournisseur: { select: { nom: true } },
      },
    }),
    // Bulletins de paie du mois en cours et des 3 mois suivants
    prisma.bulletinDePaie.findMany({
      where: {
        statut: { in: ["VALIDE", "PAYE"] },
        periode: {
          in: Array.from({ length: 4 }, (_, i) => {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          }),
        },
      },
      select: { netAPayer: true, periode: true },
    }),
    // BonCommande CONFIRME sans facture fournisseur associée (coût à venir non encore facturé)
    prisma.bonCommande.findMany({
      where: {
        statut: { in: ["CONFIRME", "RECU_PARTIEL"] },
        facturesFournisseur: { none: {} },
        dateCreation: {
          // On prend les BCs créés dans les 90 derniers jours (estimés à payer dans les 13 sem.)
          gte: new Date(lundi.getTime() - 90 * 86400000),
        },
      },
      select: {
        totalTTC: true,
        totalHT: true,
        dateCreation: true,
        numero: true,
        fournisseur: { select: { nom: true } },
      },
    }),
  ]);

  // Regrouper les salaires par mois (paiement au 25 du mois)
  const salairesParMois = new Map<string, number>();
  salaires.forEach((b) => {
    salairesParMois.set(b.periode, (salairesParMois.get(b.periode) ?? 0) + b.netAPayer);
  });

  // ── 13 SEMAINES ───────────────────────────────────────────────────────────
  type Semaine = {
    debut: Date;
    label: string;
    entrees: { libelle: string; montant: number; type: "facture" | "autre" }[];
    sorties: { libelle: string; montant: number; type: "fournisseur" | "salaire" | "bc" }[];
    totalEntrees: number;
    totalSorties: number;
    solde: number;
    soldeCumul: number;
  };

  const semaines: Semaine[] = [];
  let soldeCumul = 0;

  for (let i = 0; i < 13; i++) {
    const debut = addWeeks(lundi, i);
    const finSem = addWeeks(lundi, i + 1);

    const entrees: Semaine["entrees"] = [];
    const sorties: Semaine["sorties"] = [];

    // Factures clients à encaisser cette semaine
    factures.forEach((f) => {
      if (!f.dateEcheance) return;
      const ech = new Date(f.dateEcheance);
      if (ech >= debut && ech < finSem) {
        const reste = f.totalTTC - f.montantPaye;
        if (reste > 0) {
          entrees.push({
            libelle: `Fact. ${f.numero} – ${f.client?.nom ?? ""}`,
            montant: reste,
            type: "facture",
          });
        }
      }
    });

    // Factures fournisseurs à régler cette semaine (dates d'échéance réelles)
    facturesFournisseur.forEach((ff) => {
      if (!ff.dateEcheance) return;
      const ech = new Date(ff.dateEcheance);
      if (ech >= debut && ech < finSem) {
        const reste = ff.montantTTC - ff.montantPaye;
        if (reste > 0) {
          sorties.push({
            libelle: `Fourn. ${ff.numero} – ${ff.fournisseur?.nom ?? ""}`,
            montant: reste,
            type: "fournisseur",
          });
        }
      }
    });

    // Factures fournisseurs en retard (dateEcheance < lundi) → regroupées dans la sem. courante
    if (i === 0) {
      facturesFournisseur.forEach((ff) => {
        if (!ff.dateEcheance || new Date(ff.dateEcheance) >= debut) return;
        const reste = ff.montantTTC - ff.montantPaye;
        if (reste > 0) {
          sorties.push({
            libelle: `Retard: ${ff.numero} – ${ff.fournisseur?.nom ?? ""}`,
            montant: reste,
            type: "fournisseur",
          });
        }
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
        sorties.push({ libelle: `Salaires ${key25}`, montant: montantSalaires, type: "salaire" });
      }
    }

    // BonCommande CONFIRME : positionné à dateCreation + 30 jours (paiement estimé à réception)
    bonsCommandeConfirmes.forEach((bc) => {
      const estimatedPayment = new Date(new Date(bc.dateCreation).getTime() + 30 * 86400000);
      const effectiveDate = estimatedPayment < debut && i === 0 ? debut : estimatedPayment;
      if (effectiveDate >= debut && effectiveDate < finSem) {
        const montant = bc.totalTTC > 0 ? bc.totalTTC : bc.totalHT * 1.2;
        sorties.push({
          libelle: `BC ${bc.numero} – ${bc.fournisseur?.nom ?? ""} (estimé)`,
          montant,
          type: "bc",
        });
      }
    });

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

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">Trésorerie 13 semaines</span>
        </nav>
        <h2 className="text-xl font-bold text-brand-navy">Plan de trésorerie — 13 semaines glissantes</h2>
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
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <p className="text-xs text-emerald-600 font-medium">Encaissements prévus (13 sem.)</p>
          </div>
          <p className="text-xl font-bold text-emerald-700">{formatEuros(totalEntrees13)}</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {factures.length} facture{factures.length > 1 ? "s" : ""} client à encaisser
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <p className="text-xs text-red-600 font-medium">Décaissements prévus (13 sem.)</p>
          </div>
          <p className="text-xl font-bold text-red-700">{formatEuros(totalSorties13)}</p>
          <p className="text-xs text-red-600 mt-0.5">
            {facturesFournisseur.length} fact. fourn. · {bonsCommandeConfirmes.length} BC estimés
          </p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm col-span-2 lg:col-span-1 ${soldeCumul >= 0 ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}`}>
          <p className={`text-xs font-medium mb-1 ${soldeCumul >= 0 ? "text-brand-blue" : "text-red-600"}`}>Solde net prévisionnel</p>
          <p className={`text-xl font-bold ${soldeCumul >= 0 ? "text-brand-navy" : "text-red-700"}`}>
            {formatEuros(totalEntrees13 - totalSorties13)}
          </p>
          <p className={`text-xs mt-0.5 ${soldeCumul >= 0 ? "text-slate-500" : "text-red-500"}`}>
            {soldeCumul >= 0 ? "Solde positif sur 13 sem." : "Attention : sorties > entrées"}
          </p>
        </div>
      </div>

      {/* Légende types */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-emerald-500" /> Factures clients (échéances réelles)
        </span>
        <span className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-red-500" /> Factures fournisseurs (échéances réelles)
        </span>
        <span className="flex items-center gap-1">
          <ShoppingCart className="h-3 w-3 text-orange-500" /> BonCommande CONFIRME sans facture (estimé J+30)
        </span>
      </div>

      {/* Tableau 13 semaines */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-brand-navy px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Détail semaine par semaine — 13 semaines</h3>
          <span className="text-xs text-white/60">À partir du {lundi.toLocaleDateString("fr-FR")}</span>
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
                            <p key={j} className={`text-[10px] ${s.type === "bc" ? "text-orange-500" : "text-red-500"}`}>
                              − {s.libelle} ({formatEuros(s.montant)})
                            </p>
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
                      {sem.solde !== 0
                        ? (sem.solde > 0 ? "+" : "") + formatEuros(sem.solde)
                        : <span className="text-slate-300">0</span>
                      }
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold ${sem.soldeCumul >= 0 ? "text-brand-navy" : "text-red-600"}`}>
                      {formatEuros(sem.soldeCumul)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td className="px-5 py-3 text-xs font-semibold text-slate-600">Total 13 semaines</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatEuros(totalEntrees13)}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">{formatEuros(totalSorties13)}</td>
                <td colSpan={2} className={`px-4 py-3 text-right font-bold ${soldeCumul >= 0 ? "text-brand-navy" : "text-red-700"}`}>
                  {soldeCumul >= 0 ? "+" : ""}{formatEuros(soldeCumul)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs text-slate-400 text-center">
          Factures fournisseurs positionnées sur leur date d&apos;échéance réelle ·
          Salaires positionnés au 25 du mois ·
          Bons commande CONFIRME estimés à J+30 après création (si pas encore facturés) ·
          Ce plan est indicatif et ne tient pas compte du solde bancaire actuel.
        </p>
        <p className="text-xs text-center text-slate-400">
          <Link href="/finances/tresorerie-hebdo" className="text-brand-blue hover:underline">
            → Vue 30 semaines
          </Link>
          {" · "}
          <Link href="/finances/fournisseurs-echeancier" className="text-brand-blue hover:underline">
            → Saisir des factures fournisseurs avec échéances
          </Link>
        </p>
      </div>
    </div>
  );
}

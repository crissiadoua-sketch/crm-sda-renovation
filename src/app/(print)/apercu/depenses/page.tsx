import { COMPANY } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate, formatEuros } from "@/lib/format";
import { depensesFiltrees, periodeDepenses } from "@/lib/depenses-filtre";
import { PrintToolbar } from "./print-toolbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CAT_LABELS: Record<string, string> = {
  MATERIAUX: "Matériaux & fournitures",
  MAIN_OEUVRE: "Main-d'œuvre externe",
  SOUS_TRAITANCE: "Sous-traitance",
  TRANSPORT: "Transport / carburant",
  ADMINISTRATIF: "Administratif",
  LOYER: "Loyer & charges locatives",
  ASSURANCE: "Assurances",
  AMORTISSEMENT: "Amortissements",
  INVESTISSEMENT: "Investissements",
  IMPOT_TAXE: "Impôts & taxes",
  AUTRE: "Autre / Divers",
};

export default async function ApercuDepensesPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; categorie?: string }>;
}) {
  const { mois, categorie } = await searchParams;
  const depenses = await depensesFiltrees(mois, categorie);
  const { debut, fin } = periodeDepenses(mois);
  const total = depenses.reduce((s, d) => s + d.montant, 0);
  const periodeLabel = debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <>
      <PrintToolbar label={`Dépenses — ${periodeLabel}`} />

      <div className="mx-auto my-8 w-full max-w-[297mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-8 print:py-3">
          {/* En-tête SDA */}
          <div className="flex items-start justify-between border-b-[3px] border-[#F7941E] pb-5 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain" />
                <p className="text-xs font-semibold text-[#F7941E] uppercase tracking-wide">{COMPANY.activite}</p>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5 ml-1">
                <p>{COMPANY.adresse} — {COMPANY.codePostal} {COMPANY.ville}</p>
                <p><EmailsDocument /> · {COMPANY.site}</p>
                <p>SIREN {COMPANY.siren} · TVA {COMPANY.tvaIntracommunautaire}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1E2F6E]">DÉPENSES</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide capitalize">{periodeLabel}</p>
              {categorie && (
                <p className="text-xs text-slate-500">Catégorie : {CAT_LABELS[categorie] ?? categorie}</p>
              )}
              <p className="text-xs text-slate-500">
                Du {formatDate(debut)} au {formatDate(fin)}
              </p>
            </div>
          </div>

          {/* Tableau */}
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#FFA726] text-white text-[10px]">
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Date</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Libellé</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Catégorie</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Chantier</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Fournisseur</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">Montant</th>
              </tr>
            </thead>
            <tbody>
              {depenses.map((d) => (
                <tr key={d.id} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                  <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">{formatDate(d.date)}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{d.libelle}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{CAT_LABELS[d.categorie] ?? d.categorie}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{d.chantier ? `${d.chantier.reference} — ${d.chantier.nom}` : "—"}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{d.fournisseur?.nom ?? "—"}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold">{formatEuros(d.montant)}</td>
                </tr>
              ))}
              {depenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="border border-slate-200 px-2 py-6 text-center text-slate-400">
                    Aucune dépense sur cette période.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td colSpan={5} className="border border-slate-200 px-2 py-2 text-right font-bold">Total</td>
                <td className="border border-slate-200 px-2 py-2 text-right font-bold text-[#1E2F6E]">{formatEuros(total)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="mt-6 text-[10px] text-slate-400">
            {depenses.length} dépense{depenses.length > 1 ? "s" : ""} — édité le {formatDate(new Date())}
          </p>
        </div>
      </div>
    </>
  );
}

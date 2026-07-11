import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { formatValeurLigne, type UniteAffichage } from "@/lib/metre-units";
import { PrintToolbar } from "./print-toolbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApercuMetrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: chantierId } = await params;

  const [chantier, metre] = await Promise.all([
    prisma.chantier.findUnique({ where: { id: chantierId }, select: { nom: true, reference: true } }),
    prisma.metre.findFirst({
      where: { chantierId },
      orderBy: { createdAt: "desc" },
      include: { lignes: { orderBy: { ordre: "asc" } } },
    }),
  ]);
  if (!chantier) notFound();

  const uniteAffichage = (metre?.uniteAffichage ?? "m") as UniteAffichage;
  const lignes = metre?.lignes ?? [];

  return (
    <>
      <PrintToolbar label={`Métré — ${chantier.nom}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-8 print:py-6">
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
              <p className="text-2xl font-black text-[#1E2F6E]">MÉTRÉ</p>
              <p className="text-sm font-semibold text-slate-500">{chantier.nom}</p>
              <p className="text-xs text-slate-500">{chantier.reference}</p>
            </div>
          </div>

          <p className="mb-4 text-xs text-slate-400">
            Unité d&apos;affichage : <strong className="text-slate-600">{uniteAffichage}</strong> · {lignes.length} ligne{lignes.length !== 1 ? "s" : ""}
            {metre?.fichierNom && <> · Plan : <strong className="text-slate-600">{metre.fichierNom}</strong></>}
          </p>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#FFA726] via-[#F7941E] to-[#E6471D] text-white text-[10px]">
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Désignation</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Type</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                  <td className="border border-slate-200 px-2 py-1.5">{l.designation}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{l.type}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold">
                    {formatValeurLigne(l.type, l.valeurMm, uniteAffichage)}
                  </td>
                </tr>
              ))}
              {lignes.length === 0 && (
                <tr><td colSpan={3} className="border border-slate-200 px-2 py-4 text-center text-slate-400">Aucune ligne de métré.</td></tr>
              )}
            </tbody>
          </table>

          <p className="mt-6 text-[10px] text-slate-400">Édité le {formatDate(new Date())}</p>
        </div>
      </div>
    </>
  );
}

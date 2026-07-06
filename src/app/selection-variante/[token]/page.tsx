import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { formatEuros, clientDisplayName } from "@/lib/format";
import { computeSousTotaux } from "@/lib/devis-subtotals";
import { clientSelectionneVariante } from "@/lib/actions/devis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SelectionVariantePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const chantier = await prisma.chantier.findUnique({
    where: { tokenVariantes: token },
    include: {
      client: true,
      devis: {
        where: { statut: { in: ["BROUILLON", "ENVOYE"] }, type: "INITIAL" },
        include: { lignes: { orderBy: { ordre: "asc" } } },
        orderBy: { dateCreation: "asc" },
      },
    },
  });

  if (!chantier || chantier.devis.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md text-center">
          <img src="/logo.png" alt="SDA Rénovation" className="h-12 mx-auto mb-6" />
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-700 mb-2">Lien invalide ou expiré</h1>
          <p className="text-slate-500 text-sm mb-4">Ce lien de sélection n&apos;est plus actif — soit votre choix a déjà été enregistré, soit le lien a expiré.</p>
          <p className="text-slate-500 text-sm">Contactez {COMPANY.nom} au <a href={`tel:${COMPANY.telephone}`} className="font-medium text-[#1E2F6E]">{COMPANY.telephone}</a> pour toute question.</p>
        </div>
      </div>
    );
  }

  const variantes = chantier.devis.map((v) => {
    const sousTotaux = computeSousTotaux(v.lignes, (l) =>
      l.type === "LIGNE" ? (l.totalHT ?? 0) : 0
    );
    const chapitres = v.lignes
      .filter((l, i) => l.type === "CHAPITRE" && !l.sousTotalMasque)
      .map((l, _, arr) => {
        const i = v.lignes.indexOf(l);
        return {
          designation: l.designation?.replace(/<[^>]*>/g, "").trim() ?? "",
          montant: l.sousTotalManuel ?? sousTotaux[i] ?? 0,
        };
      });
    return { ...v, chapitres };
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-5xl">
        {/* En-tête */}
        <div className="mb-8 flex items-center justify-between">
          <img src="/logo.png" alt="SDA Rénovation" className="h-10 w-auto object-contain" />
          <div className="text-right">
            <p className="text-xs text-slate-500">{COMPANY.telephone}</p>
            <p className="text-xs text-slate-500">{COMPANY.email}</p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-[#1E2F6E] mb-1">Sélection de votre devis</h1>
          <p className="text-slate-600">
            Bonjour <strong>{clientDisplayName(chantier.client)}</strong>,
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Veuillez choisir parmi les {variantes.length} variantes proposées pour votre projet{" "}
            <strong>{chantier.nom}</strong>. Cliquez sur <em>&quot;Je choisis ce devis&quot;</em> pour valider votre sélection.
          </p>
        </div>

        {/* Cartes variantes */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {variantes.map((v) => (
            <div key={v.id} className="rounded-2xl bg-white shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              {/* Titre */}
              <div className="bg-[#1E2F6E] px-5 py-4 text-white">
                <p className="font-bold text-base">{v.numero}</p>
                {v.objet && <p className="text-sm opacity-80 mt-0.5">{v.objet}</p>}
              </div>

              {/* Chapitres */}
              <div className="flex-1 px-5 py-4">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {v.chapitres.map((c) => (
                      <tr key={c.designation}>
                        <td className="py-1.5 text-slate-600 text-xs">{c.designation}</td>
                        <td className="py-1.5 text-right text-xs font-semibold text-slate-700">{formatEuros(c.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totaux */}
              <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total HT</span><span>{formatEuros(v.totalHT)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>TVA</span><span>{formatEuros(v.totalTVA)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#1E2F6E] border-t border-slate-200 pt-2 mt-1">
                  <span>TOTAL TTC</span><span>{formatEuros(v.totalTTC)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 flex flex-col gap-2">
                <a
                  href={`/apercu/devis/${v.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-slate-200 px-3 py-2 text-center text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  📄 Voir le devis complet
                </a>
                <form action={clientSelectionneVariante.bind(null, token, v.id)}>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#1E2F6E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#29ABE2] transition"
                  >
                    ✓ Je choisis ce devis
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          {COMPANY.nom} · {COMPANY.adresse} · {COMPANY.codePostal} {COMPANY.ville} · {COMPANY.telephone}
        </p>
      </div>
    </div>
  );
}

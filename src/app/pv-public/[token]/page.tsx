import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { formatDate } from "@/lib/format";
import Link from "next/link";

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(d));
}

const RESULTAT_CONFIG: Record<string, { label: string; cls: string }> = {
  ACCEPTE:          { label: "RÉCEPTION PRONONCÉE SANS RÉSERVE",   cls: "bg-green-600 text-white" },
  ACCEPTE_RESERVES: { label: "RÉCEPTION PRONONCÉE AVEC RÉSERVES",  cls: "bg-amber-500 text-white" },
  REFUSE:           { label: "RÉCEPTION REFUSÉE",                   cls: "bg-red-600 text-white"   },
};

export default async function PvPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const pvr = await prisma.pvReception.findUnique({
    where: { shareToken: token },
    include: {
      fournisseur: { select: { nom: true, adresse: true, codePostal: true, ville: true, email: true, telephone: true } },
      chantier:    { select: { nom: true, adresse: true } },
      client:      { select: { nom: true, raisonSociale: true } },
      lignes:      { orderBy: { ordre: "asc" } },
      reserves:    { orderBy: { ordre: "asc" } },
    },
  });

  if (!pvr) notFound();

  // Vérifier l'expiration du lien
  if (pvr.shareExpiry && pvr.shareExpiry < new Date()) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="rounded-2xl bg-white shadow-xl p-8 max-w-sm text-center">
          <p className="text-4xl mb-3">⏰</p>
          <h1 className="text-xl font-bold text-slate-700">Lien expiré</h1>
          <p className="text-sm text-slate-500 mt-2">
            Ce lien de partage a expiré. Contactez SDA Rénovation pour obtenir un nouveau lien.
          </p>
        </div>
      </div>
    );
  }

  const res = pvr.resultat ? RESULTAT_CONFIG[pvr.resultat] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      {/* Bannière */}
      <div className="bg-[#1E2F6E] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#29ABE2] to-[#1B3F94] flex items-center justify-center">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="text-white font-bold text-sm">SDA Rénovation — Document partagé</span>
        </div>
        <span className="text-white/60 text-xs font-mono">{pvr.numero}</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Titre */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-[#1E2F6E]">Procès-Verbal de Réception</h1>
          <p className="text-[#F7941E] font-semibold uppercase tracking-wide mt-1">{pvr.numero}</p>
          {pvr.dateReception && (
            <p className="text-slate-500 text-sm mt-1">Date de réception : {fmt(pvr.dateReception)}</p>
          )}
        </div>

        {/* Résultat */}
        {res && (
          <div className={`rounded-xl px-6 py-4 text-center font-black text-sm tracking-wider uppercase mb-6 ${res.cls}`}>
            {res.label}
          </div>
        )}

        {/* Objet */}
        {pvr.objet && (
          <div className="rounded-xl bg-[#1E2F6E]/10 border border-[#1E2F6E]/20 px-4 py-3 mb-6">
            <p className="text-xs font-bold text-[#1E2F6E] uppercase tracking-wider mb-1">Objet</p>
            <p className="font-semibold text-[#1E2F6E]">{pvr.objet}</p>
          </div>
        )}

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card title="Maître d'ouvrage">
            <p className="font-bold text-[#1E2F6E]">{COMPANY.nom}</p>
            {pvr.repMO && <p className="text-sm text-slate-600 mt-1">{pvr.repMO}</p>}
            {pvr.fonctionRepMO && <p className="text-xs text-slate-400">{pvr.fonctionRepMO}</p>}
          </Card>
          <Card title="Prestataire">
            <p className="font-bold text-[#1E2F6E]">{pvr.fournisseur?.nom ?? "—"}</p>
            {pvr.repPrestataire && <p className="text-sm text-slate-600 mt-1">{pvr.repPrestataire}</p>}
            {pvr.fonctionPrestataire && <p className="text-xs text-slate-400">{pvr.fonctionPrestataire}</p>}
          </Card>
        </div>

        {/* Tableau de vérification */}
        {pvr.lignes.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-[#1E2F6E] mb-3 text-lg">Livrables vérifiés</h2>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-[#1E2F6E] text-white text-xs">
                  <tr>
                    <th className="px-3 py-2.5 text-left">#</th>
                    <th className="px-3 py-2.5 text-left">Livrable</th>
                    <th className="px-3 py-2.5 text-center">Conformité</th>
                    <th className="px-3 py-2.5 text-left">Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pvr.lignes.map((l, i) => (
                    <tr key={l.id} className={l.conformite === "NON_CONFORME" ? "bg-red-50" : ""}>
                      <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{l.designation}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          l.conformite === "CONFORME" ? "bg-green-100 text-green-700" :
                          l.conformite === "NON_CONFORME" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {l.conformite === "CONFORME" ? "✓ Conforme" : l.conformite === "NON_CONFORME" ? "✗ Non conforme" : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs italic">{l.observations ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Réserves */}
        {pvr.reserves.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-[#1E2F6E] mb-3 text-lg">Réserves</h2>
            <div className="flex flex-col gap-3">
              {pvr.reserves.map((r, i) => (
                <div key={r.id} className={`rounded-xl border px-4 py-3 ${
                  r.statut === "LEVEE" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-1">Réserve {i + 1}</p>
                      <p className="text-sm font-medium text-slate-700">{r.description}</p>
                      {r.delaiLevee && (
                        <p className="text-xs text-slate-500 mt-1">Délai : {fmt(r.delaiLevee)}</p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      r.statut === "LEVEE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {r.statut === "LEVEE" ? "Levée ✓" : "Ouverte"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Garantie */}
        {pvr.garantieConformite && pvr.dureeGarantie && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs font-bold text-blue-700">Garantie de conformité</p>
            <p className="text-sm text-blue-600 mt-1">{pvr.dureeGarantie}</p>
          </div>
        )}

        {/* Pied */}
        <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          <p>Document partagé par {COMPANY.nom} · {COMPANY.email}</p>
          <p className="mt-1">Ce document est en lecture seule. Pour toute question, contactez directement SDA Rénovation.</p>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</p>
      {children}
    </div>
  );
}

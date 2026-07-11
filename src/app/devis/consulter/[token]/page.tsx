import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { TamponSDA } from "@/components/tampon-sda";
import ConsulterClient from "./consulter-client";

export const dynamic = "force-dynamic";

export default async function ConsulterDevisPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const devis = await prisma.devis.findUnique({
    where: { signatureToken: token },
    select: {
      id: true,
      numero: true,
      statut: true,
      objet: true,
      totalTTC: true,
      dateValidite: true,
      chantier: { select: { nom: true } },
      client: { select: { prenom: true, nom: true, raisonSociale: true } },
      signature: { select: { id: true } },
    },
  });

  if (!devis) notFound();

  const clientPrenom = devis.client?.prenom ?? null;
  const clientNom = devis.client?.raisonSociale ?? `${devis.client?.prenom ?? ""} ${devis.client?.nom ?? ""}`.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Bandeau SDA */}
      <div className="bg-[#1E2F6E] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#F7941E] to-[#E6471D] flex items-center justify-center">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">SDA Rénovation</p>
            <p className="text-white/60 text-[10px]">Consultation de devis</p>
          </div>
        </div>
        <span className="text-white/60 text-xs font-mono hidden sm:block">{devis.numero}</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        {/* Titre */}
        <div className="text-center">
          {clientNom && (
            <p className="text-slate-500 text-sm mb-1">Bonjour {clientNom},</p>
          )}
          <h1 className="text-2xl font-black text-[#1E2F6E]">Votre devis SDA Rénovation</h1>
          <p className="text-[#F7941E] font-semibold mt-1">{devis.numero}</p>
        </div>

        {/* Composant client — gère la machine d'états */}
        <ConsulterClient
          token={token}
          devisId={devis.id}
          numero={devis.numero}
          chantierNom={devis.chantier?.nom ?? null}
          objet={devis.objet}
          totalTTC={devis.totalTTC}
          dateValidite={devis.dateValidite?.toISOString().slice(0, 10) ?? null}
          clientPrenom={clientPrenom}
          dejaSigne={!!devis.signature}
          statutActuel={devis.statut}
        />

        {/* Tampon SDA */}
        <div className="flex justify-center pt-2">
          <TamponSDA />
        </div>

        {/* Pied de page */}
        <p className="text-center text-[11px] text-slate-400">
          {COMPANY.nom} · {COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville} ·{" "}
          SIRET {COMPANY.siret} · TVA {COMPANY.tvaIntracommunautaire}
        </p>
      </div>
    </div>
  );
}

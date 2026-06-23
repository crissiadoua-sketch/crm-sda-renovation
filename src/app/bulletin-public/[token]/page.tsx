import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BulletinDocument, periodLabel } from "@/components/rh/bulletin-document";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function BulletinPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const bulletin = await prisma.bulletinDePaie.findUnique({
    where: { shareToken: token },
  });

  if (!bulletin) notFound();

  if (bulletin.shareExpiry && bulletin.shareExpiry < new Date()) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="rounded-2xl bg-white shadow-xl p-8 max-w-sm text-center">
          <p className="text-4xl mb-3">⏰</p>
          <h1 className="text-xl font-bold text-slate-700">Lien expiré</h1>
          <p className="text-sm text-slate-500 mt-2">
            Ce lien de consultation a expiré. Contactez SDA Rénovation pour obtenir un nouveau lien.
          </p>
        </div>
      </div>
    );
  }

  const [salarie, parametres] = await Promise.all([
    prisma.salarie.findUnique({
      where: { id: bulletin.salarieId },
      include: { adhesionMutuelle: { include: { formuleMutuelle: true, contratMutuelle: true } } },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!salarie) notFound();

  const mutuelle = salarie.adhesionMutuelle?.actif ? salarie.adhesionMutuelle : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      {/* Bannière */}
      <div className="print:hidden bg-[#1E2F6E] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#F7941E] to-[#E6471D] flex items-center justify-center">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">SDA Rénovation</p>
            <p className="text-white/60 text-[10px]">Bulletin de paie — {periodLabel(bulletin.periode)}</p>
          </div>
        </div>
        <PrintButton />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <BulletinDocument salarie={salarie} bulletin={bulletin} parametres={parametres} mutuelle={mutuelle} />
      </div>

      <style>{`@media print { @page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </div>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BulletinDocument, periodLabel } from "@/components/rh/bulletin-document";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuBulletinPaiePage({
  params,
}: {
  params: Promise<{ salarieId: string; bulletinId: string }>;
}) {
  const { salarieId, bulletinId } = await params;

  const [salarie, bulletin, parametres] = await Promise.all([
    prisma.salarie.findUnique({
      where: { id: salarieId },
      include: { adhesionMutuelle: { include: { formuleMutuelle: true, contratMutuelle: true } } },
    }),
    prisma.bulletinDePaie.findUnique({ where: { id: bulletinId } }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!salarie || !bulletin || bulletin.salarieId !== salarieId) notFound();

  const mutuelle = salarie.adhesionMutuelle?.actif ? salarie.adhesionMutuelle : null;

  return (
    <>
      <PrintToolbar label={`Bulletin de paie — ${periodLabel(bulletin.periode)}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8">
          <BulletinDocument salarie={salarie} bulletin={bulletin} parametres={parametres} mutuelle={mutuelle} />
        </div>
      </div>

      <style>{`@media print { @page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { BulletinEditor } from "@/components/rh/bulletin-editor";
import { createBulletin } from "@/lib/actions/rh";
import { prisma } from "@/lib/prisma";
import type { TypeCcn } from "@/lib/ccn-batiment";

export default async function NouveauBulletinPage({
  params,
}: {
  params: Promise<{ salarieId: string }>;
}) {
  const { salarieId } = await params;
  const salarie = await prisma.salarie.findUnique({ where: { id: salarieId } });
  if (!salarie) notFound();

  const action = createBulletin.bind(null, salarieId, salarie.typeCcn as TypeCcn);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/rh/${salarieId}`} className="text-sm text-brand-blue hover:underline">
          ← Retour à {salarie.prenom} {salarie.nom}
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouveau bulletin de paie</h2>
        <p className="mt-1 text-sm text-slate-500">
          {salarie.prenom} {salarie.nom} · {salarie.qualification || salarie.typeCcn}
        </p>
      </div>

      <BulletinEditor salarie={salarie} action={action} />
    </div>
  );
}

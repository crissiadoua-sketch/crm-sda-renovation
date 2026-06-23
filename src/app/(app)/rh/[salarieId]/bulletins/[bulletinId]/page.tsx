import Link from "next/link";
import { notFound } from "next/navigation";
import { BulletinEditor } from "@/components/rh/bulletin-editor";
import { BulletinDocument, periodLabel } from "@/components/rh/bulletin-document";
import { EnvoiBulletinEmail } from "@/components/rh/envoi-bulletin-email";
import { updateBulletin, deleteBulletin } from "@/lib/actions/rh";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";

const bulletinStatutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  VALIDE: "blue",
  PAYE: "green",
};

const bulletinStatutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDE: "Validé",
  PAYE: "Payé",
};

export default async function BulletinDetailPage({
  params,
}: {
  params: Promise<{ salarieId: string; bulletinId: string }>;
}) {
  const { salarieId, bulletinId } = await params;

  const [salarie, bulletin, parametres] = await Promise.all([
    prisma.salarie.findUnique({
      where: { id: salarieId },
      include: {
        adhesionMutuelle: {
          include: { formuleMutuelle: true, contratMutuelle: true },
        },
      },
    }),
    prisma.bulletinDePaie.findUnique({ where: { id: bulletinId } }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!salarie || !bulletin) notFound();

  const action = updateBulletin.bind(null, salarieId, bulletinId);
  const mutuelle = salarie.adhesionMutuelle?.actif ? salarie.adhesionMutuelle : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/rh/${salarieId}`} className="text-sm text-brand-blue hover:underline">
            ← Retour à {salarie.prenom} {salarie.nom}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">
              Bulletin {periodLabel(bulletin.periode)}
            </h2>
            <Badge tone={bulletinStatutTones[bulletin.statut] ?? "gray"}>
              {bulletinStatutLabels[bulletin.statut] ?? bulletin.statut}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {salarie.prenom} {salarie.nom} · Net à payer :{" "}
            <strong className="text-brand-navy">{formatEuros(bulletin.netAPayer)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/apercu/bulletin-paie/${salarieId}/${bulletinId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🖨 Aperçu / PDF
          </a>
          <EnvoiBulletinEmail
            salarieId={salarieId}
            bulletinId={bulletinId}
            emailParDefaut={salarie.email}
          />
          <DeleteButton
            action={deleteBulletin.bind(null, salarieId, bulletinId)}
            confirmMessage={`Supprimer le bulletin ${periodLabel(bulletin.periode)} de ${salarie.prenom} ${salarie.nom} ?`}
          />
        </div>
      </div>

      {/* Document bulletin imprimable */}
      <BulletinDocument salarie={salarie} bulletin={bulletin} parametres={parametres} mutuelle={mutuelle} />

      {/* Formulaire d'édition */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Modifier le bulletin</h3>
        <BulletinEditor salarie={salarie} bulletin={bulletin} action={action} />
      </div>
    </div>
  );
}

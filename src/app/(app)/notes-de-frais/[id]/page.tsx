import Link from "next/link";
import { notFound } from "next/navigation";
import { NoteForm } from "@/components/notes-de-frais/note-form";
import { updateNote, deleteNote } from "@/lib/actions/notes-de-frais";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate, urlFichier } from "@/lib/format";

const statutTones: Record<string, BadgeTone> = {
  EN_ATTENTE: "gray",
  VALIDEE: "blue",
  REMBOURSEE: "green",
};

const statutLabels: Record<string, string> = {
  EN_ATTENTE: "En attente",
  VALIDEE: "Validée",
  REMBOURSEE: "Remboursée",
};

export default async function NoteDeFraisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [note, chantiers] = await Promise.all([
    prisma.noteDeFrais.findUnique({ where: { id }, include: { chantier: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  if (!note) notFound();

  const totalTTC = note.tva != null ? note.montant * (1 + note.tva / 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/notes-de-frais" className="text-sm text-brand-blue hover:underline">
            ← Retour aux notes de frais
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{formatDate(note.date)}</h2>
            <Badge tone={statutTones[note.statut] ?? "gray"}>
              {statutLabels[note.statut] ?? note.statut}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {note.fournisseur || "Fournisseur non précisé"}
            {note.chantier && (
              <>
                {" · "}
                <Link href={`/chantiers/${note.chantier.id}`} className="text-brand-blue hover:underline">
                  {note.chantier.reference} — {note.chantier.nom}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-navy">{formatEuros(note.montant)}</p>
            {totalTTC != null && (
              <p className="text-sm text-slate-500">{formatEuros(totalTTC)} TTC</p>
            )}
          </div>
          <DeleteButton
            action={deleteNote.bind(null, note.id)}
            confirmMessage="Supprimer cette note de frais et son justificatif ? Cette action est irréversible."
          />
        </div>
      </div>

      {note.justificatif && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Justificatif</h3>
          {note.justificatif.endsWith(".pdf") ? (
            <a
              href={urlFichier(note.justificatif)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-brand-blue hover:bg-slate-100"
            >
              📄 Ouvrir le PDF
            </a>
          ) : (
            <a href={urlFichier(note.justificatif)} target="_blank" rel="noopener noreferrer">
              <img
                src={urlFichier(note.justificatif)}
                alt="Justificatif"
                className="max-h-96 rounded-lg border border-slate-200 object-contain"
              />
            </a>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Modifier la note de frais</h3>
        <NoteForm note={note} chantiers={chantiers} action={updateNote.bind(null, note.id)} />
      </div>
    </div>
  );
}

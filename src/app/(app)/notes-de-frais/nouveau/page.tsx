import Link from "next/link";
import { NoteForm } from "@/components/notes-de-frais/note-form";
import { createNote } from "@/lib/actions/notes-de-frais";
import { prisma } from "@/lib/prisma";

export default async function NouvelleNotePage() {
  const chantiers = await prisma.chantier.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/notes-de-frais" className="text-sm text-brand-blue hover:underline">
          ← Retour aux notes de frais
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouvelle note de frais</h2>
        <p className="mt-1 text-sm text-slate-500">
          Saisissez les informations et joignez le justificatif (photo ou fichier).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <NoteForm chantiers={chantiers} action={createNote} />
      </div>
    </div>
  );
}

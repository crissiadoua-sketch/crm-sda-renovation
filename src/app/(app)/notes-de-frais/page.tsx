export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate, urlFichier } from "@/lib/format";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const categorieLabels: Record<string, string> = {
  REPAS: "🍽️ Repas",
  DEPLACEMENT: "🚗 Déplacement",
  CARBURANT: "⛽ Carburant",
  MATERIEL: "🔧 Matériel",
  HEBERGEMENT: "🏨 Hébergement",
  SOUS_TRAITANCE: "👷 Sous-traitance",
  AUTRE: "📦 Autre",
};

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

export default async function NotesDeFraisPage() {
  const notes = await prisma.noteDeFrais.findMany({
    orderBy: { date: "desc" },
    include: { chantier: true },
  });

  const total = notes.reduce((sum, n) => sum + n.montant, 0);
  const enAttente = notes.filter((n) => n.statut === "EN_ATTENTE");
  const totalEnAttente = enAttente.reduce((sum, n) => sum + n.montant, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Notes de frais</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tickets de caisse, factures fournisseurs, déplacements — avec import photo ou fichier.
          </p>
        </div>
        <LinkButton href="/notes-de-frais/nouveau">+ Nouvelle note</LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total des dépenses</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{formatEuros(total)}</p>
          <p className="mt-1 text-xs text-slate-400">{notes.length} note{notes.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">En attente de validation</p>
          <p className="mt-1 text-2xl font-bold text-brand-orange-dark">{formatEuros(totalEnAttente)}</p>
          <p className="mt-1 text-xs text-slate-400">{enAttente.length} note{enAttente.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Remboursées</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {formatEuros(notes.filter((n) => n.statut === "REMBOURSEE").reduce((s, n) => s + n.montant, 0))}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {notes.filter((n) => n.statut === "REMBOURSEE").length} note
            {notes.filter((n) => n.statut === "REMBOURSEE").length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-2xl">🧾</p>
          <p className="mt-2 font-medium text-slate-600">Aucune note de frais</p>
          <p className="mt-1 text-sm text-slate-400">
            Ajoutez vos premiers tickets de caisse ou factures.
          </p>
          <LinkButton href="/notes-de-frais/nouveau" className="mt-4">
            + Nouvelle note
          </LinkButton>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Chantier</th>
                <th className="px-4 py-3 text-right">Montant HT</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Justif.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notes.map((note) => (
                <tr key={note.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/notes-de-frais/${note.id}`} className="font-medium text-brand-blue hover:underline">
                      {formatDate(note.date)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {categorieLabels[note.categorie] ?? note.categorie}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{note.fournisseur || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {note.chantier ? (
                      <Link href={`/chantiers/${note.chantier.id}`} className="hover:underline">
                        {note.chantier.reference}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-brand-navy">
                    {formatEuros(note.montant)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statutTones[note.statut] ?? "gray"}>
                      {statutLabels[note.statut] ?? note.statut}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {note.justificatif ? (
                      <a
                        href={urlFichier(note.justificatif)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-blue hover:underline"
                      >
                        📎 Voir
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

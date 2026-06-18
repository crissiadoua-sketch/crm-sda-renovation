import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { creerProjet3D } from "@/lib/actions/projet3d";
import { Box, Plus, Calendar, Building2 } from "lucide-react";

export default async function Projets3DPage() {
  const user = await getUser();

  const [projets, chantiers] = await Promise.all([
    prisma.projet3D.findMany({
      include: { chantier: { select: { nom: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.chantier.findMany({
      where: { statut: { in: ["EN_COURS", "PROSPECT", "DEVIS_ENVOYE"] } },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Box className="h-6 w-6 text-violet-600" />
            <h2 className="text-xl font-bold text-brand-navy">Design 3D BIM</h2>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Modélisez vos espaces en 3D — structure, agencement, équipements avec données BIM
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Liste des projets */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {projets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <Box className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="font-semibold text-slate-600">Aucun projet 3D</p>
              <p className="text-sm text-slate-400 mt-1">Créez votre premier projet dans le panneau à droite</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projets.map((projet) => {
                let nbElements = 0;
                try { nbElements = JSON.parse(projet.scene).length; } catch { nbElements = 0; }

                return (
                  <Link
                    key={projet.id}
                    href={`/conception/3d/${projet.id}`}
                    className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-violet-400/60 hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Fond décoratif */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                          <Box className="h-5 w-5 text-violet-600" />
                        </div>
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                          {nbElements} élément{nbElements !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <h3 className="font-semibold text-brand-navy group-hover:text-violet-700 transition-colors">
                        {projet.titre}
                      </h3>
                      {projet.chantier && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Building2 className="h-3 w-3" />
                          {projet.chantier.nom}
                        </p>
                      )}
                      {projet.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{projet.description}</p>
                      )}
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="h-3 w-3" />
                        Modifié le {new Date(projet.updatedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulaire nouveau projet */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-fit">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-brand-navy">
            <Plus className="h-4 w-4 text-violet-600" />
            Nouveau projet 3D
          </h3>
          <form action={creerProjet3D} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Titre du projet *</label>
              <input
                name="titre"
                required
                spellCheck lang="fr"
                placeholder="ex. Appartement T3 Toulouse"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Chantier associé</label>
              <select
                name="chantierId"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
              >
                <option value="">— Aucun chantier —</option>
                {chantiers.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
              <textarea
                name="description"
                rows={2}
                spellCheck lang="fr"
                placeholder="Description du projet…"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Long. (m)</label>
                <input name="longueur" type="number" defaultValue={10} min={1} max={100} step={0.5}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Larg. (m)</label>
                <input name="largeur" type="number" defaultValue={8} min={1} max={100} step={0.5}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Haut. (m)</label>
                <input name="hauteur" type="number" defaultValue={2.7} min={1} max={10} step={0.1}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none" />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              Créer et ouvrir l'éditeur 3D →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

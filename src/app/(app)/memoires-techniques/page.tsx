import Link from "next/link";
import { BookMarked, Plus, FileText, Building2, Calendar, Euro } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { creerMemoireTechnique } from "@/lib/actions/memoire-technique";
import { formatDate } from "@/lib/format";
import {
  TYPE_LABELS,
  MODELE_LABELS,
  STATUT_LABELS,
  STATUT_COLORS,
  type TypeMemoire,
  type ModeleMemoire,
} from "@/lib/memoire-technique";

const TYPE_COLORS: Record<string, string> = {
  TYPE_1: "bg-slate-100 text-slate-700",
  TYPE_2: "bg-blue-100 text-blue-700",
  TYPE_3: "bg-violet-100 text-violet-700",
  TYPE_4: "bg-orange-100 text-orange-700",
};

const MODELE_COLORS: Record<string, string> = {
  APPEL_OFFRE: "bg-brand-navy/10 text-brand-navy",
  CLIENT_SDA:  "bg-emerald-100 text-emerald-700",
};

export default async function MemoiresTechniquesPage() {
  const [memoires, chantiers, devisListe] = await Promise.all([
    prisma.memoireTechnique.findMany({
      include: {
        chantier: { select: { nom: true } },
        devis:    { select: { numero: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.chantier.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
    prisma.devis.findMany({
      select: { id: true, numero: true, objet: true, chantierId: true },
      where: { statut: { in: ["BROUILLON", "ENVOYE", "ACCEPTE"] } },
      orderBy: { numero: "desc" },
      take: 200,
    }),
  ]);

  const stats = {
    total:     memoires.length,
    brouillon: memoires.filter((m) => m.statut === "BROUILLON").length,
    finalise:  memoires.filter((m) => m.statut === "FINALISE").length,
    envoye:    memoires.filter((m) => m.statut === "ENVOYE").length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-brand-navy" />
            <h2 className="text-xl font-bold text-brand-navy">Mémoires techniques</h2>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Documents professionnels pour appels d&apos;offres publics/privés et clients SDA
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total",      value: stats.total,     color: "border-l-slate-400" },
          { label: "Brouillon",  value: stats.brouillon, color: "border-l-amber-400" },
          { label: "Finalisés",  value: stats.finalise,  color: "border-l-blue-500" },
          { label: "Envoyés",    value: stats.envoye,    color: "border-l-emerald-500" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border-l-4 ${s.color} bg-white px-4 py-3 shadow-sm`}>
            <p className="text-2xl font-bold text-brand-navy">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Liste */}
        <div className="lg:col-span-2">
          {memoires.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <BookMarked className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="font-semibold text-slate-600">Aucun mémoire technique</p>
              <p className="text-sm text-slate-400 mt-1">Créez votre premier mémoire dans le formulaire à droite</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {memoires.map((m) => (
                <Link
                  key={m.id}
                  href={`/memoires-techniques/${m.id}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-navy/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="text-xs font-mono text-slate-400">{m.reference}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_COLORS[m.type] ?? ""}`}>
                          {TYPE_LABELS[m.type as TypeMemoire]?.split("—")[0].trim()}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MODELE_COLORS[m.modele] ?? ""}`}>
                          {m.modele === "APPEL_OFFRE" ? "AO" : "Client SDA"}
                        </span>
                      </div>

                      <h3 className="font-semibold text-brand-navy group-hover:text-brand-blue transition-colors line-clamp-1">
                        {m.titre}
                      </h3>

                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {m.chantier.nom}
                        </span>
                        {m.devis && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Devis {m.devis.numero}
                          </span>
                        )}
                        {m.maitreOuvrage && (
                          <span className="truncate max-w-[180px]">MO : {m.maitreOuvrage}</span>
                        )}
                        {m.montantEstime && (
                          <span className="flex items-center gap-0.5">
                            <Euro className="h-3 w-3" />
                            {m.montantEstime.toLocaleString("fr-FR")} HT
                          </span>
                        )}
                        {m.dateRemise && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Remise le {formatDate(m.dateRemise)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUT_COLORS[m.statut] ?? ""}`}>
                        {STATUT_LABELS[m.statut] ?? m.statut}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(m.updatedAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Formulaire nouveau mémoire */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-fit">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-brand-navy">
            <Plus className="h-4 w-4 text-brand-orange" />
            Nouveau mémoire technique
          </h3>

          <form action={creerMemoireTechnique} className="flex flex-col gap-3">
            {/* Titre */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Titre *
              </label>
              <input
                name="titre"
                required
                spellCheck
                lang="fr"
                placeholder="ex. Rénovation école primaire — Lot 2 Maçonnerie"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            {/* Chantier */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Chantier / Affaire *
              </label>
              <select
                name="chantierId"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              >
                <option value="">— Sélectionner un chantier —</option>
                {chantiers.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>

            {/* Devis (optionnel) */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Devis lié (optionnel)
              </label>
              <select
                name="devisId"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              >
                <option value="">— Aucun devis —</option>
                {devisListe.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.numero} — {d.objet || "Sans objet"}
                  </option>
                ))}
              </select>
            </div>

            {/* Type de mémoire */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Type de mémoire
              </label>
              <select
                name="type"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              >
                {(["TYPE_1", "TYPE_2", "TYPE_3", "TYPE_4"] as TypeMemoire[]).map((t) => (
                  <option key={t} value={t} selected={t === "TYPE_2"}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            {/* Modèle */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Modèle
              </label>
              <select
                name="modele"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              >
                {(["APPEL_OFFRE", "CLIENT_SDA"] as ModeleMemoire[]).map((m) => (
                  <option key={m} value={m}>{MODELE_LABELS[m]}</option>
                ))}
              </select>
            </div>

            {/* Maître d'ouvrage */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Maître d&apos;ouvrage
              </label>
              <input
                name="maitreOuvrage"
                spellCheck
                lang="fr"
                placeholder="ex. Mairie de Cugnaux"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              />
            </div>

            {/* Objet du marché */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Objet du marché
              </label>
              <input
                name="objetMarche"
                spellCheck
                lang="fr"
                placeholder="ex. Rénovation de la toiture"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              />
            </div>

            {/* Lot */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  N° lot
                </label>
                <input
                  name="lotNumero"
                  placeholder="ex. 3"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Désignation lot
                </label>
                <input
                  name="lotDesignation"
                  placeholder="ex. Gros œuvre"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                />
              </div>
            </div>

            {/* Montant estimé */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Montant estimé HT (€)
              </label>
              <input
                name="montantEstime"
                type="number"
                min={0}
                step={1000}
                placeholder="ex. 150000"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-brand-navy py-2.5 text-sm font-semibold text-white hover:bg-brand-blue transition-colors"
            >
              Créer le mémoire →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

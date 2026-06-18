import { prisma } from "@/lib/prisma";
import { TachesStatutPie, TachesServiceBar, TachesPrioritePie } from "./taches-charts";

const SERVICE_COURT: Record<string, string> = {
  SERVICE_DIRECTION: "Direction",
  SERVICE_COMMERCIAL: "Commercial",
  SERVICE_TRAVAUX: "Travaux",
  SERVICE_COMPTABILITE: "Compta",
  SERVICE_RH: "RH",
  SERVICE_ACHAT: "Achats",
  SERVICE_ADMIN: "Admin",
  TOUS: "Tous",
};

const STATUT_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_ATTENTE: "En attente",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

const PRIORITE_LABELS: Record<string, string> = {
  FAIBLE: "Faible",
  NORMALE: "Normale",
  HAUTE: "Haute",
  URGENTE: "Urgente",
};

export async function TachesStats() {
  const [parStatut, parService, parPriorite] = await Promise.all([
    prisma.tache.groupBy({ by: ["statut"], _count: { id: true } }),
    prisma.tache.groupBy({
      by: ["service", "statut"],
      _count: { id: true },
      where: { statut: { not: "ANNULEE" } },
    }),
    prisma.tache.groupBy({
      by: ["priorite"],
      _count: { id: true },
      where: { statut: { notIn: ["TERMINEE", "ANNULEE"] } },
    }),
  ]);

  // Données pour le pie statut
  const statutData = parStatut.map((s) => ({
    name: STATUT_LABELS[s.statut] ?? s.statut,
    value: s._count.id,
  }));

  // Données pour le bar par service
  const services = [...new Set(parService.map((s) => s.service ?? ""))].filter(Boolean);
  const serviceData = services.map((svc) => {
    const rows = parService.filter((r) => r.service === svc);
    return {
      service: SERVICE_COURT[svc] ?? svc,
      aFaire: rows.find((r) => r.statut === "A_FAIRE")?._count.id ?? 0,
      enCours: rows.find((r) => r.statut === "EN_COURS")?._count.id ?? 0,
      terminee: rows.find((r) => r.statut === "TERMINEE")?._count.id ?? 0,
    };
  });

  // Données pour le pie priorité
  const prioriteData = parPriorite.map((p) => ({
    name: PRIORITE_LABELS[p.priorite] ?? p.priorite,
    value: p._count.id,
  }));

  if (statutData.every((d) => d.value === 0)) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-brand-navy">Répartition par statut</h3>
        <p className="mb-4 text-xs text-slate-400">Toutes tâches confondues</p>
        <TachesStatutPie data={statutData} />
      </div>

      {serviceData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-brand-navy">Tâches par service</h3>
          <p className="mb-4 text-xs text-slate-400">En cours / À faire / Terminées</p>
          <TachesServiceBar data={serviceData} />
        </div>
      )}

      {prioriteData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-brand-navy">Répartition par priorité</h3>
          <p className="mb-4 text-xs text-slate-400">Tâches actives (hors terminées)</p>
          <TachesPrioritePie data={prioriteData} />
        </div>
      )}
    </div>
  );
}

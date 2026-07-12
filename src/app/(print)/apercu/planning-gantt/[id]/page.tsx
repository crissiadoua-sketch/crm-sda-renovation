import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  computeSchedule,
  computeCriticalPath,
  detecterAlertesSequencement,
  type TaskNode,
} from "@/lib/gantt-scheduler";
import { CORPS_ETAT_LABELS, CORPS_ETAT_ORDRE_LOGIQUE, type CorpsEtatCode } from "@/lib/corps-etat";
import { couleurParDefaut } from "@/lib/intervenant-couleur";
import { estDelaiLivraisonEleve } from "@/lib/delai-livraison";
import { PrintToolbar } from "./print-toolbar";

const STATUT_LABELS: Record<string, string> = { A_FAIRE: "À faire", EN_COURS: "En cours", TERMINEE: "Terminée" };
const STATUT_COLORS: Record<string, string> = { A_FAIRE: "#94a3b8", EN_COURS: "#29ABE2", TERMINEE: "#16a34a" };
const PRIORITE_LABELS: Record<string, string> = { FAIBLE: "Faible", NORMALE: "Normale", HAUTE: "Haute", URGENTE: "Urgente" };

type TypeRepere = "LIVRAISON" | "BON_COMMANDE" | "BON_COMMANDE_BETON" | "APPROVISIONNEMENT" | "LOCATION" | "MOUVEMENT_STOCK";
type Repere = { id: string; type: TypeRepere; label: string; date: Date; dateFin?: Date | null; delaiEleve?: boolean };

const REPERE_COLORS: Record<TypeRepere, string> = {
  LIVRAISON: "#F7941E",
  BON_COMMANDE: "#0891b2",
  BON_COMMANDE_BETON: "#64748b",
  APPROVISIONNEMENT: "#7c3aed",
  LOCATION: "#0d9488",
  MOUVEMENT_STOCK: "#16a34a",
};
const REPERE_ICONS: Record<TypeRepere, string> = {
  LIVRAISON: "🚚", BON_COMMANDE: "🛒", BON_COMMANDE_BETON: "🧱", APPROVISIONNEMENT: "📦", LOCATION: "🔧", MOUVEMENT_STOCK: "📤",
};

const TIMELINE_BUDGET = 760;

export default async function ApercuPlanningGanttPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [chantier, sousTraitants, salaries, interimaires, bonsCommande, bonsCommandeBeton, approvisionements, locations, mouvementsStock] = await Promise.all([
    prisma.chantier.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        reference: true,
        dateDebut: true,
        tachesGantt: {
          orderBy: { ordre: "asc" },
          include: { precedePar: { select: { predecesseurId: true } } },
        },
        bonsLivraison: {
          where: { dateLivraison: { not: null } },
          select: {
            id: true,
            numero: true,
            statut: true,
            dateLivraison: true,
            fournisseur: { select: { nom: true } },
          },
          orderBy: { dateLivraison: "asc" },
        },
      },
    }),
    prisma.sousTraitant.findMany({ select: { id: true, nom: true, couleur: true } }),
    prisma.salarie.findMany({ select: { id: true, nom: true, prenom: true, couleur: true } }),
    prisma.interimaire.findMany({ select: { id: true, nom: true, prenom: true, couleur: true } }),
    prisma.bonCommande.findMany({
      where: { chantierId: id },
      select: { id: true, numero: true, statut: true, dateCreation: true, fournisseur: { select: { nom: true } } },
    }),
    prisma.bonCommandeBeton.findMany({
      where: { chantierId: id },
      select: { id: true, numero: true, dateLivraison: true, createdAt: true, qteTotale: true, fournisseur: { select: { nom: true } } },
    }),
    prisma.approvisionementChantier.findMany({
      where: { chantierId: id },
      select: { id: true, numero: true, titre: true, date: true },
    }),
    prisma.fraisChantierLigne.findMany({
      where: { categorie: "LOCATION", date: { not: null }, frais: { chantierId: id } },
      select: { id: true, designation: true, fournisseur: true, date: true, dateFin: true },
    }),
    prisma.mouvementStock.findMany({
      where: { chantierId: id, type: "SORTIE" },
      select: {
        id: true,
        date: true,
        quantite: true,
        article: { select: { designation: true, unite: true, emplacement: true, delaiLivraisonJours: true } },
      },
    }),
  ]);

  if (!chantier) notFound();

  const reperes: Repere[] = [
    ...chantier.bonsLivraison.map((b) => ({
      id: `LIV-${b.id}`, type: "LIVRAISON" as const,
      label: `BL ${b.numero} — ${b.fournisseur.nom} (${b.statut})`, date: b.dateLivraison!,
    })),
    ...bonsCommande.map((b) => ({
      id: `BC-${b.id}`, type: "BON_COMMANDE" as const,
      label: `BC ${b.numero} — ${b.fournisseur.nom} (${b.statut})`, date: b.dateCreation,
    })),
    ...bonsCommandeBeton.map((b) => ({
      id: `BCB-${b.id}`, type: "BON_COMMANDE_BETON" as const,
      label: `BCB ${b.numero} — ${b.fournisseur.nom} (${b.qteTotale} m³)`, date: b.dateLivraison ?? b.createdAt,
    })),
    ...approvisionements.map((a) => ({
      id: `APP-${a.id}`, type: "APPROVISIONNEMENT" as const,
      label: `Appro ${a.numero}${a.titre ? ` — ${a.titre}` : ""}`, date: a.date,
    })),
    ...locations.map((l) => ({
      id: `LOC-${l.id}`, type: "LOCATION" as const,
      label: `${l.designation}${l.fournisseur ? ` — ${l.fournisseur}` : ""}`, date: l.date!, dateFin: l.dateFin,
    })),
    ...mouvementsStock.map((m) => ({
      id: `STK-${m.id}`, type: "MOUVEMENT_STOCK" as const,
      label: `${m.article.designation} → chantier (${m.quantite} ${m.article.unite}, depuis ${m.article.emplacement})`,
      date: m.date, delaiEleve: estDelaiLivraisonEleve(m.article.delaiLivraisonJours),
    })),
  ];

  const intervenantLabel = new Map<string, { nom: string; couleur: string }>();
  sousTraitants.forEach((s) => intervenantLabel.set(`SOUS_TRAITANT:${s.id}`, { nom: s.nom, couleur: s.couleur ?? couleurParDefaut(s.id) }));
  salaries.forEach((s) => intervenantLabel.set(`SALARIE:${s.id}`, { nom: `${s.prenom} ${s.nom}`, couleur: s.couleur ?? couleurParDefaut(s.id) }));
  interimaires.forEach((s) => intervenantLabel.set(`INTERIMAIRE:${s.id}`, { nom: `${s.prenom} ${s.nom}`, couleur: s.couleur ?? couleurParDefaut(s.id) }));

  const anchorDate = chantier.dateDebut ?? new Date();

  const taskNodes: TaskNode[] = chantier.tachesGantt.map((t) => ({
    id: t.id,
    duree: t.duree,
    dateDebut: t.dateDebut,
    predecesseurs: t.precedePar.map((p) => p.predecesseurId),
  }));

  const scheduled = taskNodes.length > 0 ? computeSchedule(taskNodes, anchorDate) : [];
  const scheduleById = new Map(scheduled.map((s) => [s.id, s]));
  const criticalIds = scheduled.length > 0 ? computeCriticalPath(scheduled) : new Set<string>();
  const alertes = scheduled.length > 0
    ? detecterAlertesSequencement(
        chantier.tachesGantt.map((t) => ({ id: t.id, corpsEtat: t.corpsEtat, predecesseurs: t.precedePar.map((p) => p.predecesseurId) })),
        scheduled,
        CORPS_ETAT_ORDRE_LOGIQUE,
      )
    : [];
  const alertesById = new Map<string, string[]>();
  for (const a of alertes) alertesById.set(a.tacheId, [...(alertesById.get(a.tacheId) ?? []), a.message]);

  const avancementMoyen = chantier.tachesGantt.length > 0
    ? Math.round(chantier.tachesGantt.reduce((sum, t) => sum + t.avancement, 0) / chantier.tachesGantt.length)
    : 0;

  const projectStart = scheduled.length > 0
    ? scheduled.reduce((min, s) => (s.dateDebut < min ? s.dateDebut : min), scheduled[0].dateDebut)
    : anchorDate;
  const projectEnd = scheduled.length > 0
    ? scheduled.reduce((max, s) => (s.dateFin > max ? s.dateFin : max), scheduled[0].dateFin)
    : anchorDate;
  const dureeProjetJours = differenceInCalendarDays(projectEnd, projectStart) + 1;

  // Échelle de la timeline : on vise une largeur imprimable fixe, quelle que soit la durée du chantier
  const repereDates = reperes.flatMap((r) => (r.dateFin ? [r.date, r.dateFin] : [r.date]));
  const allDates = [...scheduled.flatMap((s) => [s.dateDebut, s.dateFin]), ...repereDates, anchorDate];
  const rangeStart = addDays(new Date(Math.min(...allDates.map((d) => d.getTime()))), -1);
  const rangeEnd = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const totalDays = Math.max(7, differenceInCalendarDays(rangeEnd, rangeStart) + 2);
  const pixelsPerDay = Math.max(2, Math.min(26, TIMELINE_BUDGET / totalDays));
  const timelineWidth = totalDays * pixelsPerDay;
  const rowHeight = 20;
  const labelStepDays = Math.max(1, Math.ceil(34 / pixelsPerDay));

  function dateToX(date: Date) {
    return differenceInCalendarDays(date, rangeStart) * pixelsPerDay;
  }

  const dayHeaders = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));
  const taches = chantier.tachesGantt;

  function getEcartJours(t: (typeof taches)[number]): { jours: number; provisoire: boolean } | null {
    const sched = scheduleById.get(t.id);
    if (!sched) return null;
    if (t.dateFinReelle) {
      return { jours: differenceInCalendarDays(t.dateFinReelle, sched.dateFin), provisoire: false };
    }
    if (t.statut !== "TERMINEE" && new Date() > sched.dateFin) {
      return { jours: differenceInCalendarDays(new Date(), sched.dateFin), provisoire: true };
    }
    return null;
  }

  return (
    <>
      <PrintToolbar label={`Planning prévisionnel — ${chantier.nom}`} />

      <div className="mx-auto my-8 w-full max-w-[297mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-8 print:py-3">

          {/* En-tête SDA */}
          <div className="flex items-start justify-between border-b-[3px] border-[#F7941E] pb-5 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain" />
                <p className="text-xs font-semibold text-[#F7941E] uppercase tracking-wide">{COMPANY.activite}</p>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5 ml-1">
                <p>{COMPANY.adresse} — {COMPANY.codePostal} {COMPANY.ville}</p>
                <p><EmailsDocument /> · {COMPANY.site}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1E2F6E]">PLANNING PRÉVISIONNEL</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">d'exécution des travaux</p>
              <p className="mt-1 text-base font-bold text-slate-700">{chantier.nom}</p>
              <p className="text-sm text-slate-600 mt-0.5">{chantier.reference}</p>
            </div>
          </div>

          {/* Bloc indicateurs */}
          <div className="mb-5 grid grid-cols-5 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Début</p>
              <p className="text-sm font-semibold text-[#1E2F6E]">{format(projectStart, "d MMM yyyy", { locale: fr })}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Fin prévisionnelle</p>
              <p className="text-sm font-semibold text-[#1E2F6E]">{format(projectEnd, "d MMM yyyy", { locale: fr })}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Durée totale</p>
              <p className="text-sm font-semibold text-slate-700">{dureeProjetJours} j.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Tâches</p>
              <p className="text-sm font-semibold text-slate-700">{taches.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Avancement moyen</p>
              <p className="text-sm font-semibold text-slate-700">{avancementMoyen} %</p>
            </div>
          </div>

          {/* Légende */}
          <div className="mb-3 flex flex-wrap items-center gap-3 text-[9px] text-slate-500">
            <span className="flex items-center gap-1"><span className="text-red-500">⚡</span> Chemin critique</span>
            <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-[#f97316]" /> Liaison critique</span>
            <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-[#dc2626]" /> Liaison critique inter-corps de métier</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-orange-400" /> Enchaînement à vérifier (DTU)</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-1 bg-slate-400" /> Liseré = intervenant</span>
            {(Object.keys(REPERE_ICONS) as TypeRepere[]).map((t) => (
              <span key={t} className="flex items-center gap-1">{REPERE_ICONS[t]} {t === "BON_COMMANDE_BETON" ? "BC béton" : t === "MOUVEMENT_STOCK" ? "Sortie stock" : t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ")}</span>
            ))}
            <span className="flex items-center gap-1"><span className="text-red-500">⚠</span> Délai de livraison fournisseur élevé</span>
          </div>

          {taches.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Aucune tâche planifiée pour ce chantier.</p>
          ) : (
            <div className="mb-5 overflow-hidden rounded-lg border border-slate-200">
              <div className="flex" style={{ minWidth: 560 + timelineWidth }}>
                {/* Tableau */}
                <div className="shrink-0 border-r border-slate-200" style={{ width: 560 }}>
                  <div
                    className="grid items-center gap-1 border-b border-slate-200 bg-[#1E2F6E] px-2 text-[8px] font-semibold uppercase tracking-wide text-white"
                    style={{ height: rowHeight, gridTemplateColumns: "1.4fr 0.6fr 0.9fr 0.55fr 0.55fr 0.45fr 0.55fr" }}
                  >
                    <span>Tâche</span>
                    <span>Corps d'état</span>
                    <span>Intervenant</span>
                    <span>Début → Fin</span>
                    <span>Statut</span>
                    <span className="text-right">Av. %</span>
                    <span className="text-right">Écart</span>
                  </div>
                  {taches.map((t, i) => {
                    const sched = scheduleById.get(t.id);
                    const estCritique = criticalIds.has(t.id);
                    const intervenant = t.intervenantType && t.intervenantId
                      ? intervenantLabel.get(`${t.intervenantType}:${t.intervenantId}`)
                      : undefined;
                    const alerteRow = alertesById.get(t.id);
                    const ecart = getEcartJours(t);
                    return (
                      <div
                        key={t.id}
                        className={`grid items-center gap-1 border-b border-slate-100 px-2 text-[8px] ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} ${estCritique ? "border-l-2 border-l-red-500" : ""}`}
                        style={{ height: rowHeight, gridTemplateColumns: "1.4fr 0.6fr 0.9fr 0.55fr 0.55fr 0.45fr 0.55fr" }}
                      >
                        <span className="truncate font-medium text-slate-700">
                          {estCritique && <span className="text-red-500">⚡ </span>}
                          {alerteRow && <span className="text-orange-500" title={alerteRow.join(" / ")}>⚠ </span>}
                          {t.nom || "(sans nom)"}
                        </span>
                        <span className="truncate text-slate-500">{t.corpsEtat ? CORPS_ETAT_LABELS[t.corpsEtat as CorpsEtatCode] ?? t.corpsEtat : "—"}</span>
                        <span className="flex items-center gap-1 truncate text-slate-500">
                          {intervenant && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: intervenant.couleur }} />}
                          <span className="truncate">{intervenant?.nom ?? "—"}</span>
                        </span>
                        <span className="truncate text-slate-500">
                          {sched ? `${format(sched.dateDebut, "d/MM")} → ${format(sched.dateFin, "d/MM")}` : "—"}
                        </span>
                        <span className="truncate text-slate-500">{STATUT_LABELS[t.statut] ?? t.statut}</span>
                        <span className="text-right font-semibold text-slate-600">{t.avancement}%</span>
                        <span className={`text-right font-semibold ${ecart ? (ecart.jours > 0 ? "text-red-600" : "text-green-600") : "text-slate-300"}`}>
                          {ecart ? `${ecart.jours > 0 ? "+" : ""}${ecart.jours}j${ecart.provisoire ? "?" : ""}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Timeline */}
                <div className="relative" style={{ width: timelineWidth }}>
                  <div className="relative border-b border-slate-200 bg-slate-50" style={{ height: rowHeight }}>
                    {dayHeaders.map((d, i) => (
                      i % labelStepDays === 0 && (
                        <div
                          key={i}
                          className={`absolute top-0 flex h-full items-center border-l text-[7px] ${d.getDay() === 0 || d.getDay() === 6 ? "text-slate-400" : "text-slate-500"} border-slate-200`}
                          style={{ left: i * pixelsPerDay }}
                        >
                          <span className="ml-0.5">{format(d, "d/MM")}</span>
                        </div>
                      )
                    ))}
                  </div>

                  <div className="relative" style={{ height: taches.length * rowHeight }}>
                    {dayHeaders.map((d, i) => (
                      (d.getDay() === 0 || d.getDay() === 6) && (
                        <div key={i} className="absolute top-0 bottom-0 bg-slate-50" style={{ left: i * pixelsPerDay, width: pixelsPerDay }} />
                      )
                    ))}

                    <svg className="absolute inset-0" width={timelineWidth} height={taches.length * rowHeight}>
                      <defs>
                        <marker id="ag-gray" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                          <path d="M0,0 L5,2.5 L0,5 Z" fill="#94a3b8" />
                        </marker>
                        <marker id="ag-orange" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                          <path d="M0,0 L5,2.5 L0,5 Z" fill="#f97316" />
                        </marker>
                        <marker id="ag-red" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                          <path d="M0,0 L5,2.5 L0,5 Z" fill="#dc2626" />
                        </marker>
                      </defs>
                      {taches.map((t, rowIdx) =>
                        t.precedePar.map((p) => {
                          const predIdx = taches.findIndex((x) => x.id === p.predecesseurId);
                          const predTache = taches[predIdx];
                          const predSched = scheduleById.get(p.predecesseurId);
                          const rowSched = scheduleById.get(t.id);
                          if (predIdx === -1 || !predSched || !rowSched) return null;
                          const x1 = dateToX(predSched.dateFin) + pixelsPerDay;
                          const y1 = predIdx * rowHeight + rowHeight / 2;
                          const x2 = dateToX(rowSched.dateDebut);
                          const y2 = rowIdx * rowHeight + rowHeight / 2;
                          const midX = (x1 + x2) / 2;
                          const estCritique = criticalIds.has(p.predecesseurId) && criticalIds.has(t.id);
                          const changeDeCorpsEtat = !!predTache.corpsEtat && !!t.corpsEtat && predTache.corpsEtat !== t.corpsEtat;
                          const couleur = estCritique && changeDeCorpsEtat ? "#dc2626" : estCritique ? "#f97316" : "#94a3b8";
                          const marker = estCritique && changeDeCorpsEtat ? "ag-red" : estCritique ? "ag-orange" : "ag-gray";
                          return (
                            <path
                              key={`${p.predecesseurId}-${t.id}`}
                              d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                              fill="none"
                              stroke={couleur}
                              strokeWidth={estCritique ? 1.5 : 1}
                              markerEnd={`url(#${marker})`}
                            />
                          );
                        }),
                      )}
                    </svg>

                    {reperes.map((r) => {
                      const x = dateToX(r.date);
                      const couleur = REPERE_COLORS[r.type];
                      if (r.dateFin) {
                        const xFin = dateToX(r.dateFin);
                        return (
                          <div key={r.id} className="absolute z-10 h-1 rounded-full opacity-70" style={{ left: x, top: 1, width: Math.max(2, xFin - x), backgroundColor: couleur }} />
                        );
                      }
                      return (
                        <div
                          key={r.id}
                          className="absolute top-0 bottom-0 border-l border-dashed"
                          style={{ left: x, borderColor: couleur }}
                          title={r.label}
                        />
                      );
                    })}

                    {taches.map((t, idx) => {
                      const sched = scheduleById.get(t.id);
                      if (!sched) return null;
                      const x = dateToX(sched.dateDebut);
                      const width = Math.max(pixelsPerDay, differenceInCalendarDays(sched.dateFin, sched.dateDebut) * pixelsPerDay + pixelsPerDay);
                      const estCritique = criticalIds.has(t.id);
                      const intervenant = t.intervenantType && t.intervenantId
                        ? intervenantLabel.get(`${t.intervenantType}:${t.intervenantId}`)
                        : undefined;
                      return (
                        <div
                          key={t.id}
                          className="absolute"
                          style={{ left: x, top: idx * rowHeight + 3, width, height: rowHeight - 6 }}
                        >
                          <div
                            className="relative h-full w-full overflow-hidden rounded-sm border"
                            style={{
                              borderColor: estCritique ? "#dc2626" : STATUT_COLORS[t.statut],
                              backgroundColor: `${STATUT_COLORS[t.statut]}22`,
                            }}
                          >
                            {intervenant && (
                              <div className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: intervenant.couleur }} />
                            )}
                            <div className="h-full" style={{ width: `${t.avancement}%`, backgroundColor: STATUT_COLORS[t.statut] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alertes de cohérence */}
          {alertes.length > 0 && (
            <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-1">
                Points de coordination à vérifier ({alertes.length})
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {alertes.map((a, i) => {
                  const t = taches.find((x) => x.id === a.tacheId);
                  return (
                    <li key={i} className="text-[10px] text-slate-700">
                      <span className="font-medium">{t?.nom ?? a.tacheId}</span> — {a.message}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Pied de page */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-[10px] text-slate-400">{COMPANY_LEGAL}</p>
          </div>
        </div>
      </div>

      <style>{`@media print { @page { size: 297mm 210mm; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </>
  );
}

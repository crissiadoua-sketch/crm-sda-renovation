"use client";

import React, { useActionState, useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Truck, AlertTriangle, Maximize2, Minimize2, Sparkles, X, Loader2 } from "lucide-react";
import { genererPlanningIA, type TacheIA } from "@/lib/actions/gantt-ia";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  computeSchedule,
  computeCriticalPath,
  detecterAlertesSequencement,
  wouldCreateCycle,
  CycleError,
  type TaskNode,
} from "@/lib/gantt-scheduler";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS, CORPS_ETAT_ORDRE_LOGIQUE } from "@/lib/corps-etat";
import { MODELE_TACHES_PAR_CORPS_ETAT } from "@/lib/gantt-modele-taches";
import type { TachesGanttState } from "@/lib/actions/gantt";

type Statut = "A_FAIRE" | "EN_COURS" | "TERMINEE";
type Priorite = "FAIBLE" | "NORMALE" | "HAUTE" | "URGENTE";
type IntervenantType = "SOUS_TRAITANT" | "SALARIE" | "INTERIMAIRE";

type IntervenantOption = { id: string; nom: string; couleur: string };

type TaskRow = {
  key: string;
  nom: string;
  duree: string;
  dateDebut: string; // yyyy-MM-dd, ancrage si pas de prédécesseur
  avancement: number;
  statut: Statut;
  priorite: Priorite;
  corpsEtat: string; // code CORPS_ETAT_CODES ou ""
  ressource: string;
  intervenantType: IntervenantType | "";
  intervenantId: string;
  dateDebutReelle: string; // yyyy-MM-dd ou "" — saisie manuelle, sert au suivi réel vs théorique
  dateFinReelle: string;
  notes: string;
  predecesseurKeys: string[];
};

type TacheInitiale = {
  id: string;
  nom: string;
  duree: number;
  dateDebut: string;
  avancement: number;
  statut: string;
  priorite: string;
  corpsEtat: string | null;
  ressource: string | null;
  intervenantType: string | null;
  intervenantId: string | null;
  dateDebutReelle: string | null;
  dateFinReelle: string | null;
  notes: string | null;
  predecesseurIds: string[];
};

type TypeRepere = "LIVRAISON" | "BON_COMMANDE" | "BON_COMMANDE_BETON" | "APPROVISIONNEMENT" | "LOCATION" | "MOUVEMENT_STOCK";

type Repere = {
  id: string;
  type: TypeRepere;
  label: string;
  date: string; // point de départ (ou date unique)
  dateFin?: string | null; // pour LOCATION — fin de période de location (barre de durée)
  delaiEleve?: boolean; // sortie de stock dont l'article a un délai de livraison habituellement élevé
};

const REPERE_LABELS: Record<TypeRepere, string> = {
  LIVRAISON: "Livraisons (BL)",
  BON_COMMANDE: "Bons de commande",
  BON_COMMANDE_BETON: "Bons de commande béton",
  APPROVISIONNEMENT: "Approvisionnements",
  LOCATION: "Locations de matériel",
  MOUVEMENT_STOCK: "Sorties de stock vers chantier",
};

const REPERE_COLORS: Record<TypeRepere, string> = {
  LIVRAISON: "#F7941E",
  BON_COMMANDE: "#0891b2",
  BON_COMMANDE_BETON: "#64748b",
  APPROVISIONNEMENT: "#7c3aed",
  LOCATION: "#0d9488",
  MOUVEMENT_STOCK: "#16a34a",
};

const REPERE_ICONS: Record<TypeRepere, string> = {
  LIVRAISON: "🚚",
  BON_COMMANDE: "🛒",
  BON_COMMANDE_BETON: "🧱",
  APPROVISIONNEMENT: "📦",
  LOCATION: "🔧",
  MOUVEMENT_STOCK: "📤",
};

type Action = (prevState: TachesGanttState, formData: FormData) => Promise<TachesGanttState>;

const STATUT_LABELS: Record<Statut, string> = { A_FAIRE: "À faire", EN_COURS: "En cours", TERMINEE: "Terminée" };
const STATUT_COLORS: Record<Statut, string> = {
  A_FAIRE: "#94a3b8",
  EN_COURS: "#29ABE2",
  TERMINEE: "#16a34a",
};
const PRIORITE_LABELS: Record<Priorite, string> = { FAIBLE: "Faible", NORMALE: "Normale", HAUTE: "Haute", URGENTE: "Urgente" };

let keyCounter = 0;
function newKey() { keyCounter += 1; return `new-${keyCounter}`; }

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function toRow(t: TacheInitiale): TaskRow {
  return {
    key: t.id,
    nom: t.nom,
    duree: String(t.duree),
    dateDebut: t.dateDebut.slice(0, 10),
    avancement: t.avancement,
    statut: t.statut as Statut,
    priorite: t.priorite as Priorite,
    corpsEtat: t.corpsEtat ?? "",
    ressource: t.ressource ?? "",
    intervenantType: (t.intervenantType as IntervenantType) ?? "",
    intervenantId: t.intervenantId ?? "",
    dateDebutReelle: t.dateDebutReelle?.slice(0, 10) ?? "",
    dateFinReelle: t.dateFinReelle?.slice(0, 10) ?? "",
    notes: t.notes ?? "",
    predecesseurKeys: t.predecesseurIds,
  };
}

function emptyRow(): TaskRow {
  return {
    key: newKey(),
    nom: "",
    duree: "1",
    dateDebut: format(new Date(), "yyyy-MM-dd"),
    avancement: 0,
    statut: "A_FAIRE",
    priorite: "NORMALE",
    corpsEtat: "",
    ressource: "",
    intervenantType: "",
    intervenantId: "",
    dateDebutReelle: "",
    dateFinReelle: "",
    notes: "",
    predecesseurKeys: [],
  };
}

const ROW_HEIGHT = 76;
const TABLE_WIDTH = 1150;
const TABLE_GRID_COLUMNS = "1.3fr 0.5fr 1.4fr 0.5fr 0.9fr 0.8fr 1.0fr 1.0fr 0.8fr 0.5fr";

type VueGantt = "SEMAINE" | "MOIS" | "TROIS_MOIS" | "SIX_MOIS" | "NEUF_MOIS" | "DOUZE_MOIS";

const VUE_LABELS: Record<VueGantt, string> = {
  SEMAINE: "Semaine",
  MOIS: "Mois",
  TROIS_MOIS: "3 mois",
  SIX_MOIS: "6 mois",
  NEUF_MOIS: "9 mois",
  DOUZE_MOIS: "12 mois",
};

// Pixels par jour selon le niveau de zoom choisi — plus la période visée est longue, plus on compresse
// la timeline pour qu'elle reste lisible dans la largeur de l'écran.
const VUE_PIXELS_PER_DAY: Record<VueGantt, number> = {
  SEMAINE: 28,
  MOIS: 12,
  TROIS_MOIS: 6,
  SIX_MOIS: 3.5,
  NEUF_MOIS: 2.5,
  DOUZE_MOIS: 2,
};

export function GanttClient({
  chantierId,
  chantierDateDebut,
  tachesInitiales,
  reperes,
  sousTraitants,
  salaries,
  interimaires,
  action,
}: {
  chantierId: string;
  chantierDateDebut: string | null;
  tachesInitiales: TacheInitiale[];
  reperes: Repere[];
  sousTraitants: IntervenantOption[];
  salaries: IntervenantOption[];
  interimaires: IntervenantOption[];
  action: Action;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [rows, setRows] = useState<TaskRow[]>(() =>
    tachesInitiales.length > 0 ? tachesInitiales.map(toRow) : [emptyRow()],
  );
  const [notesOpen, setNotesOpen] = useState<Set<string>>(new Set());
  const [predOpenKey, setPredOpenKey] = useState<string | null>(null);
  const [vue, setVue] = useState<VueGantt>("SEMAINE");
  const [pleinEcran, setPleinEcran] = useState(false);

  // IA planning
  const [isPendingIA, startIA] = useTransition();
  const [iaModal, setIaModal] = useState<{ taches: TacheIA[]; devisInfo: string } | null>(null);
  const [iaError, setIaError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!pleinEcran) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPleinEcran(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pleinEcran]);
  const pixelsPerDay = VUE_PIXELS_PER_DAY[vue];
  const [reperesVisibles, setReperesVisibles] = useState<Set<TypeRepere>>(
    () => new Set(Object.keys(REPERE_LABELS) as TypeRepere[]),
  );
  const reperesAffiches = useMemo(() => reperes.filter((r) => reperesVisibles.has(r.type)), [reperes, reperesVisibles]);

  function toggleRepereType(type: TypeRepere) {
    setReperesVisibles((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }

  const intervenantByKey = useMemo(() => {
    const m = new Map<string, IntervenantOption>();
    sousTraitants.forEach((s) => m.set(`SOUS_TRAITANT:${s.id}`, s));
    salaries.forEach((s) => m.set(`SALARIE:${s.id}`, s));
    interimaires.forEach((s) => m.set(`INTERIMAIRE:${s.id}`, s));
    return m;
  }, [sousTraitants, salaries, interimaires]);

  function getIntervenant(row: TaskRow): IntervenantOption | undefined {
    if (!row.intervenantType || !row.intervenantId) return undefined;
    return intervenantByKey.get(`${row.intervenantType}:${row.intervenantId}`);
  }

  const anchorDate = chantierDateDebut ? parseISO(chantierDateDebut) : new Date();

  // Recalcul live à chaque rendu — pas d'état séparé, juste dérivé des lignes courantes
  const { scheduled, cycleError } = useMemo(() => {
    const nodes: TaskNode[] = rows.map((r) => ({
      id: r.key,
      duree: Math.max(1, parseInt(r.duree, 10) || 1),
      dateDebut: parseISO(r.dateDebut),
      predecesseurs: r.predecesseurKeys,
    }));
    try {
      return { scheduled: computeSchedule(nodes, anchorDate), cycleError: null as string | null };
    } catch (e) {
      if (e instanceof CycleError) {
        return { scheduled: null, cycleError: "Dépendances circulaires détectées entre les tâches." };
      }
      throw e;
    }
  }, [rows, anchorDate]);

  const scheduleByKey = useMemo(() => {
    const m = new Map<string, { dateDebut: Date; dateFin: Date }>();
    scheduled?.forEach((s) => m.set(s.id, { dateDebut: s.dateDebut, dateFin: s.dateFin }));
    return m;
  }, [scheduled]);

  // Chemin critique : tâches sans marge — tout retard sur l'une d'elles décale la fin du chantier.
  const criticalKeys = useMemo(
    () => (scheduled ? computeCriticalPath(scheduled) : new Set<string>()),
    [scheduled],
  );

  // Alertes non bloquantes : enchaînement de corps de métier qui ne respecte pas l'ordre logique
  // chantier/DTU habituel, sans dépendance déclarée entre les tâches concernées.
  const alertesByKey = useMemo(() => {
    const m = new Map<string, string[]>();
    if (!scheduled) return m;
    const tasksForAlerts = rows.map((r) => ({ id: r.key, corpsEtat: r.corpsEtat || null, predecesseurs: r.predecesseurKeys }));
    for (const alerte of detecterAlertesSequencement(tasksForAlerts, scheduled, CORPS_ETAT_ORDRE_LOGIQUE)) {
      m.set(alerte.tacheId, [...(m.get(alerte.tacheId) ?? []), alerte.message]);
    }
    return m;
  }, [rows, scheduled]);

  // Écart réel vs théorique (jours) : positif = retard, négatif = avance. Figé si dateFinReelle saisie,
  // sinon estimation provisoire pour les tâches en retard non terminées (par rapport à aujourd'hui).
  function getEcartJours(row: TaskRow): { jours: number; provisoire: boolean } | null {
    const sched = scheduleByKey.get(row.key);
    if (!sched) return null;
    if (row.dateFinReelle) {
      return { jours: differenceInCalendarDays(parseISO(row.dateFinReelle), sched.dateFin), provisoire: false };
    }
    if (row.statut !== "TERMINEE") {
      const aujourdHui = new Date();
      if (aujourdHui > sched.dateFin) {
        return { jours: differenceInCalendarDays(aujourdHui, sched.dateFin), provisoire: true };
      }
    }
    return null;
  }

  const ecartTypeGlobal = useMemo(() => {
    const ecarts = rows
      .map((r) => (r.dateFinReelle ? getEcartJours(r) : null))
      .filter((e): e is { jours: number; provisoire: boolean } => e != null)
      .map((e) => e.jours);
    if (ecarts.length === 0) return null;
    const moyenne = ecarts.reduce((s, v) => s + v, 0) / ecarts.length;
    const variance = ecarts.reduce((s, v) => s + (v - moyenne) ** 2, 0) / ecarts.length;
    return { moyenne, ecartType: Math.sqrt(variance), nbTachesTerminees: ecarts.length };
  }, [rows, scheduleByKey]);

  // Plage de dates visible : du plus tôt au plus tard parmi tâches + repères chantier, avec un peu de marge
  const { rangeStart, totalDays } = useMemo(() => {
    const dates: Date[] = [];
    scheduled?.forEach((s) => { dates.push(s.dateDebut); dates.push(s.dateFin); });
    reperes.forEach((r) => {
      dates.push(parseISO(r.date));
      if (r.dateFin) dates.push(parseISO(r.dateFin));
    });
    if (dates.length === 0) dates.push(anchorDate);
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const start = addDays(min, -2);
    const days = differenceInCalendarDays(addDays(max, 3), start);
    return { rangeStart: start, totalDays: Math.max(14, days) };
  }, [scheduled, reperes, anchorDate]);

  function dateToX(date: Date) {
    return differenceInCalendarDays(date, rangeStart) * pixelsPerDay;
  }

  function update(key: string, patch: Partial<TaskRow>) {
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() { setRows((cur) => [...cur, emptyRow()]); }

  function insererModeleType() {
    setRows((cur) => {
      const estVide = cur.length === 1 && !cur[0].nom && !cur[0].corpsEtat && cur[0].predecesseurKeys.length === 0;
      const base = estVide ? [] : cur;
      let precedente: string | null = null;
      const nouvelles: TaskRow[] = MODELE_TACHES_PAR_CORPS_ETAT.map((m) => {
        const row: TaskRow = {
          ...emptyRow(),
          nom: m.nom,
          duree: String(m.dureeJours),
          corpsEtat: m.corpsEtat,
          predecesseurKeys: precedente ? [precedente] : [],
        };
        precedente = row.key;
        return row;
      });
      return [...base, ...nouvelles];
    });
  }

  function lancerIA() {
    setIaError(null);
    setIaModal(null);
    startIA(async () => {
      const result = await genererPlanningIA(chantierId);
      if ("error" in result) {
        setIaError(result.error);
      } else {
        setIaModal(result);
      }
    });
  }

  function insererTachesIA(taches: TacheIA[]) {
    setRows((cur) => {
      const estVide = cur.length === 1 && !cur[0].nom && !cur[0].corpsEtat && cur[0].predecesseurKeys.length === 0;
      const base = estVide ? [] : cur;
      const newKeys = taches.map(() => newKey());
      const ordreToKey: Record<number, string> = {};
      taches.forEach((t, i) => { ordreToKey[t.ordre] = newKeys[i]; });
      const nouvelles: TaskRow[] = taches.map((t, i) => ({
        key: newKeys[i],
        nom: t.nom,
        duree: String(t.duree),
        dateDebut: chantierDateDebut?.slice(0, 10) ?? format(new Date(), "yyyy-MM-dd"),
        avancement: 0,
        statut: "A_FAIRE" as const,
        priorite: t.priorite,
        corpsEtat: t.corpsEtat,
        ressource: "",
        intervenantType: "" as const,
        intervenantId: "",
        dateDebutReelle: "",
        dateFinReelle: "",
        notes: t.notes ?? "",
        predecesseurKeys: t.predecesseurOrdres
          .map((ord) => ordreToKey[ord])
          .filter((k): k is string => Boolean(k)),
      }));
      return [...base, ...nouvelles];
    });
    setIaModal(null);
  }

  function removeRow(key: string) {
    setRows((cur) =>
      cur
        .filter((r) => r.key !== key)
        .map((r) => ({ ...r, predecesseurKeys: r.predecesseurKeys.filter((k) => k !== key) })),
    );
  }

  function togglePredecesseur(key: string, predKey: string) {
    setRows((cur) =>
      cur.map((r) => {
        if (r.key !== key) return r;
        const has = r.predecesseurKeys.includes(predKey);
        return {
          ...r,
          predecesseurKeys: has
            ? r.predecesseurKeys.filter((k) => k !== predKey)
            : [...r.predecesseurKeys, predKey],
        };
      }),
    );
  }

  function toggleNotes(key: string) {
    setNotesOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // ── Drag (déplacer = changer dateDebut) et resize (changer durée) ──────────
  function startDrag(rowKey: string, mode: "move" | "resize") {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const row = rows.find((r) => r.key === rowKey);
      if (!row) return;
      const startX = e.clientX;
      const startDateDebut = parseISO(row.dateDebut);
      const startDuree = Math.max(1, parseInt(row.duree, 10) || 1);

      function onMove(ev: PointerEvent) {
        const deltaDays = Math.round((ev.clientX - startX) / pixelsPerDay);
        if (mode === "move") {
          update(rowKey, { dateDebut: format(addDays(startDateDebut, deltaDays), "yyyy-MM-dd") });
        } else {
          update(rowKey, { duree: String(Math.max(1, startDuree + deltaDays)) });
        }
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  const payload = JSON.stringify(
    rows.map((r) => ({
      clientId: r.key,
      nom: r.nom,
      duree: Math.max(1, parseInt(r.duree, 10) || 1),
      dateDebut: r.dateDebut,
      avancement: r.avancement,
      statut: r.statut,
      priorite: r.priorite,
      corpsEtat: r.corpsEtat || null,
      ressource: r.ressource || null,
      intervenantType: r.intervenantType || null,
      intervenantId: r.intervenantId || null,
      dateDebutReelle: r.dateDebutReelle || null,
      dateFinReelle: r.dateFinReelle || null,
      notes: r.notes || null,
      predecesseurClientIds: r.predecesseurKeys,
    })),
  );

  const timelineWidth = totalDays * pixelsPerDay;
  const dayHeaders = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));
  // Un jour par étiquette dès qu'il y a la place pour un nombre à 2 chiffres (vue Semaine/Mois) —
  // ne regrouper plusieurs jours sous une seule étiquette que sur les vues très dézoomées, pour ne
  // pas donner l'impression que des jours « disparaissent » du planning.
  const labelStepDays = pixelsPerDay >= 16 ? 1 : Math.max(1, Math.ceil(32 / pixelsPerDay));

  return (
    <form
      action={formAction}
      className={
        pleinEcran
          ? "fixed inset-0 z-50 flex flex-col gap-4 overflow-auto bg-white p-4 sm:p-6"
          : "flex flex-col gap-4"
      }
    >
      <input type="hidden" name="taches" value={payload} />

      {(cycleError || state?.error) && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {cycleError ?? state?.error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Vue :</span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(Object.keys(VUE_LABELS) as VueGantt[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVue(v)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                vue === v ? "bg-brand-navy text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {VUE_LABELS[v]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPleinEcran((v) => !v)}
          title={pleinEcran ? "Quitter le plein écran (Échap)" : "Afficher en plein écran"}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {pleinEcran ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {pleinEcran ? "Quitter le plein écran" : "Plein écran"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><Truck className="h-3.5 w-3.5" /> Repères :</span>
        {(Object.keys(REPERE_LABELS) as TypeRepere[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggleRepereType(t)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              reperesVisibles.has(t) ? "border-transparent text-white" : "border-slate-200 bg-white text-slate-400"
            }`}
            style={reperesVisibles.has(t) ? { backgroundColor: REPERE_COLORS[t] } : undefined}
          >
            {REPERE_ICONS[t]} {REPERE_LABELS[t]}
          </button>
        ))}
      </div>

      {ecartTypeGlobal && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          <span className="font-semibold text-brand-navy">Suivi réel vs théorique ({ecartTypeGlobal.nbTachesTerminees} tâche(s) clôturée(s))</span>
          <span>Écart moyen : <strong className={ecartTypeGlobal.moyenne > 0 ? "text-red-600" : "text-green-600"}>{ecartTypeGlobal.moyenne > 0 ? "+" : ""}{ecartTypeGlobal.moyenne.toFixed(1)} j.</strong></span>
          <span>Écart type : <strong>{ecartTypeGlobal.ecartType.toFixed(1)} j.</strong></span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="text-red-500">⚡</span> Tâche / liaison sur le chemin critique</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-[#f97316]" /> Liaison critique</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-[#dc2626]" /> Liaison critique entre corps de métier différents</span>
        <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-brand-orange-dark" /> Enchaînement à vérifier (logique chantier / DTU)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-1.5 rounded-sm bg-slate-400" /> Liseré = intervenant (sous-traitant / équipe / intérimaire)</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex" style={{ minWidth: TABLE_WIDTH + timelineWidth }}>
          {/* Colonne tableau */}
          <div className="shrink-0 border-r border-slate-200" style={{ width: TABLE_WIDTH }}>
            <div
              className="grid items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
              style={{ height: ROW_HEIGHT, gridTemplateColumns: TABLE_GRID_COLUMNS }}
            >
              <span>Nom</span>
              <span>Durée</span>
              <span>Début / Fin réelle</span>
              <span>Av. %</span>
              <span>Statut</span>
              <span>Priorité</span>
              <span>Corps de métier</span>
              <span>Intervenant</span>
              <span>Ressource / Prédécesseurs</span>
              <span></span>
            </div>
            {rows.map((row) => {
              const sched = scheduleByKey.get(row.key);
              const estCritique = criticalKeys.has(row.key);
              const alertes = alertesByKey.get(row.key);
              return (
                <div
                  key={row.key}
                  className={`border-b border-slate-50 ${estCritique ? "border-l-4 border-l-red-500" : ""}`}
                >
                  <div
                    className="grid items-center gap-2 px-3"
                    style={{ height: ROW_HEIGHT, gridTemplateColumns: TABLE_GRID_COLUMNS }}
                  >
                    <textarea
                      ref={autoGrow}
                      value={row.nom}
                      onChange={(e) => update(row.key, { nom: e.target.value })}
                      onInput={(e) => autoGrow(e.currentTarget)}
                      placeholder="Nom de la tâche"
                      rows={1}
                      className="w-full resize-none overflow-y-auto rounded-md border border-slate-200 px-2 py-1 text-sm"
                      style={{ maxHeight: ROW_HEIGHT - 12 }}
                    />
                    <input
                      type="number" min={1}
                      value={row.duree}
                      onChange={(e) => update(row.key, { duree: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                    />
                    <div className="flex flex-col gap-0.5">
                      <input
                        type="date"
                        value={row.dateDebut}
                        onChange={(e) => update(row.key, { dateDebut: e.target.value })}
                        title={
                          row.predecesseurKeys.length > 0
                            ? "Début planifié (repoussé par les prédécesseurs si nécessaire)"
                            : sched
                              ? `Début planifié — fin théorique : ${format(sched.dateFin, "d/MM/yy", { locale: fr })}`
                              : "Début planifié"
                        }
                        className="w-full rounded-md border border-slate-200 px-1 py-0.5 text-xs"
                      />
                      <input
                        type="date"
                        value={row.dateDebutReelle}
                        onChange={(e) => update(row.key, { dateDebutReelle: e.target.value })}
                        title="Début réel"
                        className="w-full rounded-md border border-green-200 bg-green-50/40 px-1 py-0.5 text-xs"
                      />
                      <input
                        type="date"
                        value={row.dateFinReelle}
                        onChange={(e) => update(row.key, { dateFinReelle: e.target.value })}
                        title="Fin réelle"
                        className="w-full rounded-md border border-green-200 bg-green-50/40 px-1 py-0.5 text-xs"
                      />
                    </div>
                    <input
                      type="number" min={0} max={100}
                      value={row.avancement}
                      onChange={(e) => update(row.key, { avancement: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                    />
                    <select
                      value={row.statut}
                      onChange={(e) => update(row.key, { statut: e.target.value as Statut })}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                    >
                      {Object.entries(STATUT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <select
                      value={row.priorite}
                      onChange={(e) => update(row.key, { priorite: e.target.value as Priorite })}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                    >
                      {Object.entries(PRIORITE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <select
                      value={row.corpsEtat}
                      onChange={(e) => update(row.key, { corpsEtat: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="">— Corps de métier —</option>
                      {CORPS_ETAT_CODES.map((c) => (
                        <option key={c} value={c}>{c} — {CORPS_ETAT_LABELS[c]}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full border border-slate-200"
                        style={{ backgroundColor: getIntervenant(row)?.couleur ?? "transparent" }}
                      />
                      <select
                        value={row.intervenantType && row.intervenantId ? `${row.intervenantType}:${row.intervenantId}` : ""}
                        onChange={(e) => {
                          const [type, id] = e.target.value ? e.target.value.split(":") : ["", ""];
                          update(row.key, { intervenantType: type as IntervenantType | "", intervenantId: id });
                        }}
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="">— Aucun —</option>
                        {sousTraitants.length > 0 && (
                          <optgroup label="Sous-traitants">
                            {sousTraitants.map((s) => (
                              <option key={s.id} value={`SOUS_TRAITANT:${s.id}`}>{s.nom}</option>
                            ))}
                          </optgroup>
                        )}
                        {salaries.length > 0 && (
                          <optgroup label="Équipe interne">
                            {salaries.map((s) => (
                              <option key={s.id} value={`SALARIE:${s.id}`}>{s.nom}</option>
                            ))}
                          </optgroup>
                        )}
                        {interimaires.length > 0 && (
                          <optgroup label="Intérimaires">
                            {interimaires.map((s) => (
                              <option key={s.id} value={`INTERIMAIRE:${s.id}`}>{s.nom}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <textarea
                        ref={autoGrow}
                        value={row.ressource}
                        onChange={(e) => update(row.key, { ressource: e.target.value })}
                        onInput={(e) => autoGrow(e.currentTarget)}
                        placeholder="Équipe / sous-traitant…"
                        rows={1}
                        className="w-full resize-none overflow-y-auto rounded-md border border-slate-200 px-2 py-1 text-xs"
                        style={{ maxHeight: ROW_HEIGHT - 12 }}
                      />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setPredOpenKey((cur) => (cur === row.key ? null : row.key))}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200"
                        >
                          🔗 {row.predecesseurKeys.length > 0
                            ? `${row.predecesseurKeys.length} préd.`
                            : "Prédécesseurs"}
                        </button>
                        {predOpenKey === row.key && (
                          <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Dépend de…</span>
                              <button type="button" onClick={() => setPredOpenKey(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {rows.filter((r) => r.key !== row.key).map((other) => {
                                const checked = row.predecesseurKeys.includes(other.key);
                                const invalid = !checked && wouldCreateCycle(
                                  rows.map((r) => ({ id: r.key, duree: 1, dateDebut: new Date(), predecesseurs: r.predecesseurKeys })),
                                  { predecesseurId: other.key, successeurId: row.key },
                                );
                                return (
                                  <button
                                    key={other.key}
                                    type="button"
                                    disabled={invalid}
                                    title={invalid ? "Créerait une dépendance circulaire" : `Dépend de "${other.nom || "(sans nom)"}"`}
                                    onClick={() => togglePredecesseur(row.key, other.key)}
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                                      checked
                                        ? "bg-brand-navy text-white"
                                        : invalid
                                          ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    }`}
                                  >
                                    {other.nom || "(sans nom)"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      {estCritique && (
                        <span title="Tâche critique : tout retard décale la fin du chantier." className="text-red-500">
                          ⚡
                        </span>
                      )}
                      {alertes && alertes.length > 0 && (
                        <span title={alertes.join("\n")} className="text-brand-orange-dark">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleNotes(row.key)}
                        title={(() => {
                          const ecart = getEcartJours(row);
                          return ecart && ecart.jours > 0 ? `Notes / suivi réel — retard de ${ecart.jours} j.` : "Notes / suivi réel";
                        })()}
                        className={`rounded p-1 hover:bg-slate-100 ${(() => {
                          const ecart = getEcartJours(row);
                          return ecart && ecart.jours > 0 ? "text-red-500" : "text-slate-400";
                        })()}`}
                      >
                        📝
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="rounded p-1 text-brand-orange-dark hover:bg-brand-orange/10"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {notesOpen.has(row.key) && (
                    <div className="border-t border-dashed border-slate-100 bg-slate-50/60 px-3 py-2">
                      <textarea
                        value={row.notes}
                        onChange={(e) => update(row.key, { notes: e.target.value })}
                        placeholder="Notes sur cette tâche…"
                        rows={2}
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                      />
                      {sched && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          Planifié : {format(sched.dateDebut, "d MMM yyyy", { locale: fr })} → {format(sched.dateFin, "d MMM yyyy", { locale: fr })}
                        </p>
                      )}
                      {(() => {
                        const ecart = getEcartJours(row);
                        if (!ecart) return null;
                        const pourcentage = Math.round((ecart.jours / Math.max(1, parseInt(row.duree, 10) || 1)) * 100);
                        return (
                          <p className={`mt-1.5 text-[10px] font-semibold ${ecart.jours > 0 ? "text-red-600" : ecart.jours < 0 ? "text-green-600" : "text-slate-400"}`}>
                            {ecart.jours > 0 ? `Retard de ${ecart.jours} j. (${pourcentage}%)` : ecart.jours < 0 ? `Avance de ${Math.abs(ecart.jours)} j.` : "Dans les temps"}
                            {ecart.provisoire ? " — estimation provisoire (tâche non terminée)" : ""}
                          </p>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="relative" style={{ width: timelineWidth }}>
            {/* En-tête jours */}
            <div className="relative border-b border-slate-100 bg-slate-50" style={{ height: ROW_HEIGHT }}>
              {dayHeaders.map((d, i) => (
                i % labelStepDays === 0 && (
                  <div
                    key={i}
                    className={`absolute top-0 flex h-full flex-col items-center justify-center border-r text-[10px] ${
                      d.getDay() === 0 || d.getDay() === 6 ? "bg-slate-100 text-slate-400 border-slate-200" : "text-slate-500 border-slate-100"
                    }`}
                    style={{ left: i * pixelsPerDay, width: labelStepDays * pixelsPerDay }}
                  >
                    {pixelsPerDay >= 18 && <span>{format(d, "EEEEE", { locale: fr })}</span>}
                    <span className="font-semibold">{pixelsPerDay >= 12 ? format(d, "d/MM") : format(d, "d MMM", { locale: fr })}</span>
                  </div>
                )
              ))}
            </div>

            {/* Lignes de fond + barres */}
            <div className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
              {/* week-end shading */}
              {pixelsPerDay >= 8 && dayHeaders.map((d, i) => (
                (d.getDay() === 0 || d.getDay() === 6) && (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 bg-slate-50"
                    style={{ left: i * pixelsPerDay, width: pixelsPerDay }}
                  />
                )
              ))}

              {/* Flèches de dépendance */}
              <svg className="absolute inset-0 pointer-events-none" width={timelineWidth} height={rows.length * ROW_HEIGHT}>
                <defs>
                  <marker id="arrowhead-gray" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                  </marker>
                  <marker id="arrowhead-orange" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#f97316" />
                  </marker>
                  <marker id="arrowhead-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
                  </marker>
                </defs>
                {rows.map((row, rowIdx) =>
                  row.predecesseurKeys.map((predKey) => {
                    const predIdx = rows.findIndex((r) => r.key === predKey);
                    const predRow = rows[predIdx];
                    const predSched = scheduleByKey.get(predKey);
                    const rowSched = scheduleByKey.get(row.key);
                    if (predIdx === -1 || !predSched || !rowSched) return null;
                    const x1 = dateToX(predSched.dateFin) + pixelsPerDay;
                    const y1 = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const x2 = dateToX(rowSched.dateDebut);
                    const y2 = rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const midX = (x1 + x2) / 2;

                    const estCritique = criticalKeys.has(predKey) && criticalKeys.has(row.key);
                    const changeDeCorpsEtat = !!predRow.corpsEtat && !!row.corpsEtat && predRow.corpsEtat !== row.corpsEtat;
                    const couleur = estCritique && changeDeCorpsEtat ? "#dc2626" : estCritique ? "#f97316" : "#94a3b8";
                    const marker = estCritique && changeDeCorpsEtat ? "arrowhead-red" : estCritique ? "arrowhead-orange" : "arrowhead-gray";
                    const titre = estCritique && changeDeCorpsEtat
                      ? `Chemin critique — coordination ${predRow.corpsEtat} → ${row.corpsEtat}`
                      : estCritique
                        ? "Chemin critique"
                        : undefined;

                    return (
                      <path
                        key={`${predKey}-${row.key}`}
                        d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                        fill="none"
                        stroke={couleur}
                        strokeWidth={estCritique ? 2.5 : 1.5}
                        markerEnd={`url(#${marker})`}
                      >
                        {titre && <title>{titre}</title>}
                      </path>
                    );
                  }),
                )}
              </svg>

              {/* Repères chantier : livraisons, commandes, béton, approvisionnement, location, sorties de stock */}
              {reperesAffiches.map((r) => {
                const x = dateToX(parseISO(r.date));
                const couleur = REPERE_COLORS[r.type];
                const titre = `${REPERE_LABELS[r.type]} — ${r.label}${r.delaiEleve ? " ⚠ délai de livraison habituellement élevé" : ""}`;
                if (r.dateFin) {
                  const xFin = dateToX(parseISO(r.dateFin));
                  return (
                    <div key={r.id} className="absolute z-10" style={{ left: x, top: 1, width: Math.max(2, xFin - x), height: 5 }} title={titre}>
                      <div className="h-1.5 rounded-full opacity-70" style={{ backgroundColor: couleur }} />
                      <div className="absolute top-0 left-0 h-2.5 w-0.5" style={{ backgroundColor: couleur }} />
                      <div className="absolute top-0 right-0 h-2.5 w-0.5" style={{ backgroundColor: couleur }} />
                    </div>
                  );
                }
                return (
                  <div
                    key={r.id}
                    className="absolute top-0 bottom-0 z-10 border-l-2 border-dashed"
                    style={{ left: x, borderColor: couleur }}
                    title={titre}
                  >
                    <span
                      className={`-translate-x-1/2 rounded-full bg-white text-[10px] leading-none ${r.delaiEleve ? "ring-1 ring-red-500" : ""}`}
                    >
                      {REPERE_ICONS[r.type]}
                    </span>
                  </div>
                );
              })}

              {/* Barres de tâches */}
              {rows.map((row, idx) => {
                const sched = scheduleByKey.get(row.key);
                if (!sched) return null;
                const x = dateToX(sched.dateDebut);
                const width = Math.max(pixelsPerDay, differenceInCalendarDays(sched.dateFin, sched.dateDebut) * pixelsPerDay + pixelsPerDay);
                const isRoot = row.predecesseurKeys.length === 0;
                const estCritique = criticalKeys.has(row.key);
                const intervenant = getIntervenant(row);
                return (
                  <div
                    key={row.key}
                    className="absolute flex items-center"
                    style={{ left: x, top: idx * ROW_HEIGHT + 6, width, height: ROW_HEIGHT - 12 }}
                  >
                    <div
                      onPointerDown={isRoot ? startDrag(row.key, "move") : undefined}
                      title={`${row.nom || "(sans nom)"} — ${format(sched.dateDebut, "d MMM", { locale: fr })} → ${format(sched.dateFin, "d MMM", { locale: fr })}${estCritique ? " — chemin critique" : ""}${intervenant ? ` — ${intervenant.nom}` : ""}`}
                      className={`relative h-full w-full overflow-hidden rounded-md border-2 ${isRoot ? "cursor-grab" : "cursor-default"}`}
                      style={{
                        borderColor: estCritique ? "#dc2626" : STATUT_COLORS[row.statut],
                        backgroundColor: `${STATUT_COLORS[row.statut]}22`,
                      }}
                    >
                      {intervenant && (
                        <div
                          className="absolute inset-y-0 left-0 w-1.5"
                          style={{ backgroundColor: intervenant.couleur }}
                        />
                      )}
                      <div
                        className="h-full"
                        style={{ width: `${row.avancement}%`, backgroundColor: STATUT_COLORS[row.statut] }}
                      />
                      <span className="absolute inset-0 flex items-center truncate px-2 text-[11px] font-medium text-slate-700">
                        {row.nom || "(sans nom)"}
                      </span>
                      <div
                        onPointerDown={startDrag(row.key, "resize")}
                        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter une tâche
          </button>
          <button
            type="button"
            onClick={() => {
              if (rows.some((r) => r.nom || r.corpsEtat) && !window.confirm("Ajouter les 17 tâches du modèle type SDA (une par corps de métier) à la suite du planning actuel ?")) return;
              insererModeleType();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-blue/10"
          >
            <Plus className="h-3.5 w-3.5" /> Modèle type SDA (corps de métier)
          </button>
          <button
            type="button"
            onClick={lancerIA}
            disabled={isPendingIA}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#F7941E]/40 bg-gradient-to-r from-[#FFF3E0] to-[#FFF8F0] px-3 py-1.5 text-xs font-semibold text-[#E6471D] hover:from-[#FFE0B2] hover:to-[#FFF3E0] disabled:opacity-60"
          >
            {isPendingIA
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyse en cours…</>
              : <><Sparkles className="h-3.5 w-3.5" /> Générer avec l&apos;IA</>
            }
          </button>
          {iaError && (
            <p className="text-xs text-red-600 max-w-xs">{iaError}</p>
          )}
        </div>
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer le planning</SubmitButton>
      </div>

      {/* Modal prévisualisation planning IA */}
      {iaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#FFA726] to-[#F7941E] px-5 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-white" />
                <div>
                  <p className="font-bold text-white text-sm">Planning généré par l&apos;IA</p>
                  <p className="text-white/80 text-xs">{iaModal.devisInfo}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIaModal(null)} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Liste des tâches */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-3 text-xs text-slate-500">
                {iaModal.taches.length} tâche{iaModal.taches.length > 1 ? "s" : ""} générée{iaModal.taches.length > 1 ? "s" : ""} — vérifiez avant d&apos;appliquer. Vous pourrez les modifier après.
              </p>
              <div className="flex flex-col gap-1.5">
                {iaModal.taches.map((t) => (
                  <div key={t.ordre} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#F7941E]/15 text-[10px] font-bold text-[#E6471D]">
                      {t.ordre}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.nom}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {t.corpsEtat && (
                          <span className="rounded bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue uppercase">
                            {t.corpsEtat}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">{t.duree} jour{t.duree > 1 ? "s" : ""}</span>
                        {t.predecesseurOrdres.length > 0 && (
                          <span className="text-[11px] text-slate-400">↳ dépend de : {t.predecesseurOrdres.join(", ")}</span>
                        )}
                        {t.priorite !== "NORMALE" && (
                          <span className={`text-[10px] font-semibold ${t.priorite === "HAUTE" ? "text-orange-600" : t.priorite === "URGENTE" ? "text-red-600" : "text-slate-400"}`}>
                            {t.priorite}
                          </span>
                        )}
                      </div>
                      {t.notes && <p className="mt-0.5 text-[11px] text-slate-400 italic">{t.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setIaModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={lancerIA}
                  disabled={isPendingIA}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Regénérer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (rows.some((r) => r.nom || r.corpsEtat) && !window.confirm("Remplacer / compléter le planning actuel avec les tâches générées par l'IA ?")) return;
                    insererTachesIA(iaModal.taches);
                  }}
                  className="rounded-lg bg-gradient-to-r from-[#F7941E] to-[#E6471D] px-5 py-2 text-sm font-bold text-white shadow hover:opacity-90"
                >
                  <Sparkles className="inline h-4 w-4 mr-1.5" />
                  Appliquer au planning
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

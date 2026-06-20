"use client";

import React, { useActionState, useMemo, useState } from "react";
import { Plus, Trash2, Truck, AlertTriangle } from "lucide-react";
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
  notes: string | null;
  predecesseurIds: string[];
};

type Livraison = {
  id: string;
  numero: string;
  statut: string;
  dateLivraison: string;
  fournisseur: string;
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
    notes: "",
    predecesseurKeys: [],
  };
}

const PIXELS_PER_DAY = 28;
const ROW_HEIGHT = 44;
const TABLE_WIDTH = 1010;
const TABLE_GRID_COLUMNS = "1.5fr 0.6fr 0.5fr 0.9fr 0.8fr 1.1fr 1.1fr 1.3fr 0.5fr";

export function GanttClient({
  chantierId,
  chantierDateDebut,
  tachesInitiales,
  livraisons,
  sousTraitants,
  salaries,
  interimaires,
  action,
}: {
  chantierId: string;
  chantierDateDebut: string | null;
  tachesInitiales: TacheInitiale[];
  livraisons: Livraison[];
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

  // Plage de dates visible : du plus tôt au plus tard parmi tâches + livraisons, avec un peu de marge
  const { rangeStart, totalDays } = useMemo(() => {
    const dates: Date[] = [];
    scheduled?.forEach((s) => { dates.push(s.dateDebut); dates.push(s.dateFin); });
    livraisons.forEach((l) => dates.push(parseISO(l.dateLivraison)));
    if (dates.length === 0) dates.push(anchorDate);
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const start = addDays(min, -2);
    const days = differenceInCalendarDays(addDays(max, 3), start);
    return { rangeStart: start, totalDays: Math.max(14, days) };
  }, [scheduled, livraisons, anchorDate]);

  function dateToX(date: Date) {
    return differenceInCalendarDays(date, rangeStart) * PIXELS_PER_DAY;
  }

  function update(key: string, patch: Partial<TaskRow>) {
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() { setRows((cur) => [...cur, emptyRow()]); }

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
        const deltaDays = Math.round((ev.clientX - startX) / PIXELS_PER_DAY);
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
      notes: r.notes || null,
      predecesseurClientIds: r.predecesseurKeys,
    })),
  );

  const timelineWidth = totalDays * PIXELS_PER_DAY;
  const dayHeaders = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="taches" value={payload} />

      {(cycleError || state?.error) && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {cycleError ?? state?.error}
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
                        title="Notes"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100"
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
                          {format(sched.dateDebut, "d MMM yyyy", { locale: fr })} → {format(sched.dateFin, "d MMM yyyy", { locale: fr })}
                        </p>
                      )}
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
                <div
                  key={i}
                  className={`absolute top-0 flex h-full flex-col items-center justify-center border-r text-[10px] ${
                    d.getDay() === 0 || d.getDay() === 6 ? "bg-slate-100 text-slate-400 border-slate-200" : "text-slate-500 border-slate-100"
                  }`}
                  style={{ left: i * PIXELS_PER_DAY, width: PIXELS_PER_DAY }}
                >
                  <span>{format(d, "EEEEE", { locale: fr })}</span>
                  <span className="font-semibold">{format(d, "d/MM")}</span>
                </div>
              ))}
            </div>

            {/* Lignes de fond + barres */}
            <div className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
              {/* week-end shading */}
              {dayHeaders.map((d, i) => (
                (d.getDay() === 0 || d.getDay() === 6) && (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 bg-slate-50"
                    style={{ left: i * PIXELS_PER_DAY, width: PIXELS_PER_DAY }}
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
                    const x1 = dateToX(predSched.dateFin) + PIXELS_PER_DAY;
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

              {/* Marqueurs livraisons */}
              {livraisons.map((l) => {
                const x = dateToX(parseISO(l.dateLivraison));
                return (
                  <div
                    key={l.id}
                    className="absolute top-0 bottom-0 z-10 border-l-2 border-dashed border-brand-orange"
                    style={{ left: x }}
                    title={`Livraison ${l.numero} — ${l.fournisseur} (${l.statut}) — ${format(parseISO(l.dateLivraison), "d MMM yyyy", { locale: fr })}`}
                  >
                    <Truck className="h-3.5 w-3.5 -translate-x-1/2 text-brand-orange-dark bg-white rounded-full" />
                  </div>
                );
              })}

              {/* Barres de tâches */}
              {rows.map((row, idx) => {
                const sched = scheduleByKey.get(row.key);
                if (!sched) return null;
                const x = dateToX(sched.dateDebut);
                const width = Math.max(PIXELS_PER_DAY, differenceInCalendarDays(sched.dateFin, sched.dateDebut) * PIXELS_PER_DAY + PIXELS_PER_DAY);
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
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une tâche
        </button>
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer le planning</SubmitButton>
      </div>
    </form>
  );
}

import { addDays, max as maxDate, min as minDate, differenceInCalendarDays } from "date-fns";

export type TaskId = string;

export type TaskNode = {
  id: TaskId;
  duree: number; // jours calendaires, >= 1
  dateDebut: Date; // ancrage pour les tâches racines (sans prédécesseur) ; ignoré sinon
  predecesseurs: TaskId[];
};

export type ScheduledTask = TaskNode & { dateFin: Date };

export class CycleError extends Error {
  cycleIds: TaskId[];
  constructor(cycleIds: TaskId[]) {
    super("Dépendances circulaires détectées.");
    this.name = "CycleError";
    this.cycleIds = cycleIds;
  }
}

/**
 * Calcule dateDebut/dateFin de chaque tâche à partir de ses prédécesseurs.
 * - Tâche sans prédécesseur : dateDebut = max(sa date ancrée, anchorDate).
 * - Tâche avec prédécesseur(s) : dateDebut = max des dateFin de tous ses prédécesseurs.
 * - dateFin = dateDebut + duree - 1 jour (durée en jours pleins).
 * Lève CycleError si le graphe de dépendances contient un cycle.
 */
export function computeSchedule(tasks: TaskNode[], anchorDate: Date): ScheduledTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));

  // Tri topologique de Kahn
  const inDegree = new Map<TaskId, number>();
  const successors = new Map<TaskId, TaskId[]>();
  for (const t of tasks) {
    inDegree.set(t.id, t.predecesseurs.length);
    for (const p of t.predecesseurs) {
      if (!byId.has(p)) continue; // prédécesseur inconnu, ignoré
      successors.set(p, [...(successors.get(p) ?? []), t.id]);
    }
  }

  const queue: TaskId[] = tasks.filter((t) => (inDegree.get(t.id) ?? 0) === 0).map((t) => t.id);
  const order: TaskId[] = [];
  const remaining = new Map(inDegree);

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const succId of successors.get(id) ?? []) {
      const deg = (remaining.get(succId) ?? 0) - 1;
      remaining.set(succId, deg);
      if (deg === 0) queue.push(succId);
    }
  }

  if (order.length !== tasks.length) {
    const cycleIds = tasks.map((t) => t.id).filter((id) => !order.includes(id));
    throw new CycleError(cycleIds);
  }

  const dateDebutById = new Map<TaskId, Date>();
  const dateFinById = new Map<TaskId, Date>();

  for (const id of order) {
    const task = byId.get(id)!;
    let dateDebut: Date;
    if (task.predecesseurs.length === 0) {
      dateDebut = maxDate([task.dateDebut, anchorDate]);
    } else {
      const finsPredecesseurs = task.predecesseurs
        .map((p) => dateFinById.get(p))
        .filter((d): d is Date => d != null);
      dateDebut = finsPredecesseurs.length > 0 ? maxDate(finsPredecesseurs) : maxDate([task.dateDebut, anchorDate]);
    }
    const dateFin = addDays(dateDebut, Math.max(1, task.duree) - 1);
    dateDebutById.set(id, dateDebut);
    dateFinById.set(id, dateFin);
  }

  // Conserve l'ordre d'origine du tableau (pas l'ordre topologique) pour rester aligné avec le tableau/les barres
  return tasks.map((t) => ({
    ...t,
    dateDebut: dateDebutById.get(t.id)!,
    dateFin: dateFinById.get(t.id)!,
  }));
}

/**
 * Calcule le chemin critique : les tâches dont tout retard décale directement la fin du projet
 * (marge = 0). Passe arrière classique (CPM) à partir du planning déjà calculé par computeSchedule.
 * Retourne l'ensemble des ids de tâches critiques.
 */
export function computeCriticalPath(scheduled: ScheduledTask[]): Set<TaskId> {
  if (scheduled.length === 0) return new Set();

  const successors = new Map<TaskId, TaskId[]>();
  for (const t of scheduled) {
    for (const p of t.predecesseurs) {
      successors.set(p, [...(successors.get(p) ?? []), t.id]);
    }
  }

  const projectEnd = maxDate(scheduled.map((t) => t.dateFin));

  // Ordre topologique inverse (déjà garanti acyclique par computeSchedule)
  const byId = new Map(scheduled.map((t) => [t.id, t]));
  const inDegree = new Map<TaskId, number>();
  for (const t of scheduled) inDegree.set(t.id, t.predecesseurs.length);
  const queue = scheduled.filter((t) => (inDegree.get(t.id) ?? 0) === 0).map((t) => t.id);
  const order: TaskId[] = [];
  const remaining = new Map(inDegree);
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const succId of successors.get(id) ?? []) {
      const deg = (remaining.get(succId) ?? 0) - 1;
      remaining.set(succId, deg);
      if (deg === 0) queue.push(succId);
    }
  }

  // Passe arrière : dateFinTardive(tâche) = min(dateDebutTardive(successeur)) - 1 jour (ou la fin du
  // projet si aucun successeur) ; dateDebutTardive = dateFinTardive - duree + 1.
  const dateDebutTardiveById = new Map<TaskId, Date>();
  const dateFinTardiveById = new Map<TaskId, Date>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const task = byId.get(id)!;
    const succIds = successors.get(id) ?? [];
    const dateFinTardive =
      succIds.length === 0
        ? projectEnd
        : minDate(succIds.map((s) => addDays(dateDebutTardiveById.get(s)!, -1)));
    const dateDebutTardive = addDays(dateFinTardive, -(Math.max(1, task.duree) - 1));
    dateFinTardiveById.set(id, dateFinTardive);
    dateDebutTardiveById.set(id, dateDebutTardive);
  }

  const critical = new Set<TaskId>();
  for (const t of scheduled) {
    const marge = differenceInCalendarDays(dateDebutTardiveById.get(t.id)!, t.dateDebut);
    if (marge <= 0) critical.add(t.id);
  }
  return critical;
}

export type AlerteSequencement = {
  tacheId: TaskId;
  autreTacheId: TaskId;
  message: string;
};

/**
 * Alertes non bloquantes de cohérence d'enchaînement des corps d'état, par rapport à l'ordre logique
 * usuel de chantier (cf. CORPS_ETAT_ORDRE_LOGIQUE). Signale les cas où une tâche d'un corps de métier
 * censé intervenir plus tard démarre avant la fin d'une tâche d'un corps de métier censé la précéder,
 * sans dépendance explicite entre les deux (donc potentiellement un oubli de coordination plutôt
 * qu'un chevauchement volontaire). N'empêche jamais l'enregistrement — c'est un avertissement.
 */
export function detecterAlertesSequencement(
  tasks: { id: TaskId; corpsEtat: string | null; predecesseurs: TaskId[] }[],
  scheduled: ScheduledTask[],
  ordreLogique: Record<string, number>,
): AlerteSequencement[] {
  const scheduleById = new Map(scheduled.map((s) => [s.id, s]));
  const byId = new Map(tasks.map((t) => [t.id, t]));

  // Graphe de dépendances (dans les deux sens) pour savoir si deux tâches sont déjà reliées
  const successors = new Map<TaskId, TaskId[]>();
  for (const t of tasks) {
    for (const p of t.predecesseurs) {
      successors.set(p, [...(successors.get(p) ?? []), t.id]);
    }
  }
  function estRelie(a: TaskId, b: TaskId): boolean {
    const visited = new Set<TaskId>();
    const stack = [a];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (cur === b) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      stack.push(...(successors.get(cur) ?? []));
      stack.push(...(byId.get(cur)?.predecesseurs ?? []));
    }
    return false;
  }

  const alertes: AlerteSequencement[] = [];
  for (let i = 0; i < tasks.length; i++) {
    for (let j = 0; j < tasks.length; j++) {
      if (i === j) continue;
      const a = tasks[i];
      const b = tasks[j];
      if (!a.corpsEtat || !b.corpsEtat) continue;
      const ordreA = ordreLogique[a.corpsEtat];
      const ordreB = ordreLogique[b.corpsEtat];
      if (ordreA == null || ordreB == null || ordreA >= ordreB) continue; // a doit précéder b
      if (estRelie(a.id, b.id)) continue; // déjà géré par une dépendance explicite

      const schedA = scheduleById.get(a.id);
      const schedB = scheduleById.get(b.id);
      if (!schedA || !schedB) continue;
      if (schedB.dateDebut < schedA.dateFin) {
        alertes.push({
          tacheId: b.id,
          autreTacheId: a.id,
          message: `démarre avant la fin de "${a.corpsEtat}" qui la précède habituellement (logique chantier / DTU) — aucune dépendance n'est déclarée entre les deux.`,
        });
      }
    }
  }
  return alertes;
}

/**
 * Indique si l'ajout de candidateEdge créerait un cycle dans le graphe de dépendances existant.
 * Utilisé côté UI pour griser les choix de prédécesseur invalides avant l'enregistrement.
 */
export function wouldCreateCycle(
  tasks: TaskNode[],
  candidateEdge: { predecesseurId: TaskId; successeurId: TaskId },
): boolean {
  if (candidateEdge.predecesseurId === candidateEdge.successeurId) return true;

  const successors = new Map<TaskId, TaskId[]>();
  for (const t of tasks) {
    for (const p of t.predecesseurs) {
      successors.set(p, [...(successors.get(p) ?? []), t.id]);
    }
  }
  successors.set(
    candidateEdge.predecesseurId,
    [...(successors.get(candidateEdge.predecesseurId) ?? []), candidateEdge.successeurId],
  );

  // DFS depuis le successeur candidat : si on retombe sur le prédécesseur candidat, c'est un cycle.
  const visited = new Set<TaskId>();
  const stack = [candidateEdge.successeurId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === candidateEdge.predecesseurId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(successors.get(current) ?? []));
  }
  return false;
}

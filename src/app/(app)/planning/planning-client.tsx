"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, X, MapPin, Building2 } from "lucide-react";
import { creerEvenement, modifierEvenement, supprimerEvenement } from "@/lib/actions/planning";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Evenement = {
  id: string; titre: string; description: string | null;
  dateDebut: string; dateFin: string | null;
  type: string; lieu: string | null;
  chantierId: string | null; chantierNom: string | null;
};

type Chantier = { id: string; nom: string };

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  VISITE:       { label: "Visite",        color: "text-blue-700",    bg: "bg-blue-100"    },
  INTERVENTION: { label: "Intervention",  color: "text-orange-700",  bg: "bg-orange-100"  },
  LIVRAISON:    { label: "Livraison",     color: "text-purple-700",  bg: "bg-purple-100"  },
  REUNION:      { label: "Réunion",       color: "text-emerald-700", bg: "bg-emerald-100" },
  AUTRE:        { label: "Autre",         color: "text-slate-700",   bg: "bg-slate-100"   },
};

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ---------------------------------------------------------------------------
// Calendrier mensuel
// ---------------------------------------------------------------------------

function buildCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  // Lundi = 0
  const startDow = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Modal Événement
// ---------------------------------------------------------------------------

function EvenementModal({
  ev,
  chantiers,
  dateInitiale,
  onClose,
  onSaved,
}: {
  ev:            Evenement | null;
  chantiers:     Chantier[];
  dateInitiale?: string;
  onClose:       () => void;
  onSaved:       () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [titre,       setTitre]       = useState(ev?.titre ?? "");
  const [description, setDescription] = useState(ev?.description ?? "");
  const [dateDebut,   setDateDebut]   = useState(ev?.dateDebut?.slice(0, 16) ?? `${dateInitiale ?? ""}T08:00`);
  const [dateFin,     setDateFin]     = useState(ev?.dateFin?.slice(0, 16) ?? "");
  const [type,        setType]        = useState(ev?.type ?? "AUTRE");
  const [lieu,        setLieu]        = useState(ev?.lieu ?? "");
  const [chantierId,  setChantierId]  = useState(ev?.chantierId ?? "");
  const [error,       setError]       = useState("");

  function handleSubmit() {
    if (!titre) { setError("Le titre est requis."); return; }
    if (!dateDebut) { setError("La date de début est requise."); return; }
    setError("");
    startTransition(async () => {
      const data = { titre, description: description || undefined, dateDebut, dateFin: dateFin || undefined, type, lieu: lieu || undefined, chantierId: chantierId || undefined };
      if (ev) await modifierEvenement(ev.id, data);
      else     await creerEvenement(data);
      onSaved();
      onClose();
    });
  }

  function handleDelete() {
    if (!ev || !confirm(`Supprimer "${ev.titre}" ?`)) return;
    startTransition(async () => {
      await supprimerEvenement(ev.id);
      onSaved();
      onClose();
    });
  }

  const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-brand-navy">{ev ? "Modifier l'événement" : "Nouvel événement"}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Titre *</label>
            <input value={titre} onChange={e => setTitre(e.target.value)} className={inputCls} placeholder="Réunion de chantier, livraison béton…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Chantier</label>
              <select value={chantierId} onChange={e => setChantierId(e.target.value)} className={inputCls}>
                <option value="">Sans chantier</option>
                {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Début *</label>
              <input type="datetime-local" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Fin</label>
              <input type="datetime-local" value={dateFin} onChange={e => setDateFin(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Lieu</label>
            <input value={lieu} onChange={e => setLieu(e.target.value)} className={inputCls} placeholder="Adresse, salle…" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className={`${inputCls} resize-none`} placeholder="Détails, intervenants, matériaux…" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {ev ? (
            <button onClick={handleDelete} disabled={isPending}
              className="text-xs font-semibold text-red-500 hover:text-red-700">
              Supprimer
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={isPending}
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition">
              {isPending ? "Sauvegarde…" : ev ? "Mettre à jour" : "Créer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function PlanningClient({
  evenements,
  chantiers,
  moisCourant,
  chantierId,
}: {
  evenements:  Evenement[];
  chantiers:   Chantier[];
  moisCourant: string; // "YYYY-MM"
  chantierId:  string | null;
}) {
  const router = useRouter();
  const [modalEv,    setModalEv]    = useState<Evenement | null | "new">(null);
  const [dateClick,  setDateClick]  = useState<string | undefined>(undefined);

  const [year, month] = moisCourant.split("-").map(Number);
  const days = buildCalendarDays(year, month - 1);

  function goMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    const nm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/planning?mois=${nm}${chantierId ? `&chantierId=${chantierId}` : ""}`);
  }

  function openNew(dateStr: string) {
    setDateClick(dateStr);
    setModalEv("new");
  }

  function getEventsForDay(date: Date) {
    const ds = toDateStr(date);
    return evenements.filter(e => e.dateDebut.slice(0, 10) === ds);
  }

  const moisLabel = new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <>
      {modalEv !== null && (
        <EvenementModal
          ev={modalEv === "new" ? null : modalEv}
          chantiers={chantiers}
          dateInitiale={dateClick}
          onClose={() => { setModalEv(null); setDateClick(undefined); }}
          onSaved={() => router.refresh()}
        />
      )}

      <div className="flex flex-col gap-6">
        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-navy capitalize">Planning</h2>
            <p className="mt-1 text-sm text-slate-500">
              {evenements.length} événement{evenements.length !== 1 ? "s" : ""} ce mois · Cliquez sur un jour pour ajouter
            </p>
          </div>
          <div className="flex items-center gap-3">
            <form method="get" className="flex gap-2">
              <input type="hidden" name="mois" value={moisCourant} />
              <select name="chantierId" defaultValue={chantierId ?? ""}
                onChange={e => router.push(`/planning?mois=${moisCourant}${e.target.value ? `&chantierId=${e.target.value}` : ""}`)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Tous les chantiers</option>
                {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </form>
            <button onClick={() => openNew(moisCourant + "-01")}
              className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition">
              <Plus className="h-4 w-4" /> Événement
            </button>
          </div>
        </div>

        {/* Navigation mois */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <button onClick={() => goMonth(-1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-white transition">
              <ChevronLeft className="h-4 w-4" /> Précédent
            </button>
            <h3 className="text-base font-bold text-brand-navy capitalize">{moisLabel}</h3>
            <button onClick={() => goMonth(1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-white transition">
              Suivant <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Grille */}
          <div className="grid grid-cols-7">
            {JOURS.map(j => (
              <div key={j} className="border-b border-slate-100 px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {j}
              </div>
            ))}
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-slate-100 bg-slate-50/50" />;
              const isToday = toDateStr(day) === toDateStr(new Date());
              const evs = getEventsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => openNew(toDateStr(day))}
                  className={`min-h-[90px] border-b border-r border-slate-100 p-1.5 cursor-pointer hover:bg-brand-blue/5 transition ${isToday ? "bg-brand-blue/5" : ""}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-brand-orange text-white" : "text-slate-500"}`}>
                    {day.getDate()}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {evs.slice(0, 3).map(ev => {
                      const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.AUTRE;
                      const heure = new Date(ev.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                      return (
                        <button
                          key={ev.id}
                          onClick={e => { e.stopPropagation(); setModalEv(ev); }}
                          className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-semibold ${cfg.color} ${cfg.bg} hover:opacity-80 transition`}
                        >
                          <span className="font-bold">{heure}</span> {ev.titre}
                        </button>
                      );
                    })}
                    {evs.length > 3 && (
                      <span className="text-[10px] text-slate-400 pl-1">+{evs.length - 3} autre{evs.length - 3 > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liste des événements du mois */}
        {evenements.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="font-semibold text-brand-navy">Tous les événements du mois</p>
            </div>
            <div className="divide-y divide-slate-50">
              {evenements.map(ev => {
                const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.AUTRE;
                const date = new Date(ev.dateDebut);
                return (
                  <button
                    key={ev.id}
                    onClick={() => setModalEv(ev)}
                    className="w-full flex items-start gap-4 px-4 py-3 hover:bg-slate-50 transition text-left"
                  >
                    <div className="text-center min-w-[40px]">
                      <p className="text-lg font-bold text-brand-navy leading-none">{date.getDate()}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{date.toLocaleDateString("fr-FR", { weekday: "short" })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
                        <span className="font-semibold text-brand-navy text-sm truncate">{ev.titre}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {ev.lieu && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{ev.lieu}</span>}
                        {ev.chantierNom && <span className="flex items-center gap-0.5"><Building2 className="h-3 w-3" />{ev.chantierNom}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

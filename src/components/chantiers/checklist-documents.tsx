import Link from "next/link";
import { CheckCircle2, Clock, XCircle, Minus, FileCheck, FolderOpen } from "lucide-react";
import { updateChecklistItem } from "@/lib/actions/checklist";
import { formatDate } from "@/lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatutChecklist =
  | "MANQUANT"
  | "EN_COURS"
  | "RECU"
  | "VALIDE"
  | "NON_APPLICABLE"
  | "PRESENT";

type DocDef = {
  cle: string;
  label: string;
  description?: string;
  mode: "AUTO" | "MANUEL";
};

type DocResolu = DocDef & {
  statut: StatutChecklist;
  lien?: string;
  libelleLink?: string;
  dateReception?: Date | null;
};

type PhaseResolu = {
  label: string;
  docs: DocResolu[];
};

// ---------------------------------------------------------------------------
// Référentiel des documents requis par phase
// ---------------------------------------------------------------------------

const PHASES_REQUIS: Array<{ label: string; docs: DocDef[] }> = [
  {
    label: "Phase commerciale",
    docs: [
      {
        cle: "DEVIS_SIGNE",
        label: "Devis signé (bon pour accord)",
        description: "Devis initial accepté par le client",
        mode: "AUTO",
      },
      {
        cle: "AVENANT_SIGNE",
        label: "Avenant(s) accepté(s)",
        description: "Avenants éventuels signés par le client",
        mode: "AUTO",
      },
    ],
  },
  {
    label: "Phase administrative & sous-traitance",
    docs: [
      {
        cle: "CONTRAT_ST",
        label: "Contrat de sous-traitance",
        description: "Contrat signé avec chaque sous-traitant",
        mode: "AUTO",
      },
      {
        cle: "ORDRE_MISSION",
        label: "Ordre(s) de mission",
        description: "Ordres de mission émis aux sous-traitants",
        mode: "AUTO",
      },
      {
        cle: "DC4",
        label: "DC4 — Déclaration de sous-traitance",
        description: "Obligatoire pour chaque sous-traitant intervenant",
        mode: "MANUEL",
      },
      {
        cle: "ASSURANCE_DECENNALE_SDA",
        label: "Attestation décennale SDA Rénovation",
        description: "Attestation assurance décennale en cours de validité",
        mode: "MANUEL",
      },
      {
        cle: "ASSURANCE_RC_SDA",
        label: "Attestation RC Pro SDA Rénovation",
        description: "Attestation responsabilité civile professionnelle",
        mode: "MANUEL",
      },
      {
        cle: "ASSURANCE_DECENNALE_ST",
        label: "Attestation décennale sous-traitant",
        description: "À collecter auprès de chaque sous-traitant",
        mode: "MANUEL",
      },
      {
        cle: "KBIS_ST",
        label: "Extrait Kbis sous-traitant",
        description: "Kbis ou pièce d'identité du sous-traitant",
        mode: "MANUEL",
      },
    ],
  },
  {
    label: "Phase chantier",
    docs: [
      {
        cle: "PLAN_PREVENTION",
        label: "Plan de prévention / PPSPS",
        description: "Plan particulier de sécurité et de protection de la santé",
        mode: "MANUEL",
      },
      {
        cle: "DOE",
        label: "DOE — Dossier des Ouvrages Exécutés",
        description: "Remis au maître d'ouvrage à la réception",
        mode: "MANUEL",
      },
      {
        cle: "PHOTOS_AVANT",
        label: "Photos avant travaux",
        description: "État des lieux photographique avant intervention",
        mode: "MANUEL",
      },
      {
        cle: "PHOTOS_APRES",
        label: "Photos après travaux",
        description: "État final du chantier réalisé",
        mode: "MANUEL",
      },
    ],
  },
  {
    label: "Phase financière",
    docs: [
      {
        cle: "FACTURE_ACOMPTE",
        label: "Facture d'acompte",
        description: "Facture d'acompte émise en début de chantier",
        mode: "AUTO",
      },
      {
        cle: "FACTURE_SITUATION",
        label: "Facture(s) de situation",
        description: "Situations intermédiaires d'avancement",
        mode: "AUTO",
      },
      {
        cle: "FACTURE_SOLDE",
        label: "Facture de solde",
        description: "Facture définitive clôturant le chantier",
        mode: "AUTO",
      },
      {
        cle: "BON_COMMANDE",
        label: "Bon(s) de commande matériaux",
        description: "Commandes fournisseurs liées au chantier",
        mode: "AUTO",
      },
      {
        cle: "BON_LIVRAISON",
        label: "Bon(s) de livraison",
        description: "Bons de livraison réceptionnés",
        mode: "AUTO",
      },
    ],
  },
  {
    label: "Phase réception / clôture",
    docs: [
      {
        cle: "PV_RECEPTION",
        label: "Procès-verbal de réception des travaux",
        description: "PV signé par le maître d'ouvrage",
        mode: "MANUEL",
      },
      {
        cle: "LEVEE_RESERVES",
        label: "Levée des réserves",
        description: "Document constatant la levée des réserves émises",
        mode: "MANUEL",
      },
      {
        cle: "GPA",
        label: "Garantie de parfait achèvement (GPA)",
        description: "Acte ou courrier de garantie 1 an post-réception",
        mode: "MANUEL",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Chantier data shape needed by this component
// ---------------------------------------------------------------------------

type ChantierData = {
  id: string;
  devis: Array<{ id: string; numero: string; statut: string; type: string }>;
  factures: Array<{ id: string; numero: string; type: string; statut: string }>;
  bonsCommande: Array<{ id: string; numero: string }>;
  bonsLivraison: Array<{ id: string; numero: string }>;
  contrats: Array<{ id: string; numero: string; statut: string }>;
  ordresMission: Array<{ id: string; numero: string; statut: string }>;
  sousTraitants: Array<unknown>;
  checklistDocuments: Array<{
    cle: string;
    statut: string;
    notes?: string | null;
    dateReception?: Date | null;
  }>;
};

// ---------------------------------------------------------------------------
// Build merged checklist from auto-detection + DB records
// ---------------------------------------------------------------------------

function buildChecklist(chantier: ChantierData): PhaseResolu[] {
  const dbMap = new Map(
    chantier.checklistDocuments.map((item) => [item.cle, item])
  );
  const hasST = chantier.sousTraitants.length > 0;

  return PHASES_REQUIS.map((phase) => ({
    label: phase.label,
    docs: phase.docs.map((def): DocResolu => {
      if (def.mode === "AUTO") {
        return resolveAuto(def, chantier, hasST);
      }
      const db = dbMap.get(def.cle);
      return {
        ...def,
        statut: (db?.statut as StatutChecklist) ?? "MANQUANT",
        dateReception: db?.dateReception,
      };
    }),
  }));
}

function resolveAuto(
  def: DocDef,
  chantier: ChantierData,
  hasST: boolean
): DocResolu {
  switch (def.cle) {
    case "DEVIS_SIGNE": {
      const d = chantier.devis.find(
        (d) => d.statut === "ACCEPTE" && d.type === "INITIAL"
      );
      return {
        ...def,
        statut: d ? "PRESENT" : "MANQUANT",
        lien: d ? `/devis/${d.id}` : undefined,
        libelleLink: d?.numero,
      };
    }
    case "AVENANT_SIGNE": {
      const d = chantier.devis.find(
        (d) => d.statut === "ACCEPTE" && d.type === "AVENANT"
      );
      return {
        ...def,
        statut: d ? "PRESENT" : "NON_APPLICABLE",
        lien: d ? `/devis/${d.id}` : undefined,
        libelleLink: d?.numero,
      };
    }
    case "CONTRAT_ST": {
      const c = chantier.contrats.find((c) =>
        ["SIGNE", "TERMINE"].includes(c.statut)
      );
      return {
        ...def,
        statut: hasST ? (c ? "PRESENT" : "MANQUANT") : "NON_APPLICABLE",
        lien: c ? `/contrats-sous-traitance/${c.id}` : undefined,
        libelleLink: c?.numero,
      };
    }
    case "ORDRE_MISSION": {
      const o = chantier.ordresMission.find((o) => o.statut !== "ANNULE");
      return {
        ...def,
        statut: hasST ? (o ? "PRESENT" : "NON_APPLICABLE") : "NON_APPLICABLE",
        lien: o ? `/ordres-mission/${o.id}` : undefined,
        libelleLink: o?.numero,
      };
    }
    case "FACTURE_ACOMPTE": {
      const f = chantier.factures.find((f) => f.type === "ACOMPTE");
      return {
        ...def,
        statut: f ? "PRESENT" : "NON_APPLICABLE",
        lien: f ? `/factures/${f.id}` : undefined,
        libelleLink: f?.numero,
      };
    }
    case "FACTURE_SITUATION": {
      const f = chantier.factures.find((f) => f.type === "SITUATION");
      return {
        ...def,
        statut: f ? "PRESENT" : "NON_APPLICABLE",
        lien: f ? `/factures/${f.id}` : undefined,
        libelleLink: f?.numero,
      };
    }
    case "FACTURE_SOLDE": {
      const f = chantier.factures.find((f) => f.type === "SOLDE");
      return {
        ...def,
        statut: f ? "PRESENT" : "MANQUANT",
        lien: f ? `/factures/${f.id}` : undefined,
        libelleLink: f?.numero,
      };
    }
    case "BON_COMMANDE": {
      const bc = chantier.bonsCommande[0];
      return {
        ...def,
        statut: bc ? "PRESENT" : "NON_APPLICABLE",
        lien: bc ? `/bons-commande/${bc.id}` : undefined,
        libelleLink: bc?.numero,
      };
    }
    case "BON_LIVRAISON": {
      const bl = chantier.bonsLivraison[0];
      return {
        ...def,
        statut: bl ? "PRESENT" : "NON_APPLICABLE",
        lien: bl ? `/bons-livraison/${bl.id}` : undefined,
        libelleLink: bl?.numero,
      };
    }
    default:
      return { ...def, statut: "MANQUANT" };
  }
}

// ---------------------------------------------------------------------------
// Status display config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  StatutChecklist,
  {
    icon: React.ElementType;
    iconColor: string;
    bgColor: string;
    badgeColor: string;
    label: string;
  }
> = {
  PRESENT: {
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50",
    badgeColor: "bg-emerald-100 text-emerald-700",
    label: "Présent",
  },
  VALIDE: {
    icon: FileCheck,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
    badgeColor: "bg-emerald-100 text-emerald-700",
    label: "Validé",
  },
  RECU: {
    icon: CheckCircle2,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
    badgeColor: "bg-blue-100 text-blue-700",
    label: "Reçu",
  },
  EN_COURS: {
    icon: Clock,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50",
    badgeColor: "bg-amber-100 text-amber-700",
    label: "En cours",
  },
  MANQUANT: {
    icon: XCircle,
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
    badgeColor: "bg-red-100 text-red-700",
    label: "Manquant",
  },
  NON_APPLICABLE: {
    icon: Minus,
    iconColor: "text-slate-400",
    bgColor: "bg-slate-50",
    badgeColor: "bg-slate-100 text-slate-500",
    label: "N/A",
  },
};

// ---------------------------------------------------------------------------
// Individual row component
// ---------------------------------------------------------------------------

function DocRow({
  doc,
  chantierId,
}: {
  doc: DocResolu;
  chantierId: string;
}) {
  const cfg = STATUS_CONFIG[doc.statut] ?? STATUS_CONFIG.MANQUANT;
  const Icon = cfg.icon as React.ComponentType<{ className?: string }>;
  const action = updateChecklistItem.bind(null, chantierId, doc.cle);

  return (
    <div className="flex flex-wrap items-start gap-3 px-5 py-3 sm:flex-nowrap sm:items-center">
      {/* Status icon */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bgColor}`}
      >
        <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
      </div>

      {/* Document info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-700">{doc.label}</p>
        {doc.description && (
          <p className="text-xs text-slate-400">{doc.description}</p>
        )}
        {doc.lien && (
          <Link
            href={doc.lien}
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
          >
            <FolderOpen className="h-3 w-3" />
            {doc.libelleLink ?? "Voir le document"}
          </Link>
        )}
        {doc.dateReception && (
          <p className="text-xs text-slate-400">
            Reçu le {formatDate(doc.dateReception)}
          </p>
        )}
      </div>

      {/* Mode badge */}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          doc.mode === "AUTO"
            ? "bg-brand-blue/10 text-brand-blue-dark"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {doc.mode === "AUTO" ? "Automatique" : "Manuel"}
      </span>

      {/* Status: AUTO → badge only; MANUEL → editable form */}
      {doc.mode === "AUTO" ? (
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${cfg.badgeColor}`}
        >
          {cfg.label}
        </span>
      ) : (
        <form action={action} className="flex shrink-0 items-center gap-2">
          <select
            name="statut"
            defaultValue={doc.statut}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-brand-blue focus:outline-none"
          >
            <option value="MANQUANT">Manquant</option>
            <option value="EN_COURS">En cours</option>
            <option value="RECU">Reçu</option>
            <option value="VALIDE">Validé</option>
            <option value="NON_APPLICABLE">N/A</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-brand-blue px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-blue-dark"
          >
            ✓
          </button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function ChecklistDocuments({ chantier }: { chantier: ChantierData }) {
  const phases = buildChecklist(chantier);
  const allDocs = phases.flatMap((p) => p.docs);
  const applicable = allDocs.filter((d) => d.statut !== "NON_APPLICABLE");
  const ok = applicable.filter((d) =>
    ["PRESENT", "VALIDE", "RECU"].includes(d.statut)
  );
  const manquants = applicable.filter((d) => d.statut === "MANQUANT");
  const enCours = applicable.filter((d) => d.statut === "EN_COURS");
  const pct = applicable.length > 0 ? (ok.length / applicable.length) * 100 : 0;

  const progressColor =
    pct === 100
      ? "from-emerald-500 to-emerald-400"
      : pct >= 70
      ? "from-brand-blue to-brand-orange"
      : pct >= 40
      ? "from-amber-500 to-amber-400"
      : "from-red-500 to-red-400";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-brand-navy to-brand-blue-dark px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Tableau de suivi des documents dossier</h3>
            <p className="mt-0.5 text-xs text-white/60">
              Suivi complet des pièces constitutives du dossier chantier
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {ok.length}
              <span className="text-base font-normal text-white/50">
                /{applicable.length}
              </span>
            </p>
            <p className="text-xs text-white/60">documents renseignés</p>
          </div>
        </div>

        {/* Progress bar + KPIs */}
        <div className="mt-3">
          <div className="h-2 rounded-full bg-white/20">
            <div
              className={`h-2 rounded-full bg-gradient-to-r transition-all ${progressColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/70">
            <span>
              <span className="font-semibold text-emerald-300">{ok.length}</span> présents / validés
            </span>
            {enCours.length > 0 && (
              <span>
                <span className="font-semibold text-amber-300">{enCours.length}</span> en cours
              </span>
            )}
            {manquants.length > 0 && (
              <span>
                <span className="font-semibold text-red-300">{manquants.length}</span> manquants
              </span>
            )}
            <span className="ml-auto font-semibold text-white">
              {pct.toFixed(0)} % complété
            </span>
          </div>
        </div>
      </div>

      {/* Phases */}
      {phases.map((phase) => (
        <div key={phase.label}>
          {/* Phase header */}
          <div className="border-b border-t border-slate-100 bg-slate-50 px-5 py-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {phase.label}
            </h4>
          </div>
          {/* Document rows */}
          <div className="divide-y divide-slate-50">
            {phase.docs.map((doc) => (
              <DocRow key={doc.cle} doc={doc} chantierId={chantier.id} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

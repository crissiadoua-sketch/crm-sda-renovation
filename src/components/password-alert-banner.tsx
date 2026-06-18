import Link from "next/link";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

const DELAI_ALERTE_JOURS = 75;  // alerte à 2,5 mois
const DELAI_CRITIQUE_JOURS = 90; // critique à 3 mois (politique de renouvellement)

type NiveauAlerte = "OK" | "ALERTE" | "CRITIQUE" | "JAMAIS_CHANGE";

function getNiveauAlerte(passwordChangedAt: Date | null, createdAt: Date): {
  niveau: NiveauAlerte;
  joursDepuis: number;
} {
  const referenceDate = passwordChangedAt ?? createdAt;
  const joursDepuis = Math.floor(
    (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (!passwordChangedAt) {
    // Jamais changé — on donne un délai de grâce de 30j depuis la création
    if (joursDepuis > DELAI_ALERTE_JOURS) {
      return { niveau: "JAMAIS_CHANGE", joursDepuis };
    }
    return { niveau: "OK", joursDepuis };
  }

  if (joursDepuis >= DELAI_CRITIQUE_JOURS) return { niveau: "CRITIQUE", joursDepuis };
  if (joursDepuis >= DELAI_ALERTE_JOURS) return { niveau: "ALERTE", joursDepuis };
  return { niveau: "OK", joursDepuis };
}

export function PasswordAlertBanner({
  passwordChangedAt,
  createdAt,
}: {
  passwordChangedAt: Date | null;
  createdAt: Date;
}) {
  const { niveau, joursDepuis } = getNiveauAlerte(passwordChangedAt, createdAt);

  if (niveau === "OK") return null;

  const config = {
    JAMAIS_CHANGE: {
      bg: "bg-red-600",
      text: "text-white",
      border: "border-red-700",
      icon: ShieldX,
      message: `Votre mot de passe n'a jamais été modifié (compte créé il y a ${joursDepuis} jour${joursDepuis > 1 ? "s" : ""}).`,
      cta: "Définir mon mot de passe",
    },
    CRITIQUE: {
      bg: "bg-red-600",
      text: "text-white",
      border: "border-red-700",
      icon: ShieldX,
      message: `Mot de passe expiré — dernière modification il y a ${joursDepuis} jours (renouvellement obligatoire tous les 3 mois).`,
      cta: "Changer maintenant",
    },
    ALERTE: {
      bg: "bg-brand-orange-dark",
      text: "text-white",
      border: "border-orange-700",
      icon: ShieldAlert,
      message: `Rappel sécurité — votre mot de passe date de ${joursDepuis} jours. Pensez à le renouveler.`,
      cta: "Mettre à jour",
    },
  } as const;

  const c = config[niveau];
  const Icon = c.icon;

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm ${c.bg} ${c.text}`}>
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-medium">{c.message}</span>
      </div>
      <Link
        href="/profil/mot-de-passe"
        className="shrink-0 rounded-full border border-white/40 bg-white/10 px-4 py-1 text-xs font-semibold hover:bg-white/20 transition"
      >
        {c.cta} →
      </Link>
    </div>
  );
}

// Version compacte pour la page de paramètres / profil
export function PasswordStatusBadge({
  passwordChangedAt,
  createdAt,
}: {
  passwordChangedAt: Date | null;
  createdAt: Date;
}) {
  const { niveau, joursDepuis } = getNiveauAlerte(passwordChangedAt, createdAt);

  if (niveau === "OK") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        <ShieldCheck className="h-3 w-3" />
        Mot de passe à jour ({joursDepuis} j)
      </span>
    );
  }
  if (niveau === "ALERTE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
        <ShieldAlert className="h-3 w-3" />
        À renouveler ({joursDepuis} j)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
      <ShieldX className="h-3 w-3" />
      {niveau === "JAMAIS_CHANGE" ? "Jamais modifié" : `Expiré (${joursDepuis} j)`}
    </span>
  );
}

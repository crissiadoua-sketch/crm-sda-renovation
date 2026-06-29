// Rôles et permissions — CRM SDA Rénovation
// Ce fichier est importé côté serveur ET dans le middleware (proxy.ts)
// → pas d'import "server-only", pas de dépendances externes.

export const FULL_ACCESS_ROLES = [
  "DIRIGEANT",
  "ASSISTANT_DIRECTION",
  "DAF",
  "ADMIN", // rétro-compatibilité avec l'ancien rôle par défaut
] as const;

export const ALL_ROLES = [
  "DIRIGEANT",
  "ASSISTANT_DIRECTION",
  "DAF",
  "CONDUCTEUR_TRAVAUX",
  "COMMERCIAL",
  "COMPTABLE",
  "OUVRIER",
  "EXPERT_COMPTABLE",
] as const;

export type Role = (typeof ALL_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  DIRIGEANT: "Dirigeant",
  ASSISTANT_DIRECTION: "Assistant(e) de direction",
  DAF: "Dir. Administratif et Financier",
  CONDUCTEUR_TRAVAUX: "Conducteur de travaux",
  COMMERCIAL: "Commercial",
  COMPTABLE: "Comptable",
  OUVRIER: "Ouvrier",
  EXPERT_COMPTABLE: "Expert-Comptable (externe)",
  ADMIN: "Administrateur",
};

export const ROLE_BADGE_TONES: Record<string, "blue" | "navy" | "orange" | "green" | "gray"> = {
  DIRIGEANT: "navy",
  ASSISTANT_DIRECTION: "blue",
  DAF: "blue",
  ADMIN: "navy",
  CONDUCTEUR_TRAVAUX: "orange",
  COMMERCIAL: "green",
  COMPTABLE: "gray",
  OUVRIER: "gray",
  EXPERT_COMPTABLE: "gray",
};

// Routes accessibles aux rôles restreints (les routes /rh, /parametres,
// /utilisateurs ne sont PAS listées ici → full access uniquement)
export const ALL_PERMISSIONS = [
  "/",
  "/recherche",
  "/clients",
  "/fournisseurs",
  "/sous-traitants",
  "/chantiers",
  "/planning",
  "/devis",
  "/ouvrages",
  "/main-oeuvre",
  "/temps-unitaires",
  "/interimaires",
  "/factures",
  "/etats-reserves",
  "/contrats-sous-traitance",
  "/ordres-mission",
  "/bons-commande",
  "/bons-livraison",
  "/taches",
  "/stock",
  "/tresorerie",
  "/analytique",
  "/notes-de-frais",
  "/documents",
  "/depenses",
  "/finances",
  "/comptabilite",
  "/prospects",
  "/memoires-techniques",
  "/doe",
  "/ppsps",
  "/fiches-techniques",
  "/dtu",
  "/mutuelle",
  "/meteo",
  "/messagerie",
  "/securite",
  "/etude-prix/agrement-produits",
  "/etude-prix/cout-materiaux",
  "/etude-prix/approvisionement",
  "/etude-prix/pre-dimensionnement",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<string, string> = {
  "/": "Tableau de bord",
  "/recherche": "Recherche & Google",
  "/clients": "Clients",
  "/fournisseurs": "Fournisseurs",
  "/sous-traitants": "Sous-traitants",
  "/chantiers": "Chantiers",
  "/planning": "Planning",
  "/devis": "Devis",
  "/ouvrages": "Bibliothèque ouvrages",
  "/main-oeuvre": "Taux main d'œuvre",
  "/temps-unitaires": "Temps unitaires",
  "/interimaires": "Intérimaires",
  "/factures": "Factures",
  "/etats-reserves": "États des réserves",
  "/contrats-sous-traitance": "Contrats de sous-traitance",
  "/ordres-mission": "Ordres de mission",
  "/bons-commande": "Bons de commande",
  "/bons-livraison": "Bons de livraison",
  "/taches": "Tâches internes",
  "/stock": "Gestion de stock",
  "/tresorerie": "Trésorerie",
  "/analytique": "Analytique & Graphiques",
  "/notes-de-frais": "Notes de frais",
  "/documents": "Documents",
  "/depenses": "Dépenses",
  "/finances": "Finances",
  "/comptabilite": "Comptabilité",
  "/prospects": "Prospects",
  "/memoires-techniques": "Mémoires techniques",
  "/doe": "DOE",
  "/ppsps": "PPSPS",
  "/fiches-techniques": "Fiches techniques",
  "/dtu": "Bibliothèque DTU",
  "/mutuelle": "Mutuelle d'entreprise",
  "/meteo": "Journal Météo BTP",
  "/messagerie": "Messagerie interne",
  "/securite": "Sécurité — Alba-ayla IA",
  "/etude-prix/agrement-produits": "Fiches d'agrément produit",
  "/etude-prix/cout-materiaux": "Coût matériaux rendus chantier",
  "/etude-prix/approvisionement": "Approvisionnement chantier",
  "/etude-prix/pre-dimensionnement": "Pré-dimensionnement structurel",
};

// Groupes de permissions pour l'interface d'édition
export const PERMISSION_GROUPS: { label: string; routes: string[] }[] = [
  { label: "Général", routes: ["/", "/recherche", "/meteo", "/messagerie"] },
  // /securite est intentionnellement absent des groupes publics — réservé aux rôles full-access
  { label: "Annuaire", routes: ["/clients", "/fournisseurs", "/sous-traitants"] },
  { label: "Chantiers", routes: ["/chantiers", "/planning"] },
  {
    label: "Ventes",
    routes: [
      "/devis",
      "/ouvrages",
      "/main-oeuvre",
      "/temps-unitaires",
      "/interimaires",
      "/factures",
      "/etats-reserves",
      "/contrats-sous-traitance",
      "/ordres-mission",
    ],
  },
  { label: "Achats", routes: ["/bons-commande", "/bons-livraison"] },
  {
    label: "Gestion",
    routes: ["/taches", "/stock", "/notes-de-frais", "/documents", "/prospects"],
  },
  {
    label: "Finance & Comptabilité",
    routes: ["/depenses", "/tresorerie", "/finances", "/analytique", "/comptabilite"],
  },
  { label: "RH", routes: ["/mutuelle"] },
  { label: "Documents techniques", routes: ["/memoires-techniques", "/doe", "/ppsps", "/fiches-techniques", "/dtu"] },
  {
    label: "Étude de prix",
    routes: [
      "/etude-prix/agrement-produits",
      "/etude-prix/cout-materiaux",
      "/etude-prix/approvisionement",
      "/etude-prix/pre-dimensionnement",
    ],
  },
];

// Permissions par défaut pour chaque rôle restreint
export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  CONDUCTEUR_TRAVAUX: [
    "/",
    "/clients",
    "/fournisseurs",
    "/sous-traitants",
    "/chantiers",
    "/planning",
    "/etats-reserves",
    "/contrats-sous-traitance",
    "/ordres-mission",
    "/bons-commande",
    "/bons-livraison",
    "/notes-de-frais",
    "/documents",
    "/ouvrages",
    "/etude-prix/agrement-produits",
    "/etude-prix/cout-materiaux",
    "/etude-prix/approvisionement",
    "/etude-prix/pre-dimensionnement",
  ],
  COMMERCIAL: ["/", "/clients", "/devis", "/ouvrages", "/prospects", "/documents"],
  COMPTABLE: [
    "/",
    "/fournisseurs",
    "/factures",
    "/bons-commande",
    "/bons-livraison",
    "/notes-de-frais",
    "/depenses",
    "/finances",
    "/tresorerie",
    "/comptabilite",
  ],
  OUVRIER: ["/", "/planning", "/notes-de-frais"],
  EXPERT_COMPTABLE: ["/", "/comptabilite", "/finances", "/depenses", "/factures", "/tresorerie"],
};

export function isFullAccessRole(role: string): boolean {
  return (FULL_ACCESS_ROLES as readonly string[]).includes(role);
}

export function getDefaultPermissions(role: string): string[] {
  if (isFullAccessRole(role)) return [];
  return DEFAULT_PERMISSIONS[role] ?? ["/"];
}

export function canAccess(role: string, permissions: string[], path: string): boolean {
  if (isFullAccessRole(role)) return true;
  return permissions.some((p) => path === p || path.startsWith(`${p}/`));
}

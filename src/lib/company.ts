// Informations entreprise SDA Rénovation — source unique de vérité
// Utilisé dans tous les documents, PDF, cartouches et formulaires

export const COMPANY = {
  nom: "SDA Rénovation",
  siren: "988 681 672",
  siret: "988 681 672 00001",
  formeJuridique: "SAS",
  rcs: "RCS Toulouse",
  adresse: "23 bis rue Aristide Bergès",
  codePostal: "31270",
  ville: "CUGNAUX",
  departement: "Haute-Garonne",
  pays: "France",
  telephone: "06 25 43 54 64",
  email: "contact@sda-renovation.com",
  emailDirecteur: "christopher.siadoua@sda-renovation.com",
  site: "www.sda-renovation.com",
  activite: "Tous Corps d'État",
  slogan: "Qualité · Transparence · Respect des délais",
  codeAPE: "4120A",
  tvaIntracommunautaire: "FR77 988 681 672",
  assuranceDecennale: "À compléter",
  assureurRC: "À compléter",
  numeroRGE: "À compléter",
} as const;

export const COMPANY_ADDRESS_FULL = `${COMPANY.nom} · ${COMPANY.adresse} ${COMPANY.codePostal} ${COMPANY.ville}`;
export const COMPANY_LEGAL = `${COMPANY.formeJuridique} au capital variable · SIREN ${COMPANY.siren} · ${COMPANY.rcs} · TVA ${COMPANY.tvaIntracommunautaire}`;

export type CompanyInfo = typeof COMPANY;

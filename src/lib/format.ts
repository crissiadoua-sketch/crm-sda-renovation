export function formatEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(date));
}

export function toDateInputValue(date: Date | string | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function clientDisplayName(client: {
  type: string;
  civilite?: string | null;
  nom: string;
  prenom?: string | null;
  raisonSociale?: string | null;
}) {
  // PA (Particulier) : format "Civilité Prénom Nom" ; tous les autres types : raison sociale ou nom
  return client.type === "PA"
    ? `${client.civilite ? client.civilite + " " : ""}${client.prenom ? client.prenom + " " : ""}${client.nom}`
    : client.raisonSociale || client.nom;
}

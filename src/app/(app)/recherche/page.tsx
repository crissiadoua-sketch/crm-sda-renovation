import Link from "next/link";
import {
  Search,
  Users,
  Building2,
  FileText,
  Receipt,
  ShoppingCart,
  Truck,
  ExternalLink,
  MapPin,
  Star,
  Globe,
  FileSearch,
  Hash,
  UserRound,
  FolderOpen,
  FileBox,
  LayoutGrid,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Types de filtre                                                     */
/* ------------------------------------------------------------------ */

type Filtre = "tout" | "codification" | "nom" | "affaire" | "document" | "service";
type ServiceFil = "clients" | "chantiers" | "ventes" | "achats";

const FILTRES: { value: Filtre; label: string; desc: string }[] = [
  { value: "tout",          label: "Tout le CRM",       desc: "Recherche dans tous les modules" },
  { value: "codification",  label: "Codification",       desc: "Références, numéros, SIRET" },
  { value: "nom",           label: "Nom / Prénom",       desc: "Clients, contacts, sociétés" },
  { value: "affaire",       label: "Nom de l'affaire",   desc: "Chantiers, projets, lots" },
  { value: "document",      label: "Nom du document",    desc: "Devis, factures, bons de commande" },
  { value: "service",       label: "Par services",       desc: "Filtrer par module du CRM" },
];

const SERVICES: { value: ServiceFil; label: string }[] = [
  { value: "clients",   label: "Clients" },
  { value: "chantiers", label: "Chantiers" },
  { value: "ventes",    label: "Ventes (devis, factures)" },
  { value: "achats",    label: "Achats (BC, fournisseurs)" },
];

/* ------------------------------------------------------------------ */
/*  Composant résultat                                                  */
/* ------------------------------------------------------------------ */

function ResultSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { href: string; label: string; sub?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        {icon}
        <h3 className="font-semibold text-brand-navy">{title}</h3>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {items.slice(0, 8).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50"
          >
            <div>
              <span className="font-medium text-slate-700">{item.label}</span>
              {item.sub && (
                <p className="text-xs text-slate-400 truncate max-w-sm">{item.sub}</p>
              )}
            </div>
            <ExternalLink className="h-3 w-3 text-slate-300 shrink-0" />
          </Link>
        ))}
        {items.length > 8 && (
          <p className="px-4 py-2 text-xs text-slate-400">
            {items.length - 8} résultat{items.length - 8 > 1 ? "s" : ""} supplémentaire{items.length - 8 > 1 ? "s" : ""}…
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtre?: string; service?: string }>;
}) {
  const { q: rawQ, filtre: rawFiltre, service: rawService } = await searchParams;
  const q = (rawQ ?? "").trim();

  const filtre: Filtre = (["tout","codification","nom","affaire","document","service"] as string[]).includes(rawFiltre ?? "")
    ? (rawFiltre as Filtre)
    : "tout";

  const service: ServiceFil = (["clients","chantiers","ventes","achats"] as string[]).includes(rawService ?? "")
    ? (rawService as ServiceFil)
    : "clients";

  /* ---- Logique d'inclusion par filtre ---- */
  function include(entity: "clients" | "chantiers" | "devis" | "factures" | "fournisseurs" | "bonCommande"): boolean {
    if (filtre === "tout")         return true;
    if (filtre === "codification") return ["clients","chantiers","devis","factures","bonCommande"].includes(entity);
    if (filtre === "nom")          return ["clients","fournisseurs"].includes(entity);
    if (filtre === "affaire")      return ["chantiers","devis"].includes(entity);
    if (filtre === "document")     return ["devis","factures","bonCommande"].includes(entity);
    if (filtre === "service") {
      if (service === "clients")   return entity === "clients";
      if (service === "chantiers") return entity === "chantiers";
      if (service === "ventes")    return ["devis","factures"].includes(entity);
      if (service === "achats")    return ["fournisseurs","bonCommande"].includes(entity);
    }
    return true;
  }

  /* ---- WHERE clauses par filtre ---- */
  function clientWhere() {
    if (filtre === "codification") return { siret: { contains: q } };
    if (filtre === "nom")          return { OR: [{ nom: { contains: q } }, { prenom: { contains: q } }, { raisonSociale: { contains: q } }] };
    return { OR: [{ nom: { contains: q } }, { prenom: { contains: q } }, { raisonSociale: { contains: q } }, { ville: { contains: q } }, { siret: { contains: q } }, { email: { contains: q } }] };
  }
  function chantierWhere() {
    if (filtre === "codification") return { reference: { contains: q } };
    if (filtre === "affaire")      return { OR: [{ nom: { contains: q } }, { adresse: { contains: q } }, { description: { contains: q } }] };
    return { OR: [{ nom: { contains: q } }, { reference: { contains: q } }, { adresse: { contains: q } }, { description: { contains: q } }] };
  }
  function devisWhere() {
    if (filtre === "codification") return { numero: { contains: q } };
    if (filtre === "affaire")      return { objet: { contains: q } };
    if (filtre === "document")     return { OR: [{ numero: { contains: q } }, { objet: { contains: q } }] };
    return { OR: [{ numero: { contains: q } }, { objet: { contains: q } }] };
  }
  function factureWhere() {
    return { numero: { contains: q } };
  }
  function fournisseurWhere() {
    if (filtre === "nom") return { nom: { contains: q } };
    return { OR: [{ nom: { contains: q } }, { ville: { contains: q } }, { email: { contains: q } }] };
  }
  function bonCommandeWhere() {
    if (filtre === "codification") return { numero: { contains: q } };
    if (filtre === "document")     return { numero: { contains: q } };
    return { OR: [{ numero: { contains: q } }, { fournisseur: { nom: { contains: q } } }] };
  }

  /* ---- Requêtes Prisma conditionnelles ---- */
  let clients:      { id: string; nom: string | null; prenom: string | null; raisonSociale: string | null; type: string; ville: string | null }[] = [];
  let chantiers:    { id: string; nom: string; reference: string; statut: string }[] = [];
  let devis:        { id: string; numero: string; objet: string | null; statut: string }[] = [];
  let factures:     { id: string; numero: string; statut: string }[] = [];
  let fournisseurs: { id: string; nom: string; ville: string | null }[] = [];
  let bonsCommande: { id: string; numero: string; fournisseur: { nom: string }; chantier: { nom: string } | null }[] = [];

  if (q.length >= 2) {
    await Promise.all([
      include("clients")     ? prisma.client.findMany({ where: clientWhere(), select: { id: true, nom: true, prenom: true, raisonSociale: true, type: true, ville: true }, take: 20 }).then(r => { clients = r; })     : null,
      include("chantiers")   ? prisma.chantier.findMany({ where: chantierWhere(), select: { id: true, nom: true, reference: true, statut: true }, take: 20 }).then(r => { chantiers = r; })                            : null,
      include("devis")       ? prisma.devis.findMany({ where: devisWhere(), select: { id: true, numero: true, objet: true, statut: true }, take: 20 }).then(r => { devis = r; })                                        : null,
      include("factures")    ? prisma.facture.findMany({ where: factureWhere(), select: { id: true, numero: true, statut: true }, take: 20 }).then(r => { factures = r; })                                              : null,
      include("fournisseurs")? prisma.fournisseur.findMany({ where: fournisseurWhere(), select: { id: true, nom: true, ville: true }, take: 20 }).then(r => { fournisseurs = r; })                                      : null,
      include("bonCommande") ? prisma.bonCommande.findMany({ where: bonCommandeWhere(), select: { id: true, numero: true, fournisseur: { select: { nom: true } }, chantier: { select: { nom: true } } }, take: 20 }).then(r => { bonsCommande = r; }) : null,
    ]);
  }

  const totalResults = clients.length + chantiers.length + devis.length + factures.length + fournisseurs.length + bonsCommande.length;
  const googleUrl     = q ? `https://www.google.com/search?q=${encodeURIComponent(q + " BTP rénovation")}` : "https://www.google.com";
  const googleMapsUrl = q ? `https://www.google.com/maps/search/${encodeURIComponent(q + " Cugnaux Toulouse")}` : "https://www.google.com/maps";

  /* ---- Helper : URL de filtre ---- */
  function filtreUrl(f: Filtre, s?: ServiceFil) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("filtre", f);
    if (f === "service" && s) params.set("service", s);
    return `?${params.toString()}`;
  }

  const activeFiltre = FILTRES.find(f => f.value === filtre)!;

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div>
        <h2 className="text-xl font-bold text-brand-navy">Recherche</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Recherche dans le CRM · Filtres avancés · Accès rapide à Google & Maps
        </p>
      </div>

      {/* Barre de recherche principale + filtres */}
      <div className="flex flex-col gap-3">
        <form method="GET" className="relative">
          <input type="hidden" name="filtre" value={filtre} />
          {filtre === "service" && <input type="hidden" name="service" value={service} />}
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Rechercher un client, chantier, devis, facture, fournisseur…"
            autoFocus
            spellCheck
            lang="fr"
            className="w-full rounded-xl border-2 border-brand-blue/30 bg-white py-3.5 pl-12 pr-36 text-base shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
          <button
            type="submit"
            className="absolute inset-y-2 right-2 rounded-lg bg-brand-blue px-5 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark"
          >
            Rechercher
          </button>
        </form>

        {/* Chips de filtre */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400 mr-1">Filtrer&nbsp;:</span>
            {FILTRES.map((f) => {
              const active = filtre === f.value;
              return (
                <Link
                  key={f.value}
                  href={filtreUrl(f.value)}
                  title={f.desc}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    active
                      ? "border-brand-blue bg-brand-blue text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                  }`}
                >
                  {f.value === "tout"         && <Search className="h-3 w-3" />}
                  {f.value === "codification" && <Hash className="h-3 w-3" />}
                  {f.value === "nom"          && <UserRound className="h-3 w-3" />}
                  {f.value === "affaire"      && <FolderOpen className="h-3 w-3" />}
                  {f.value === "document"     && <FileBox className="h-3 w-3" />}
                  {f.value === "service"      && <LayoutGrid className="h-3 w-3" />}
                  {f.label}
                </Link>
              );
            })}
          </div>

          {/* Sous-filtre services */}
          {filtre === "service" && (
            <div className="flex flex-wrap items-center gap-1.5 pl-14">
              <span className="text-xs text-slate-400">Module&nbsp;:</span>
              {SERVICES.map((s) => {
                const active = service === s.value;
                return (
                  <Link
                    key={s.value}
                    href={filtreUrl("service", s.value)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                      active
                        ? "border-brand-orange bg-brand-orange text-white"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-brand-orange/40 hover:text-brand-orange"
                    }`}
                  >
                    {s.value === "clients"   && <Users className="h-3 w-3" />}
                    {s.value === "chantiers" && <Building2 className="h-3 w-3" />}
                    {s.value === "ventes"    && <FileText className="h-3 w-3" />}
                    {s.value === "achats"    && <ShoppingCart className="h-3 w-3" />}
                    {s.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Résumé filtre actif */}
          {filtre !== "tout" && (
            <p className="text-xs text-slate-400 pl-1">
              <span className="font-medium text-brand-navy">{activeFiltre.label}</span> — {activeFiltre.desc}
              {filtre === "service" && ` · ${SERVICES.find(s => s.value === service)?.label}`}
              {" · "}
              <Link href={filtreUrl("tout")} className="text-brand-blue hover:underline">
                Supprimer le filtre
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Raccourcis Google */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-brand-blue/30 transition-all group">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 group-hover:bg-brand-blue/10">
            <Globe className="h-5 w-5 text-brand-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-700">Google</p>
            <p className="text-xs text-slate-400 truncate">{q ? `Chercher "${q} BTP rénovation"` : "Ouvrir Google"}</p>
          </div>
          <ExternalLink className="h-4 w-4 text-slate-300 shrink-0" />
        </a>

        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-brand-blue/30 transition-all group">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 group-hover:bg-brand-blue/10">
            <MapPin className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-700">Google Maps</p>
            <p className="text-xs text-slate-400 truncate">{q ? `"${q}" près de Cugnaux` : "Fournisseurs & chantiers"}</p>
          </div>
          <ExternalLink className="h-4 w-4 text-slate-300 shrink-0" />
        </a>

        <a href="https://www.google.com/maps/place/SDA+R%C3%A9novation" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-brand-orange/30 transition-all group">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 group-hover:bg-brand-orange/10">
            <Star className="h-5 w-5 text-brand-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-700">Fiche Google SDA</p>
            <p className="text-xs text-slate-400">Avis clients · Google Business</p>
          </div>
          <ExternalLink className="h-4 w-4 text-slate-300 shrink-0" />
        </a>
      </div>

      {/* Résultats CRM */}
      {q.length >= 2 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <FileSearch className="h-4 w-4 text-brand-blue" />
            <span className="text-sm font-semibold text-brand-navy">
              {totalResults > 0
                ? `${totalResults} résultat${totalResults > 1 ? "s" : ""} pour "${q}"`
                : `Aucun résultat pour "${q}"`}
            </span>
            {filtre !== "tout" && (
              <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue font-medium">
                {activeFiltre.label}{filtre === "service" ? ` · ${SERVICES.find(s => s.value === service)?.label}` : ""}
              </span>
            )}
            {totalResults === 0 && (
              <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 rounded-lg bg-brand-blue/10 px-3 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue/20">
                <Globe className="h-3 w-3" />
                Chercher sur Google
              </a>
            )}
          </div>

          <ResultSection title="Clients" icon={<Users className="h-4 w-4 text-brand-blue" />}
            items={clients.map(c => ({
              href: `/clients/${c.id}`,
              label: c.type === "PA" ? `${c.prenom ? c.prenom + " " : ""}${c.nom ?? ""}` : c.raisonSociale ?? c.nom ?? "",
              sub: c.ville ?? undefined,
            }))}
          />
          <ResultSection title="Chantiers" icon={<Building2 className="h-4 w-4 text-brand-orange" />}
            items={chantiers.map(c => ({ href: `/chantiers/${c.id}`, label: c.nom, sub: `${c.reference} · ${c.statut}` }))}
          />
          <ResultSection title="Devis" icon={<FileText className="h-4 w-4 text-brand-blue" />}
            items={devis.map(d => ({ href: `/devis/${d.id}`, label: d.numero, sub: d.objet ?? d.statut }))}
          />
          <ResultSection title="Factures" icon={<Receipt className="h-4 w-4 text-emerald-600" />}
            items={factures.map(f => ({ href: `/factures/${f.id}`, label: f.numero, sub: f.statut }))}
          />
          <ResultSection title="Fournisseurs" icon={<Truck className="h-4 w-4 text-slate-500" />}
            items={fournisseurs.map(f => ({ href: `/fournisseurs/${f.id}`, label: f.nom, sub: f.ville ?? undefined }))}
          />
          <ResultSection title="Bons de commande" icon={<ShoppingCart className="h-4 w-4 text-brand-orange" />}
            items={bonsCommande.map(b => ({ href: `/bons-commande/${b.id}`, label: b.numero, sub: `${b.fournisseur.nom}${b.chantier ? " · " + b.chantier.nom : ""}` }))}
          />

          {totalResults === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                Aucun résultat dans le CRM pour <strong>{q}</strong>
                {filtre !== "tout" && <> avec le filtre <strong>{activeFiltre.label}</strong></>}.
              </p>
              <div className="mt-3 flex justify-center gap-2 flex-wrap">
                {filtre !== "tout" && (
                  <Link href={filtreUrl("tout")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    <Search className="h-4 w-4" />
                    Rechercher sans filtre
                  </Link>
                )}
                <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark">
                  <Globe className="h-4 w-4" />
                  Rechercher sur Google
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* État vide */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-brand-navy">Exemples de recherche</h3>
            <div className="space-y-2 text-sm text-slate-500">
              {[
                { label: "Nom d'un client (ex. Dupont)",            filtre: "nom" as Filtre },
                { label: "Référence chantier (ex. SDA-2026-001)",   filtre: "codification" as Filtre },
                { label: "Numéro de devis ou facture",              filtre: "codification" as Filtre },
                { label: "Nom d'une affaire ou projet",             filtre: "affaire" as Filtre },
                { label: "Fournisseur ou société",                  filtre: "nom" as Filtre },
              ].map(s => (
                <Link key={s.label} href={filtreUrl(s.filtre)} className="flex items-center gap-2 hover:text-brand-blue">
                  <Search className="h-3 w-3 text-slate-300 shrink-0" />
                  <span>{s.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-brand-navy">Accès rapides</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Clients",         href: "/clients",       icon: <Users className="h-4 w-4" /> },
                { label: "Chantiers",        href: "/chantiers",     icon: <Building2 className="h-4 w-4" /> },
                { label: "Devis",            href: "/devis",         icon: <FileText className="h-4 w-4" /> },
                { label: "Factures",         href: "/factures",      icon: <Receipt className="h-4 w-4" /> },
                { label: "Fournisseurs",     href: "/fournisseurs",  icon: <Truck className="h-4 w-4" /> },
                { label: "Bons de commande", href: "/bons-commande", icon: <ShoppingCart className="h-4 w-4" /> },
              ].map(({ label, href, icon }) => (
                <Link key={href} href={href} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:border-brand-blue/30 hover:bg-brand-blue/5">
                  <span className="text-slate-400">{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Google — suggestions contextuelles */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-brand-navy flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand-blue" />
            Rechercher sur Google
          </h3>
          <a href={q ? googleUrl : "https://www.google.com"} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue hover:underline flex items-center gap-1">
            Ouvrir en plein écran <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          {q && (
            <>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(q + " prix matériaux BTP")}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue">Prix matériaux</a>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(q + " fournisseur Toulouse 31")}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue">Fournisseur Toulouse</a>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(q + " norme DTU réglementation")}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue">Normes & DTU</a>
            </>
          )}
          <a href="https://www.google.com/search?q=prix+matériaux+construction+2026" target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue">Prix matériaux 2026</a>
          <a href="https://www.google.com/search?q=sous-traitants+BTP+Cugnaux+Toulouse" target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue">Sous-traitants Cugnaux</a>
          <a href="https://www.google.com/search?q=réglementation+RT2020+rénovation" target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue">RT2020 rénovation</a>
        </div>
      </div>
    </div>
  );
}

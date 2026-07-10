import {
  LayoutDashboard,
  Users,
  Truck,
  HardHat,
  Building2,
  FileText,
  Receipt,
  ShoppingCart,
  PackageCheck,
  ScrollText,
  ClipboardCheck,
  ClipboardX,
  FolderOpen,
  Calendar,
  Wallet,
  Calculator,
  Megaphone,
  Settings,
  Settings2,
  Banknote,
  UsersRound,
  UserCog,
  BookOpen,
  CheckSquare,
  Package,
  PiggyBank,
  BarChart3,
  Users2,
  Timer,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Files,
  BookCheck,
  LibraryBig,
  BookMarked,
  Heart,
  TrendingDown,
  FileBarChart,
  Search,
  Cloud,
  MessageSquare,
  FileCheck,
  GanttChart,
  Ruler,
  Landmark,
  CalendarClock,
  TrendingUp,
  AlertCircle,
  Clock,
  LayoutDashboard as LayoutDash2,
  type LucideIcon,
} from "lucide-react";
import { canAccess } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Général",
    items: [
      { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/recherche", label: "Recherche & Google", icon: Search },
      { href: "/meteo", label: "Journal Météo BTP", icon: Cloud },
      { href: "/messagerie", label: "Messagerie", icon: MessageSquare },
    ],
  },
  {
    label: "Annuaire",
    items: [
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/fournisseurs", label: "Fournisseurs", icon: Truck },
      { href: "/sous-traitants", label: "Sous-traitants", icon: HardHat },
    ],
  },
  {
    label: "Chantiers",
    items: [
      { href: "/chantiers", label: "Chantiers", icon: Building2 },
      { href: "/planning", label: "Planning", icon: Calendar },
      { href: "/planning-gantt", label: "Planning Gantt", icon: GanttChart },
    ],
  },
  {
    label: "Ventes",
    items: [
      { href: "/devis", label: "Devis", icon: FileText },
      { href: "/ouvrages", label: "Bibliothèque ouvrages", icon: BookOpen },
      { href: "/main-oeuvre", label: "Taux main d'œuvre", icon: Users2 },
      { href: "/temps-unitaires", label: "Temps unitaires", icon: Timer },
      { href: "/interimaires", label: "Intérimaires", icon: UserCheck },
      { href: "/factures", label: "Factures", icon: Receipt },
      { href: "/etats-reserves", label: "États des réserves", icon: ClipboardX },
      { href: "/contrats-sous-traitance", label: "Contrats de sous-traitance", icon: ScrollText },
      { href: "/ordres-mission", label: "Ordres de mission", icon: ClipboardCheck },
      { href: "/pv-reception", label: "PV de Réception", icon: ClipboardCheck },
    ],
  },
  {
    label: "Exploitation / Production",
    items: [
      { href: "/exploitation/fiches-intervention", label: "Fiches d'intervention", icon: ClipboardCheck },
      { href: "/exploitation/rapports-hebdo",      label: "Rapports hebdomadaires", icon: BarChart3 },
      { href: "/exploitation/non-conformites",      label: "Non-conformités qualité", icon: ShieldAlert },
      { href: "/exploitation/pv-reunion",           label: "PV de réunion chantier", icon: FileText },
      { href: "/exploitation/bons-travaux",         label: "Bons de travaux équipes", icon: ClipboardCheck },
      { href: "/exploitation/demandes-appro",       label: "Demandes d'approvisionnement", icon: ShoppingCart },
      { href: "/exploitation/frais-chantier",       label: "Frais de chantier", icon: Wallet },
    ],
  },
  {
    label: "Qualité Chantier",
    items: [
      { href: "/qualite/paq",          label: "Plans d'Assurance Qualité", icon: ShieldCheck },
      { href: "/qualite/autocontrole", label: "Fiches d'autocontrôle",      icon: ClipboardCheck },
      { href: "/qualite/daact",        label: "DAACT",                       icon: FileCheck },
    ],
  },
  {
    label: "Étude de Prix & Méthode",
    items: [
      { href: "/etude-prix/debourses-secs",    label: "Déboursés secs (DS)", icon: Calculator },
      { href: "/ouvrages",                      label: "Sous-détails de prix (SDP)", icon: BookOpen },
      { href: "/etude-prix/cout-materiaux",     label: "Coût matériaux rendus chantier", icon: TrendingDown },
      { href: "/etude-prix/approvisionement",   label: "Approvisionnement chantier", icon: PackageCheck },
      { href: "/etude-prix/agrement-produits",  label: "Fiches d'agrément produit", icon: ShieldCheck },
      { href: "/etude-prix/pre-dimensionnement", label: "Pré-dimensionnement structurel", icon: Ruler },
    ],
  },
  {
    label: "Achats",
    items: [
      { href: "/bons-commande", label: "Bons de commande", icon: ShoppingCart },
      { href: "/bons-commande/beton", label: "BC Béton (NF EN 206)", icon: Package },
      { href: "/bons-commande/pompe", label: "Réservations Pompe", icon: Package },
      { href: "/bons-commande/fournitures", label: "BC Fournitures Bureau/Entrepôt", icon: Package },
      { href: "/bons-livraison", label: "Bons de livraison", icon: PackageCheck },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/taches", label: "Tâches internes", icon: CheckSquare },
      { href: "/stock", label: "Gestion de stock", icon: Package },
      { href: "/rh", label: "Ressources humaines", icon: UsersRound },
      { href: "/mutuelle", label: "Mutuelle d'entreprise", icon: Heart },
      { href: "/notes-de-frais", label: "Notes de frais", icon: Banknote },
      { href: "/documents", label: "Documents", icon: FolderOpen },
      { href: "/prospects", label: "Prospects", icon: Megaphone },
    ],
  },
  {
    label: "Finance & Comptabilité",
    items: [
      { href: "/finances/dashboard", label: "Tableau de bord Finance", icon: LayoutDash2 },
      { href: "/finances/rentabilite", label: "Rentabilité société", icon: BarChart3 },
      { href: "/finances/charges", label: "Budget des charges", icon: Settings2 },
      { href: "/finances/tva", label: "Suivi TVA / CA3", icon: Receipt },
      { href: "/finances/impayes", label: "Impayés & Relances", icon: AlertCircle },
      { href: "/finances/retenues-garantie", label: "Retenues de garantie", icon: ShieldCheck },
      { href: "/finances/tresorerie-hebdo", label: "Trésorerie 13 semaines", icon: Clock },
      { href: "/marge-rentabilite", label: "Marge & Rentabilité chantiers", icon: TrendingUp },
      { href: "/depenses", label: "Dépenses", icon: TrendingDown },
      { href: "/previsionnel", label: "Prévisionnel des flux", icon: CalendarClock },
      { href: "/tresorerie", label: "Trésorerie & P&L", icon: PiggyBank },
      { href: "/finances", label: "Tableau des achats", icon: Wallet },
      { href: "/finances/rapport-mensuel", label: "Rapport mensuel Dirigeant", icon: FileBarChart },
      { href: "/analytique", label: "Analytique & Graphiques", icon: BarChart3 },
      { href: "/comptabilite", label: "Comptabilité", icon: Calculator },
      { href: "/comptabilite/bilan", label: "Bilan", icon: Landmark },
      { href: "/comptabilite/fec", label: "Export FEC", icon: FileCheck },
      { href: "/comptabilite/rapprochement", label: "Rapprochement bancaire", icon: FileCheck },
    ],
  },
  {
    label: "Documents techniques",
    items: [
      { href: "/memoires-techniques", label: "Mémoires techniques", icon: BookMarked },
      { href: "/doe", label: "DOE", icon: BookCheck },
      { href: "/ppsps", label: "PPSPS", icon: ShieldAlert },
      { href: "/fiches-techniques", label: "Fiches techniques", icon: Files },
      { href: "/dtu", label: "Bibliothèque DTU", icon: LibraryBig },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/parametres", label: "Paramètres", icon: Settings },
      { href: "/parametres/codifications", label: "Codifications", icon: Settings2 },
      { href: "/utilisateurs", label: "Utilisateurs", icon: UserCog },
      { href: "/maintenance", label: "Maintenance & Qualité", icon: ShieldCheck },
      { href: "/securite", label: "Sécurité — Alba-ayla IA", icon: ShieldAlert },
    ],
  },
];

export function filterNavGroups(
  role: string,
  permissions: string[],
): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccess(role, permissions, item.href)),
    }))
    .filter((group) => group.items.length > 0);
}

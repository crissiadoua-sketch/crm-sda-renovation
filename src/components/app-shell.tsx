"use client";

import { useRef, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ImageIcon, Loader2, LayoutDashboard, Search, Cloud, MessageSquare } from "lucide-react";
import { Logo } from "@/components/logo";
import { filterNavGroups, type NavGroup } from "@/lib/nav";
import { logout } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { GlobalSearch } from "@/components/global-search";

type CurrentUser = {
  name: string;
  email: string;
  role: string;
};

const WALLPAPER_PAGES = [
  { key: "all", label: "Toutes les pages", Icon: ImageIcon },
  { key: "/", label: "Tableau de bord", Icon: LayoutDashboard },
  { key: "/recherche", label: "Recherche & Google", Icon: Search },
  { key: "/meteo", label: "Journal Météo BTP", Icon: Cloud },
  { key: "/messagerie", label: "Messagerie", Icon: MessageSquare },
];

function WallpaperPanel({
  wallpapers,
  selectedPage,
  uploading,
  onSelectPage,
  onChoose,
  onRemove,
  onClose,
}: {
  wallpapers: Record<string, string>;
  selectedPage: string;
  uploading: boolean;
  onSelectPage: (page: string) => void;
  onChoose: () => void;
  onRemove: (page: string) => void;
  onClose: () => void;
}) {
  const defined = WALLPAPER_PAGES.filter((p) => wallpapers[p.key]);

  return (
    <div className="absolute bottom-full left-0 right-0 mx-2 mb-1 z-20 rounded-xl border border-white/10 bg-[#0d1a3e] p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-white/80">Fond d'écran</span>
        <button onClick={onClose} className="text-white/40 hover:text-white text-xs leading-none">✕</button>
      </div>

      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Appliquer à</p>
      <div className="mb-3 flex flex-col gap-0.5">
        {WALLPAPER_PAGES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectPage(key)}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
              selectedPage === key
                ? "bg-brand-orange/20 text-brand-orange"
                : "text-white/55 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {wallpapers[key] && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={uploading}
        onClick={onChoose}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-orange-dark disabled:opacity-50"
      >
        {uploading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement…</>
        ) : (
          <><ImageIcon className="h-3.5 w-3.5" /> Choisir une image</>
        )}
      </button>

      {defined.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Fonds définis</p>
          {defined.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-0.5">
              <span className="truncate text-[11px] text-white/50">{label}</span>
              <button
                type="button"
                onClick={() => onRemove(key)}
                className="ml-2 shrink-0 text-[11px] text-white/30 transition hover:text-red-400"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WallpaperControls({
  wallpapers,
  selectedPage,
  uploading,
  panelOpen,
  onToggle,
  onSelectPage,
  onChoose,
  onRemove,
}: {
  wallpapers: Record<string, string>;
  selectedPage: string;
  uploading: boolean;
  panelOpen: boolean;
  onToggle: () => void;
  onSelectPage: (page: string) => void;
  onChoose: () => void;
  onRemove: (page: string) => void;
}) {
  return (
    <div className="relative">
      {panelOpen && (
        <WallpaperPanel
          wallpapers={wallpapers}
          selectedPage={selectedPage}
          uploading={uploading}
          onSelectPage={onSelectPage}
          onChoose={onChoose}
          onRemove={onRemove}
          onClose={onToggle}
        />
      )}
      <div className="border-t border-white/10 px-4 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white/70"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Fond d'écran</span>
          {Object.keys(wallpapers).length > 0 && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  pathname,
  navGroups,
  onNavigate,
  smtpConfigured,
  messagesNonLus,
}: {
  pathname: string;
  navGroups: NavGroup[];
  onNavigate?: () => void;
  smtpConfigured?: boolean;
  messagesNonLus?: number;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-white/40">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              const showSmtpAlert = item.href === "/messagerie" && smtpConfigured === false;
              const showUnread = item.href === "/messagerie" && !!messagesNonLus && messagesNonLus > 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-4.5 w-4.5 shrink-0 ${active ? "text-brand-orange" : ""}`}
                    />
                    <span className="truncate flex-1">{item.label}</span>
                    {showUnread && (
                      <span className="relative flex shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-60" />
                        <span className="relative inline-flex items-center justify-center rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold leading-none text-white min-w-[18px]">
                          {messagesNonLus! > 99 ? "99+" : messagesNonLus}
                        </span>
                      </span>
                    )}
                    {!showUnread && showSmtpAlert && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ user }: { user: CurrentUser }) {
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  return (
    <div className="border-t border-white/10 p-4">
      <p className="truncate px-3 text-sm font-medium text-white">{user.name}</p>
      <p className="truncate px-3 text-xs text-white/50">{roleLabel}</p>
      <form action={logout}>
        <button
          type="submit"
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </form>
    </div>
  );
}

export function AppShell({
  user,
  userRole,
  userPermissions,
  children,
  banner,
  smtpConfigured,
  messagesNonLus,
  wallpapers: wallpapersProp,
}: {
  user: CurrentUser;
  userRole: string;
  userPermissions: string[];
  children: React.ReactNode;
  banner?: React.ReactNode;
  smtpConfigured?: boolean;
  messagesNonLus?: number;
  wallpapers?: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wallpapersJson, setWallpapersJson] = useState<string>(wallpapersProp ?? "{}");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState("all");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wallpapersObj = useMemo<Record<string, string>>(() => {
    try { return JSON.parse(wallpapersJson); } catch { return {}; }
  }, [wallpapersJson]);

  // Détermine le fond actif pour la page courante
  const pageKey =
    pathname === "/" ? "/" :
    ["/recherche", "/meteo", "/messagerie"].find((p) => pathname.startsWith(p)) ?? "";
  const activeBg = wallpapersObj[pageKey] || wallpapersObj["all"] || null;

  async function handleWallpaperUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Image trop volumineuse (max 8 Mo)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", selectedPage);
      const res = await fetch("/api/user/background", { method: "POST", body: fd });
      const data = await res.json();
      if (data.wallpapers) setWallpapersJson(JSON.stringify(data.wallpapers));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleWallpaperRemove(page: string) {
    setUploading(true);
    try {
      const res = await fetch(`/api/user/background?page=${encodeURIComponent(page)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.wallpapers !== undefined) setWallpapersJson(JSON.stringify(data.wallpapers));
    } finally {
      setUploading(false);
    }
  }

  const navGroups = filterNavGroups(userRole, userPermissions);

  const currentLabel =
    navGroups.flatMap((g) => g.items).find((item) => isActive(pathname, item.href))?.label ??
    "Tableau de bord";

  const wallpaperControlsProps = {
    wallpapers: wallpapersObj,
    selectedPage,
    uploading,
    panelOpen,
    onToggle: () => setPanelOpen((v) => !v),
    onSelectPage: setSelectedPage,
    onChoose: () => fileInputRef.current?.click(),
    onRemove: handleWallpaperRemove,
  };

  return (
    <div className="flex min-h-screen">
      {/* Input fichier unique — ref stable */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleWallpaperUpload}
      />

      {/* Sidebar — desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col bg-gradient-to-b from-brand-blue to-brand-navy print:hidden">
        <div className="flex items-center px-6 py-6">
          <Link href="/">
            <Logo variant="light" size="md" />
          </Link>
        </div>
        <SidebarNav pathname={pathname} navGroups={navGroups} smtpConfigured={smtpConfigured} messagesNonLus={messagesNonLus} />
        <UserFooter user={user} />
        <WallpaperControls {...wallpaperControlsProps} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-gradient-to-b from-brand-blue to-brand-navy">
            <div className="flex items-center justify-between px-6 py-6">
              <Link href="/">
                <Logo variant="light" size="md" />
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav
              pathname={pathname}
              navGroups={navGroups}
              onNavigate={() => setMobileOpen(false)}
              smtpConfigured={smtpConfigured}
              messagesNonLus={messagesNonLus}
            />
            <UserFooter user={user} />
            <WallpaperControls {...wallpaperControlsProps} />
          </aside>
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-72 print:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 print:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="text-slate-500 hover:text-brand-navy lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="hidden text-base font-semibold text-brand-navy sm:block sm:text-lg shrink-0">{currentLabel}</h1>
          <div className="flex flex-1 items-center gap-4">
            <GlobalSearch />
          </div>
        </header>
        {banner}
        <main
          id="main-content"
          className={`min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 print:bg-white print:p-0 ${activeBg ? "" : "bg-slate-50"}`}
          style={activeBg ? {
            backgroundImage: `url(${activeBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "local",
          } : undefined}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
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

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  pathname,
  navGroups,
  onNavigate,
}: {
  pathname: string;
  navGroups: NavGroup[];
  onNavigate?: () => void;
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
                    <span className="truncate">{item.label}</span>
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
}: {
  user: CurrentUser;
  userRole: string;
  userPermissions: string[];
  children: React.ReactNode;
  banner?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups = filterNavGroups(userRole, userPermissions);

  const currentLabel =
    navGroups.flatMap((g) => g.items).find((item) => isActive(pathname, item.href))?.label ??
    "Tableau de bord";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col bg-gradient-to-b from-brand-blue to-brand-navy">
        <div className="flex items-center px-6 py-6">
          <Logo variant="light" size="md" />
        </div>
        <SidebarNav pathname={pathname} navGroups={navGroups} />
        <UserFooter user={user} />
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
              <Logo variant="light" size="md" />
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
            />
            <UserFooter user={user} />
          </aside>
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
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
        <main className="min-w-0 flex-1 overflow-x-hidden bg-slate-50 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

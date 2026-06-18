import { getUser } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { filterNavGroups } from "@/lib/nav";
import { AlbaAylaChat } from "@/components/alba-ayla/chat";
import { PasswordAlertBanner } from "@/components/password-alert-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const navGroups = filterNavGroups(user.role, user.permissions);

  return (
    <AppShell
      user={user}
      navGroups={navGroups}
      banner={
        <PasswordAlertBanner
          passwordChangedAt={user.passwordChangedAt}
          createdAt={user.createdAt}
        />
      }
    >
      {children}
      <AlbaAylaChat />
    </AppShell>
  );
}

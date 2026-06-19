import { getUser } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { AlbaAylaChat } from "@/components/alba-ayla/chat";
import { PasswordAlertBanner } from "@/components/password-alert-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <AppShell
      user={user}
      userRole={user.role}
      userPermissions={user.permissions}
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

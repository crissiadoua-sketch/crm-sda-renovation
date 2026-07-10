export const dynamic = "force-dynamic";

import { getUser } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { AlbaAylaChat } from "@/components/alba-ayla/chat";
import { PasswordAlertBanner } from "@/components/password-alert-banner";
import { emailConfigure } from "@/lib/email";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, smtpConfigured] = await Promise.all([getUser(), Promise.resolve(emailConfigure())]);

  return (
    <AppShell
      user={user}
      userRole={user.role}
      userPermissions={user.permissions}
      smtpConfigured={smtpConfigured}
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

export const dynamic = "force-dynamic";

import { getUser } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { AlbaAylaChat } from "@/components/alba-ayla/chat";
import { PasswordAlertBanner } from "@/components/password-alert-banner";
import { emailConfigure } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, smtpConfigured] = await Promise.all([getUser(), Promise.resolve(emailConfigure())]);

  // Compter les conversations avec des messages non lus (envoyés par autrui après luAt)
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: user.id },
    select: {
      luAt: true,
      conversation: {
        select: {
          messages: {
            where: { senderId: { not: user.id } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
  });
  const messagesNonLus = participations.filter((p) => {
    const last = p.conversation.messages[0];
    if (!last) return false;
    return !p.luAt || last.createdAt > p.luAt;
  }).length;

  return (
    <AppShell
      user={user}
      userRole={user.role}
      userPermissions={user.permissions}
      smtpConfigured={smtpConfigured}
      messagesNonLus={messagesNonLus}
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

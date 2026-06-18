import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/session";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);

  if (session?.userId) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-navy px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="items-center" />
          <p className="mt-4 text-sm text-slate-500">
            Connectez-vous à votre espace de gestion
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}

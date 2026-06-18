import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-brand-orange to-brand-orange-dark text-white hover:opacity-90 shadow-sm",
  secondary: "border border-slate-300 text-slate-700 bg-white hover:bg-slate-50",
  danger: "border border-red-200 text-red-600 bg-white hover:bg-red-50",
  ghost: "text-brand-blue hover:bg-brand-blue/10",
};

export const buttonBaseClasses =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export function buttonClasses(variant: ButtonVariant = "primary", className = "") {
  return `${buttonBaseClasses} ${variantClasses[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  );
}
